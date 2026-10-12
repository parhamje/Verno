from typing import Dict, List
import json
from .base_agent import BaseAgent
from models.project_state import Message, AgentRole, Task, TaskStatus
from datetime import datetime
import uuid

class ProjectManagerAgent(BaseAgent):
    def __init__(self, model: str, ai_service):
        super().__init__(AgentRole.PROJECT_MANAGER, model, ai_service)
    
    async def process(self, context: Dict, conversation_history: List[Message]) -> Dict:
        """Create project plan and manage tasks"""
        
        tasks = context.get("tasks", [])
        current_phase = context.get("current_phase", "initialization")
        
        if not tasks or current_phase in ["initialization", "planning"]:
            return await self.create_project_plan(context, conversation_history)
        else:
            return await self.monitor_progress(context, conversation_history)
    
    async def create_project_plan(self, context: Dict, conversation_history: List[Message]) -> Dict:
        """Create initial project plan with tasks"""
        
        system_prompt = """You are Sarah, the Lead Technical Project Manager at Verno Studio.
You run a high-performing autonomous software team with:
- @Developer (David): Senior Full-Stack Developer who writes clean, robust code.
- @QA_Tester (Maya): QA Automation Specialist who inspects edge cases and verifies functionality.
- @DevOps (Sam): DevOps Engineer who tests environments, runtime integrity, and handles final release.

YOUR STYLE & PERSONALITY:
- Clear, encouraging, decisive, and highly communicative.
- Talk directly to your team members in the war room using @Developer, @QA_Tester, or @DevOps.
- In your message:
  1. Greet the team and summarize the user's objective with positive energy.
  2. Explain the sprint breakdown clearly.
  3. Direct your message to @Developer to kick off task #1 with clear architectural expectations.

Return your response in this JSON format:
{
    "message": "Sarah's collaborative team message introducing the plan, explaining the sprint breakdown, and handing off directly to @Developer",
    "tech_stack": {
        "frontend": "Framework or technology (e.g. HTML5/CSS/JS, React)",
        "backend": "Backend technology or none",
        "styling": "Styling approach"
    },
    "decisions": [
        {
            "topic": "Architecture",
            "decision": "Concrete design decision",
            "rationale": "Reasoning for the decision"
        }
    ],
    "conventions": [
        {
            "category": "Code Quality",
            "rule": "Clean architecture rule"
        }
    ],
    "tasks": [
        {
            "title": "Task title",
            "description": "Specific technical description",
            "assigned_to": "developer|qa_tester"
        }
    ]
}

Keep tasks specific and focused. Maintain a clean progression (Core Structure -> Styling/UI -> Logic/APIs -> Validation).
"""
        
        context_str = self.format_context(context)
        user_message = f"{context_str}\n\nPlease create a project plan for this requirement, defining the tech stack, key architectural decisions, conventions, and tasks."
        
        response = await self.generate_response(system_prompt, user_message, conversation_history)
        raw_content = response["choices"][0]["message"]["content"]
        
        try:
            # Try to parse JSON from response
            response_json = self.extract_json(raw_content)

            # Create Task objects with DAG dependencies
            tasks = []
            created_ids = []
            raw_tasks = response_json.get("tasks", [])
            for i, task_data in enumerate(raw_tasks):
                t_id = str(uuid.uuid4())
                created_ids.append(t_id)
                deps = []
                # If explicit dependencies given as indices or IDs, use them
                raw_deps = task_data.get("dependencies", [])
                if isinstance(raw_deps, list):
                    for d in raw_deps:
                        if isinstance(d, int) and 0 <= d < len(created_ids) - 1:
                            deps.append(created_ids[d])
                        elif isinstance(d, str) and d:
                            deps.append(d)
                # Default sequential dependency: task i depends on task i-1
                if not deps and i > 0:
                    deps.append(created_ids[i - 1])

                assigned = task_data.get("assigned_to", "developer")
                try:
                    assigned_role = AgentRole(assigned)
                except ValueError:
                    assigned_role = AgentRole.DEVELOPER

                task = Task(
                    id=t_id,
                    title=task_data.get("title", f"Task #{i+1}"),
                    description=task_data.get("description", ""),
                    status=TaskStatus.PENDING,
                    assigned_to=assigned_role,
                    created_at=datetime.now(),
                    dependencies=deps
                )
                tasks.append(task)
            
            # Safeguard: If model didn't return any tasks, synthesize core implementation & QA tasks
            if not tasks:
                req_title = context.get("requirement", "Core implementation")[:50]
                dev_id = str(uuid.uuid4())
                qa_id = str(uuid.uuid4())
                tasks = [
                    Task(
                        id=dev_id,
                        title=f"Implement: {req_title}",
                        description=f"Develop complete code and deliverable files for: {context.get('requirement', '')}",
                        status=TaskStatus.PENDING,
                        assigned_to=AgentRole.DEVELOPER,
                        created_at=datetime.now(),
                        dependencies=[]
                    ),
                    Task(
                        id=qa_id,
                        title="Comprehensive QA & functional validation",
                        description=f"Inspect, test, and verify code implementation and edge cases.",
                        status=TaskStatus.PENDING,
                        assigned_to=AgentRole.QA_TESTER,
                        created_at=datetime.now(),
                        dependencies=[dev_id]
                    )
                ]

            return {
                "message": response_json.get("message", raw_content),
                "tasks": tasks,
                "tech_stack": response_json.get("tech_stack", {}),
                "decisions": response_json.get("decisions", []),
                "conventions": response_json.get("conventions", []),
                "next_agent": AgentRole.DEVELOPER,
                "phase": "development"
            }
            
        except Exception as e:
            # Fallback if JSON parsing fails
            req_title = context.get("requirement", "Core implementation")[:50]
            dev_id = str(uuid.uuid4())
            qa_id = str(uuid.uuid4())
            fallback_tasks = [
                Task(
                    id=dev_id,
                    title=f"Implement: {req_title}",
                    description=f"Develop complete code and deliverable files for: {context.get('requirement', '')}",
                    status=TaskStatus.PENDING,
                    assigned_to=AgentRole.DEVELOPER,
                    created_at=datetime.now(),
                    dependencies=[]
                ),
                Task(
                    id=qa_id,
                    title="Comprehensive QA & functional validation",
                    description=f"Inspect, test, and verify code implementation and edge cases.",
                    status=TaskStatus.PENDING,
                    assigned_to=AgentRole.QA_TESTER,
                    created_at=datetime.now(),
                    dependencies=[dev_id]
                )
            ]
            return {
                "message": raw_content,
                "tasks": fallback_tasks,
                "next_agent": AgentRole.DEVELOPER,
                "phase": "development"
            }
    
    async def monitor_progress(self, context: Dict, conversation_history: List[Message]) -> Dict:
        """Monitor project progress and decide next steps"""
        
        tasks = context.get("tasks", [])
        if not tasks:
            return await self.create_project_plan(context, conversation_history)

        pending_tasks = [t for t in tasks if t.status != TaskStatus.COMPLETED]
        
        if not pending_tasks:
            return {
                "message": "🎉 Phenomenal job team! @Developer and @QA_Tester have knocked out all sprint tasks! Passing the baton to @DevOps (Sam) to run environmental verification and package the release notes.",
                "next_agent": AgentRole.DEVOPS,
                "phase": "deployment"
            }
        
        # Check if we need QA review
        in_progress = [t for t in tasks if t.status == TaskStatus.IN_PROGRESS]
        if in_progress:
            active_task = in_progress[0]
            if active_task.assigned_to == AgentRole.DEVELOPER:
                return {
                    "message": f"@QA_Tester (Maya), @Developer has completed work on '{active_task.title}'. Could you please run tests and inspect the implementation?",
                    "next_agent": AgentRole.QA_TESTER,
                    "phase": "testing"
                }
            elif active_task.assigned_to == AgentRole.QA_TESTER:
                return {
                    "message": f"@QA_Tester (Maya), please continue test execution for '{active_task.title}'.",
                    "next_agent": AgentRole.QA_TESTER,
                    "phase": "testing"
                }

        # Check pending tasks breakdown
        qa_pending = [t for t in pending_tasks if t.assigned_to == AgentRole.QA_TESTER]
        dev_pending = [t for t in pending_tasks if t.assigned_to == AgentRole.DEVELOPER]

        # If all developer tasks are completed and only QA tasks remain
        if not dev_pending and qa_pending:
            return {
                "message": f"@QA_Tester (Maya), all developer tasks are finished! Please pick up the final validation task '{qa_pending[0].title}'.",
                "next_agent": AgentRole.QA_TESTER,
                "phase": "testing"
            }

        # Otherwise continue development
        next_dev = dev_pending[0] if dev_pending else pending_tasks[0]
        return {
            "message": f"@Developer (David), sprint is moving forward smoothly! Let's pick up the next task '{next_dev.title}' ({len(pending_tasks)} remaining).",
            "next_agent": AgentRole.DEVELOPER,
            "phase": "development"
        }