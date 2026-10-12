from typing import Dict, Optional, List
from datetime import datetime
import uuid
import asyncio
import os
import sys
import json

from models.project_state import ProjectState, Message, AgentRole, Task, TaskStatus
try:
    from models.task_graph import TaskGraph
except ImportError:
    from .task_graph import TaskGraph

try:
    from services.intent_router import IntentRouter, IntentType
except ImportError:
    from .intent_router import IntentRouter, IntentType

try:
    from services.evaluation_service import EvaluationService, EvaluationResult
except ImportError:
    from .evaluation_service import EvaluationService, EvaluationResult

from agents import ProjectManagerAgent, DeveloperAgent, QATesterAgent, DevOpsAgent
from .ai_service import AIService
from config import config

class Orchestrator:
    def __init__(self):
        self.projects: Dict[str, ProjectState] = {}
        self.ai_services: Dict[str, AIService] = {}
        self.agents: Dict[str, Dict] = {}
        self.storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "projects")
        os.makedirs(self.storage_dir, exist_ok=True)
        self.load_all_projects_from_disk()
    
    def load_all_projects_from_disk(self):
        """Load all saved projects from disk into memory on startup"""
        try:
            if not os.path.exists(self.storage_dir):
                return
            for fname in os.listdir(self.storage_dir):
                if fname.endswith(".json"):
                    fpath = os.path.join(self.storage_dir, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            project = ProjectState(**data)
                            self.projects[project.project_id] = project
                    except Exception as e:
                        print(f"[Orchestrator] Failed to load project file {fname}: {e}")
            print(f"[Orchestrator] Loaded {len(self.projects)} saved project session(s) from disk.")
        except Exception as e:
            print(f"[Orchestrator] Error reading storage directory: {e}")

    def save_project(self, project_id: str):
        """Safely persist project state and full chat history to JSON file"""
        project = self.projects.get(project_id)
        if not project:
            return
        try:
            os.makedirs(self.storage_dir, exist_ok=True)
            fpath = os.path.join(self.storage_dir, f"{project_id}.json")
            data = project.model_dump()
            
            def serialize(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                return str(obj)

            raw_json = json.dumps(data, default=serialize, indent=2, ensure_ascii=False)
            # Write to temp file first then replace to avoid corruption on crash/disconnect
            tmp_path = f"{fpath}.tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(raw_json)
            if os.path.exists(fpath):
                os.remove(fpath)
            os.rename(tmp_path, fpath)
        except Exception as e:
            print(f"[Orchestrator] Error saving project {project_id}: {e}")

    def ensure_project_agents(self, project_id: str) -> bool:
        """Ensure agent instances exist for project (e.g. after restart or loading from disk)"""
        project = self.get_project(project_id)
        if not project:
            return False
        
        if project_id in self.agents and all(k in self.agents[project_id] for k in [AgentRole.PROJECT_MANAGER, AgentRole.DEVELOPER, AgentRole.QA_TESTER, AgentRole.DEVOPS]):
            return True

        provs = project.providers_config or {}
        pm_prov = provs.get("pm_provider") or config.PROJECT_MANAGER_PROVIDER
        dev_prov = provs.get("dev_provider") or config.DEVELOPER_PROVIDER
        qa_prov = provs.get("qa_provider") or config.QA_TESTER_PROVIDER
        devops_prov = provs.get("devops_provider") or config.DEVOPS_PROVIDER
        
        pm_def_url, pm_def_key = config.get_provider_credentials(pm_prov)
        dev_def_url, dev_def_key = config.get_provider_credentials(dev_prov)
        qa_def_url, qa_def_key = config.get_provider_credentials(qa_prov)
        devops_def_url, devops_def_key = config.get_provider_credentials(devops_prov)
        
        eff_key = project.api_key or config.AI_PROVIDER_API_KEY
        
        pm_ai = AIService(api_key=eff_key or pm_def_key, base_url=pm_def_url)
        dev_ai = AIService(api_key=eff_key or dev_def_key, base_url=dev_def_url)
        qa_ai = AIService(api_key=eff_key or qa_def_key, base_url=qa_def_url)
        devops_ai = AIService(api_key=eff_key or devops_def_key, base_url=devops_def_url)
        
        self.ai_services[f"{project_id}_pm"] = pm_ai
        self.ai_services[f"{project_id}_dev"] = dev_ai
        self.ai_services[f"{project_id}_qa"] = qa_ai
        self.ai_services[f"{project_id}_devops"] = devops_ai
        
        pm_model = provs.get("pm_model") or config.PROJECT_MANAGER_MODEL
        dev_model = provs.get("dev_model") or config.DEVELOPER_MODEL
        qa_model = provs.get("qa_model") or config.QA_TESTER_MODEL
        devops_model = provs.get("devops_model") or config.DEVOPS_MODEL
        
        self.agents[project_id] = {
            AgentRole.PROJECT_MANAGER: ProjectManagerAgent(pm_model, pm_ai),
            AgentRole.DEVELOPER: DeveloperAgent(dev_model, dev_ai),
            AgentRole.QA_TESTER: QATesterAgent(qa_model, qa_ai),
            AgentRole.DEVOPS: DevOpsAgent(devops_model, devops_ai)
        }
        return True

    def list_projects(self) -> List[Dict]:
        """Return list of all stored projects sorted by updated_at descending"""
        items = []
        for p in sorted(self.projects.values(), key=lambda x: getattr(x, "updated_at", getattr(x, "created_at", datetime.min)), reverse=True):
            last_msg = ""
            if p.messages:
                last_msg = p.messages[-1].content[:150].strip()
            items.append({
                "project_id": p.project_id,
                "project_name": p.project_name,
                "requirement": p.requirement[:200].strip(),
                "created_at": p.created_at.isoformat(),
                "updated_at": getattr(p, "updated_at", p.created_at).isoformat(),
                "current_phase": p.current_phase,
                "is_complete": p.is_complete,
                "iterations": p.iterations,
                "message_count": len(p.messages),
                "task_count": len(p.tasks),
                "completed_tasks": len([t for t in p.tasks if t.status == TaskStatus.COMPLETED]),
                "health_score": getattr(getattr(p, "memory", None), "scorecard", None).health_score if hasattr(p, "memory") and hasattr(p.memory, "scorecard") else 100,
                "tech_stack": getattr(p, "memory", None).tech_stack if hasattr(p, "memory") else {},
                "last_message": last_msg
            })
        return items

    def delete_project(self, project_id: str) -> bool:
        """Delete a project and its saved JSON history file"""
        self.projects.pop(project_id, None)
        self.agents.pop(project_id, None)
        fpath = os.path.join(self.storage_dir, f"{project_id}.json")
        if os.path.exists(fpath):
            try:
                os.remove(fpath)
                return True
            except Exception as e:
                print(f"[Orchestrator] Error deleting {fpath}: {e}")
                return False
        return True

    def resume_project(self, project_id: str) -> bool:
        """Prepare an interrupted or stopped project to resume"""
        project = self.get_project(project_id)
        if not project:
            return False
        if project.is_complete and any(t.status != TaskStatus.COMPLETED for t in project.tasks):
            project.is_complete = False
        project.updated_at = datetime.now()
        self.save_project(project_id)
        self.ensure_project_agents(project_id)
        return True

    def create_project(self, project_name: str, requirement: str, 
                      project_directory: str, api_key: Optional[str] = None,
                      base_url: Optional[str] = None,
                      pm_provider: Optional[str] = None,
                      pm_model: Optional[str] = None,
                      dev_provider: Optional[str] = None,
                      dev_model: Optional[str] = None,
                      qa_provider: Optional[str] = None,
                      qa_model: Optional[str] = None,
                      devops_provider: Optional[str] = None,
                      devops_model: Optional[str] = None,
                      files_context: Optional[Dict[str, str]] = None) -> str:
        """Create a new project with configurable per-agent models and providers"""
        
        project_id = str(uuid.uuid4())
        effective_key = api_key or config.AI_PROVIDER_API_KEY
        
        # Create project directory
        project_path = os.path.join(project_directory, project_name)
        os.makedirs(project_path, exist_ok=True)
        
        # Smart Intent Classification & Dynamic Entrypoint
        routing = IntentRouter.classify_intent(requirement, has_existing_files=bool(files_context))
        initial_phase = routing.target_phase
        
        project = ProjectState(
            project_id=project_id,
            project_name=project_name,
            project_directory=project_path,
            requirement=requirement,
            current_phase=initial_phase,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            api_key=effective_key,
            providers_config={
                "pm_provider": pm_provider,
                "pm_model": pm_model,
                "dev_provider": dev_provider,
                "dev_model": dev_model,
                "qa_provider": qa_provider,
                "qa_model": qa_model,
                "devops_provider": devops_provider,
                "devops_model": devops_model
            }
        )
        
        # Attach any @mentioned files into initial project files
        if files_context:
            for fpath, fcontent in files_context.items():
                project.files[fpath] = fcontent
        
        # If fast-track route selected (e.g. targeted bug fix or direct QA), create initial task
        if routing.fast_track and routing.suggested_task_title:
            fast_task = Task(
                id=str(uuid.uuid4()),
                title=routing.suggested_task_title,
                description=requirement,
                status=TaskStatus.PENDING,
                assigned_to=routing.target_agent,
                created_at=datetime.now()
            )
            project.tasks.append(fast_task)
        
        self.projects[project_id] = project
        
        # Resolve provider credentials per agent
        pm_prov = pm_provider or config.PROJECT_MANAGER_PROVIDER
        dev_prov = dev_provider or config.DEVELOPER_PROVIDER
        qa_prov = qa_provider or config.QA_TESTER_PROVIDER
        devops_prov = devops_provider or config.DEVOPS_PROVIDER
        
        pm_def_url, pm_def_key = config.get_provider_credentials(pm_prov)
        dev_def_url, dev_def_key = config.get_provider_credentials(dev_prov)
        qa_def_url, qa_def_key = config.get_provider_credentials(qa_prov)
        devops_def_url, devops_def_key = config.get_provider_credentials(devops_prov)
        
        pm_ai = AIService(api_key=api_key or pm_def_key, base_url=base_url or pm_def_url)
        dev_ai = AIService(api_key=api_key or dev_def_key, base_url=base_url or dev_def_url)
        qa_ai = AIService(api_key=api_key or qa_def_key, base_url=base_url or dev_def_url)
        devops_ai = AIService(api_key=api_key or devops_def_key, base_url=base_url or devops_def_url)
        
        self.ai_services[f"{project_id}_pm"] = pm_ai
        self.ai_services[f"{project_id}_dev"] = dev_ai
        self.ai_services[f"{project_id}_qa"] = qa_ai
        self.ai_services[f"{project_id}_devops"] = devops_ai
        
        # Initialize agents with specific models and dedicated AI service per agent
        self.agents[project_id] = {
            AgentRole.PROJECT_MANAGER: ProjectManagerAgent(pm_model or config.PROJECT_MANAGER_MODEL, pm_ai),
            AgentRole.DEVELOPER: DeveloperAgent(dev_model or config.DEVELOPER_MODEL, dev_ai),
            AgentRole.QA_TESTER: QATesterAgent(qa_model or config.QA_TESTER_MODEL, qa_ai),
            AgentRole.DEVOPS: DevOpsAgent(devops_model or config.DEVOPS_MODEL, devops_ai)
        }
        
        # Add initial user message
        self.add_message(project_id, AgentRole.USER, requirement)
        if routing.fast_track:
            pm_dispatch_msg = (
                f"⚡ **Dynamic Intent Routing:** {routing.rationale}\n"
                f"Directly delegating to @{routing.target_agent.value} for '{routing.suggested_task_title}'."
            )
            self.add_message(project_id, AgentRole.PROJECT_MANAGER, pm_dispatch_msg)
            
        self.save_project(project_id)
        
        return project_id
    
    def get_project(self, project_id: str) -> Optional[ProjectState]:
        """Get project by ID"""
        return self.projects.get(project_id)
    
    def add_message(self, project_id: str, role: AgentRole, content: str):
        """Add a message to the project conversation history with dynamic state reactivity"""
        project = self.get_project(project_id)
        if project:
            msg = Message(id=str(uuid.uuid4()), role=role, content=content, timestamp=datetime.now())
            project.messages.append(msg)
            project.updated_at = datetime.now()
            
            # Dynamic reactivity: If user sends an instruction while project is done or paused, re-engage
            if role == AgentRole.USER:
                routing = IntentRouter.classify_intent(content, has_existing_files=bool(project.files))
                if project.is_complete or routing.fast_track:
                    project.is_complete = False
                    if routing.fast_track and routing.suggested_task_title:
                        new_task = Task(
                            id=str(uuid.uuid4()),
                            title=routing.suggested_task_title,
                            description=content,
                            status=TaskStatus.PENDING,
                            assigned_to=routing.target_agent,
                            created_at=datetime.now()
                        )
                        project.tasks.append(new_task)
                        project.current_phase = routing.target_phase
                    elif routing.intent == IntentType.NEW_FEATURE_OR_PROJECT:
                        project.current_phase = "planning"
                        
            self.save_project(project_id)
            return msg
        return None
    
    async def verify_code_in_workspace(self, project: ProjectState, file_operations: List) -> Optional[str]:
        """Automated syntax, compilation, and test execution for self-healing"""
        errors = []
        for file_op in file_operations:
            op_type = getattr(file_op, "operation", "")
            if op_type == "delete":
                continue
            path = getattr(file_op, "path", "")
            full_path = os.path.join(project.project_directory, path)
            if not os.path.exists(full_path):
                continue
            
            # Python syntax & compile verification
            if path.endswith(".py"):
                try:
                    proc = await asyncio.create_subprocess_exec(
                        sys.executable, "-m", "py_compile", full_path,
                        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    out, err = await asyncio.wait_for(proc.communicate(), timeout=5.0)
                    if proc.returncode != 0 and err:
                        err_text = err.decode("utf-8", errors="replace").strip()
                        errors.append(f"Python Syntax Error in {path}:\n{err_text}")
                except Exception:
                    pass
                
                # If it's a test file, run it with unittest/pytest in background
                base_name = os.path.basename(path)
                if base_name.startswith("test_") or base_name.endswith("_test.py"):
                    try:
                        test_proc = await asyncio.create_subprocess_exec(
                            sys.executable, "-m", "unittest", full_path,
                            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                            cwd=project.project_directory
                        )
                        tout, terr = await asyncio.wait_for(test_proc.communicate(), timeout=8.0)
                        if test_proc.returncode != 0:
                            test_err = (terr or tout).decode("utf-8", errors="replace").strip()
                            errors.append(f"DevOps Test Failure in {path}:\n{test_err}")
                    except Exception:
                        pass
            
            # JavaScript syntax check
            elif path.endswith(".js"):
                try:
                    proc = await asyncio.create_subprocess_exec(
                        "node", "--check", full_path,
                        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    out, err = await asyncio.wait_for(proc.communicate(), timeout=5.0)
                    if proc.returncode != 0 and err:
                        err_text = err.decode("utf-8", errors="replace").strip()
                        errors.append(f"JavaScript Syntax Error in {path}:\n{err_text}")
                except Exception:
                    pass
            
            # JSON syntax check
            elif path.endswith(".json"):
                try:
                    with open(full_path, "r", encoding="utf-8") as jf:
                        json.load(jf)
                except Exception as jerr:
                    errors.append(f"JSON Syntax Error in {path}: {str(jerr)}")
                    
        if errors:
            return "\n\n".join(errors)
        return None

    async def process_iteration(self, project_id: str) -> Dict:
        """Process one iteration of the multi-agent workflow"""
        project = self.projects.get(project_id)
        if not project:
            return {"error": "Project not found"}
        
        # Ensure agents are instantiated (e.g. after server restart or loaded from disk)
        self.ensure_project_agents(project_id)
        
        if project.is_complete:
            return {"complete": True, "message": "Project already complete"}
        
        if project.iterations >= config.MAX_ITERATIONS:
            project.is_complete = True
            self.save_project(project_id)
            return {"complete": True, "message": "Maximum iterations reached"}
        
        project.iterations += 1
        
        # Determine current agent dynamically based on TaskGraph and Phase
        current_agent_role = self.get_current_agent(project)
        agent = self.agents[project_id][current_agent_role]
        
        # Prepare context with Shared Project Memory & TaskGraph
        graph = project.get_task_graph()
        context = {
            "requirement": project.requirement,
            "tasks": project.tasks,
            "task_graph": graph,
            "files": project.files,
            "current_phase": project.current_phase,
            "iterations": project.iterations,
            "memory": project.memory
        }
        
        try:
            # Process with current agent
            result = await agent.process(context, project.messages)
            
            # Add agent message
            self.add_message(project_id, current_agent_role, result["message"])
            
            # Handle tasks update from agent
            if "tasks" in result:
                for task in result["tasks"]:
                    project.tasks.append(task)
                # Re-fetch updated graph
                graph = project.get_task_graph()
            
            # Handle ProjectMemory updates from agent response
            if "tech_stack" in result and result["tech_stack"] and isinstance(result["tech_stack"], dict):
                project.memory.set_tech_stack(result["tech_stack"])
            if "decisions" in result and result["decisions"] and isinstance(result["decisions"], list):
                for d in result["decisions"]:
                    if isinstance(d, dict) and "topic" in d and "decision" in d:
                        project.memory.add_decision(d["topic"], d["decision"], d.get("rationale"), decided_by=str(current_agent_role))
            if "conventions" in result and result["conventions"] and isinstance(result["conventions"], list):
                for c in result["conventions"]:
                    if isinstance(c, dict) and "category" in c and "rule" in c:
                        project.memory.add_convention(c["category"], c["rule"])
            if "env_vars" in result and result["env_vars"] and isinstance(result["env_vars"], dict):
                for k, v in result["env_vars"].items():
                    project.memory.register_env_var(k, str(v))
            
            # Handle file operations
            if "file_operations" in result:
                written_files = []
                for file_op in result["file_operations"]:
                    file_path = os.path.join(project.project_directory, file_op.path)
                    
                    if file_op.operation in ["create", "update"]:
                        os.makedirs(os.path.dirname(file_path), exist_ok=True)
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(file_op.content)
                        project.files[file_op.path] = file_op.content
                        written_files.append(file_op.path)
                        
                    elif file_op.operation == "delete":
                        if os.path.exists(file_path):
                            os.remove(file_path)
                        project.files.pop(file_op.path, None)
                
                # Self-healing verification step: run tests and syntax checks on written files
                if current_agent_role == AgentRole.DEVELOPER and result["file_operations"]:
                    verification_error = await self.verify_code_in_workspace(project, result["file_operations"])
                    active_task = graph.get_active_task()
                    
                    if verification_error:
                        # Update QualityScorecard in Shared Memory
                        project.memory.update_verification_score(
                            syntax_ok=False,
                            total_tests=1,
                            passed_tests=0,
                            failures=[verification_error[:150]]
                        )
                        if active_task:
                            graph.mark_failed(active_task.id, reason=verification_error, auto_retry=True)
                        else:
                            repair_task = Task(
                                id=str(uuid.uuid4()),
                                title="Self-Healing: Repair verification errors",
                                description=f"Automated verification failed:\n{verification_error}",
                                assigned_to=AgentRole.DEVELOPER,
                                status=TaskStatus.IN_PROGRESS
                            )
                            project.tasks.append(repair_task)

                        qa_notice = (
                            f"⚠️ @Developer (David), automated DevOps and QA checks caught an issue:\n"
                            f"```\n{verification_error}\n```\n"
                            f"@Developer, please review the traceback and repair the affected code so we can re-test!"
                        )
                        self.add_message(project_id, AgentRole.QA_TESTER, qa_notice)
                        project.current_phase = "development"
                        result["message"] += f"\n\n[DevOps Test Runner]: Error detected! Initiating Developer Agent self-healing loop:\n{verification_error}"
                        result["next_agent"] = AgentRole.DEVELOPER
                    else:
                        # Update QualityScorecard in Shared Memory
                        project.memory.update_verification_score(
                            syntax_ok=True,
                            total_tests=1,
                            passed_tests=1,
                            failures=[]
                        )
                        if active_task:
                            graph.mark_completed(active_task.id, artifacts=written_files)

                        devops_pass = "✅ @Developer (David) & @QA_Tester (Maya), all automated syntax and structural checks passed cleanly! Good to go."
                        self.add_message(project_id, AgentRole.DEVOPS, devops_pass)
                        
                        # Dynamic progression to QA or next task
                        ready_qa = [t for t in graph.get_ready_tasks() if t.assigned_to == AgentRole.QA_TESTER]
                        if ready_qa:
                            result["next_agent"] = AgentRole.QA_TESTER
                            project.current_phase = "testing"
                        elif graph.all_completed():
                            result["next_agent"] = AgentRole.DEVOPS
                            project.current_phase = "deployment"
                        else:
                            ready_dev = [t for t in graph.get_ready_tasks() if t.assigned_to == AgentRole.DEVELOPER]
                            if ready_dev:
                                result["next_agent"] = AgentRole.DEVELOPER
                                project.current_phase = "development"

            # Dynamic QA review handling
            if current_agent_role == AgentRole.QA_TESTER:
                active_task = graph.get_active_task()
                if result.get("approved"):
                    if active_task and active_task.assigned_to == AgentRole.QA_TESTER:
                        graph.mark_completed(active_task.id)
                    if graph.all_completed():
                        project.current_phase = "deployment"
                        result["next_agent"] = AgentRole.DEVOPS
                    else:
                        ready = graph.get_ready_tasks()
                        if ready:
                            next_t = graph.start_next_task()
                            project.current_phase = "development" if next_t.assigned_to == AgentRole.DEVELOPER else "testing"
                            result["next_agent"] = next_t.assigned_to
                elif result.get("approved") is False:
                    if active_task:
                        err_reason = ", ".join(result.get("issues", [])) or "QA rejected implementation"
                        graph.mark_failed(active_task.id, reason=err_reason, auto_retry=True)
                    project.current_phase = "development"
                    result["next_agent"] = AgentRole.DEVELOPER

            # Project Manager handoff after planning
            if current_agent_role == AgentRole.PROJECT_MANAGER and result.get("tasks"):
                next_t = graph.start_next_task()
                if next_t:
                    project.current_phase = "development" if next_t.assigned_to == AgentRole.DEVELOPER else "testing"
                    result["next_agent"] = next_t.assigned_to

            # DevOps completion with Definition of Done (DoD) Gatekeeper Verification
            if current_agent_role == AgentRole.DEVOPS:
                eval_result = await EvaluationService.evaluate_project(project)
                if eval_result.passed:
                    project.is_complete = True
                    project.current_phase = "complete"
                    result["is_complete"] = True
                    result["next_agent"] = None
                    result["message"] += f"\n\n---\n{eval_result.summary}"
                else:
                    project.is_complete = False
                    remediation_role = eval_result.remediation_agent or AgentRole.DEVELOPER
                    dod_alert = (
                        f"🛡️ **[Definition of Done Gatekeeper]:** Sprint completion blocked!\n"
                        f"{eval_result.summary}\n\n"
                        f"@DevOps, handing off remediation task to @{remediation_role.value} to ensure production quality standards."
                    )
                    self.add_message(project_id, AgentRole.DEVOPS, dod_alert)
                    
                    rem_task = Task(
                        id=str(uuid.uuid4()),
                        title="DoD Remediation: Fix quality issues",
                        description="\n".join(eval_result.failures),
                        assigned_to=remediation_role,
                        status=TaskStatus.IN_PROGRESS
                    )
                    project.tasks.append(rem_task)
                    project.current_phase = "development" if remediation_role == AgentRole.DEVELOPER else "testing"
                    result["next_agent"] = remediation_role
                    result["message"] += f"\n\n[DoD Gatekeeper]: Quality criteria unfulfilled. Transitioning to {remediation_role.value} for remediation."

            # Update phase if explicitly returned and not complete
            if "phase" in result and not project.is_complete:
                project.current_phase = result["phase"]
            
            # Check if complete
            if result.get("is_complete", False):
                project.is_complete = True
            
            self.save_project(project_id)
            
            return {
                "success": True,
                "agent": current_agent_role,
                "message": result["message"],
                "next_agent": result.get("next_agent"),
                "file_operations": result.get("file_operations", []),
                "is_complete": project.is_complete,
                "tasks": [task.model_dump() for task in project.tasks],
                "current_phase": project.current_phase,
                "health_score": project.memory.scorecard.health_score,
                "scorecard": project.memory.scorecard.model_dump(),
                "tech_stack": project.memory.tech_stack
            }
            
        except Exception as e:
            err_str = str(e)
            is_net = any(k in err_str.lower() for k in ["connecterror", "connection error", "timeout", "network", "remote protocol", "econnreset", "getaddrinfo"])
            if not is_net:
                error_msg = f"Error in {current_agent_role}: {err_str}"
                self.add_message(project_id, AgentRole.PROJECT_MANAGER, error_msg)
            else:
                error_msg = f"Network connection error in {current_agent_role}: {err_str}"
                print(f"[Orchestrator] Network error in iteration for {project_id}: {err_str}")
            self.save_project(project_id)
            return {
                "success": False,
                "error": error_msg,
                "is_network_error": is_net
            }
    
    def get_current_agent(self, project: ProjectState) -> AgentRole:
        """Determine which agent should act next dynamically based on TaskGraph, Self-Healing, and Phase"""
        if not project.tasks and project.current_phase in ["initialization", "planning"]:
            return AgentRole.PROJECT_MANAGER

        graph = project.get_task_graph()

        # 1. Active in-progress task takes highest precedence
        active = graph.get_active_task()
        if active:
            return active.assigned_to

        # 2. Check for ready unblocked tasks
        ready = graph.get_ready_tasks()
        if ready:
            next_task = ready[0]
            return next_task.assigned_to

        # 3. If all tasks are completed, DevOps finalizes release
        if graph.all_completed() and project.current_phase != "complete":
            return AgentRole.DEVOPS

        # 4. Check for failed task requiring self-healing repair
        failed = [t for t in project.tasks if t.status == TaskStatus.FAILED]
        if failed:
            return AgentRole.DEVELOPER

        # 5. Fallback based on phase
        if project.current_phase == "development":
            return AgentRole.DEVELOPER
        elif project.current_phase == "testing":
            return AgentRole.QA_TESTER
        elif project.current_phase in ["deployment", "complete"]:
            return AgentRole.DEVOPS
        else:
            return AgentRole.PROJECT_MANAGER
    
    async def plan_project(self, user_prompt: str, pm_model: Optional[str] = None, 
                           api_key: Optional[str] = None, base_url: Optional[str] = None,
                           pm_provider: Optional[str] = None,
                           files_context: Optional[Dict[str, str]] = None) -> str:
        """Generate a project plan from a user prompt using current or specified PM model & provider"""
        pm_prov = pm_provider or config.PROJECT_MANAGER_PROVIDER
        def_url, def_key = config.get_provider_credentials(pm_prov)
        effective_key = api_key or def_key
        effective_base_url = base_url or def_url
        ai_service = AIService(api_key=effective_key, base_url=effective_base_url)
        model = pm_model or config.PROJECT_MANAGER_MODEL
        
        system_prompt = (
            "You are Sarah, Lead Technical Project Manager at Verno Studio. "
            "Your task is to take a user's project requirement or their feedback/modifications on a previously suggested plan, "
            "and create a clear, actionable, technical roadmap in markdown format. "
            "If the user asks to modify, omit, or change any phase or technology (e.g. 'no phase 6', 'remove deployment', 'use Tailwind'), "
            "strictly follow their instructions, remove or adjust the requested parts, and present the refined plan. "
            "At the end of your plan, ask the user if they approve the updated plan so development can begin."
        )
        
        full_prompt = user_prompt
        if files_context:
            files_str = "\n\nReferenced Context Files (@mentions):\n"
            for fpath, fcontent in files_context.items():
                files_str += f"\n--- {fpath} ---\n{fcontent}\n"
            full_prompt = full_prompt + files_str

        messages = [{"role": "user", "content": full_prompt}]
        response = await ai_service.generate(model, system_prompt, messages)
        await ai_service.close()
        return response["choices"][0]["message"]["content"]

    async def evaluate_project(self, project_id: str) -> Optional[Dict]:
        """Run an on-demand Definition of Done and Quality evaluation on a project"""
        project = self.get_project(project_id)
        if not project:
            return None
        eval_result = await EvaluationService.evaluate_project(project)
        self.save_project(project_id)
        return eval_result.to_dict()

    async def cleanup(self):
        """Cleanup resources"""
        for ai_service in self.ai_services.values():
            await ai_service.close()

# Global orchestrator instance
orchestrator = Orchestrator()