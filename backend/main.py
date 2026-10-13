from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import asyncio
import json
import httpx
from datetime import datetime

from services.orchestrator import orchestrator
from services.ai_service import AIService
from models.project_state import AgentRole
from config import config, PROVIDER_PRESETS

def json_default(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await orchestrator.cleanup()

app = FastAPI(title="Verno AI Studio Backend", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class CreateProjectRequest(BaseModel):
    project_name: str
    requirement: str
    project_directory: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    pm_provider: Optional[str] = None
    pm_model: Optional[str] = None
    dev_provider: Optional[str] = None
    dev_model: Optional[str] = None
    qa_provider: Optional[str] = None
    qa_model: Optional[str] = None
    devops_provider: Optional[str] = None
    devops_model: Optional[str] = None
    files_context: Optional[Dict[str, str]] = None

class MessageRequest(BaseModel):
    message: str

class PlanProjectRequest(BaseModel):
    message: str
    pm_provider: Optional[str] = None
    pm_model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    files_context: Optional[Dict[str, str]] = None

class InlineEditRequest(BaseModel):
    code: str
    instruction: str
    file_path: Optional[str] = None
    language: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None

class UpdateConfigRequest(BaseModel):
    AI_PROVIDER: Optional[str] = None
    AI_PROVIDER_BASE_URL: Optional[str] = None
    AI_PROVIDER_API_KEY: Optional[str] = None
    PROJECT_MANAGER_PROVIDER: Optional[str] = None
    DEVELOPER_PROVIDER: Optional[str] = None
    QA_TESTER_PROVIDER: Optional[str] = None
    DEVOPS_PROVIDER: Optional[str] = None
    PROJECT_MANAGER_MODEL: Optional[str] = None
    DEVELOPER_MODEL: Optional[str] = None
    QA_TESTER_MODEL: Optional[str] = None
    DEVOPS_MODEL: Optional[str] = None
    MAX_ITERATIONS: Optional[int] = None
    TIMEOUT: Optional[int] = None
    providers: Optional[Dict[str, Any]] = None

class TestConnectionRequest(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None

class FetchModelsRequest(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    provider: Optional[str] = None

# Routes
@app.post("/api/projects")
async def create_project(request: CreateProjectRequest):
    """Create a new project with optional per-agent model & provider overrides"""
    try:
        project_id = orchestrator.create_project(
            project_name=request.project_name,
            requirement=request.requirement,
            project_directory=request.project_directory,
            api_key=request.api_key,
            base_url=request.base_url,
            pm_provider=request.pm_provider,
            pm_model=request.pm_model,
            dev_provider=request.dev_provider,
            dev_model=request.dev_model,
            qa_provider=request.qa_provider,
            qa_model=request.qa_model,
            devops_provider=request.devops_provider,
            devops_model=request.devops_model,
            files_context=request.files_context
        )
        
        return {
            "success": True,
            "project_id": project_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects")
async def list_projects():
    """List all saved projects from disk and memory"""
    return {
        "success": True,
        "projects": orchestrator.list_projects()
    }

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details"""
    project = orchestrator.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "success": True,
        "project": project.model_dump()
    }

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a saved project session"""
    success = orchestrator.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found or could not be deleted")
    return {"success": True}

@app.post("/api/projects/{project_id}/resume")
async def resume_project(project_id: str):
    """Resume an existing or interrupted project"""
    success = orchestrator.resume_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "success": True, 
        "project": orchestrator.get_project(project_id).model_dump()
    }

@app.get("/api/projects/{project_id}/start")
async def start_project(project_id: str):
    """Start or resume the project workflow and stream progress events with auto-retry"""
    
    async def event_generator():
        project = orchestrator.get_project(project_id)
        
        if not project:
            yield f"data: {json.dumps({'error': 'Project not found'})}\n\n"
            return
        
        # Ensure agents are initialized
        orchestrator.ensure_project_agents(project_id)
        
        yield f"data: {json.dumps({'type': 'start', 'message': 'Starting multi-agent workflow...', 'project_id': project_id})}\n\n"
        
        consecutive_net_errors = 0
        while not project.is_complete and project.iterations < config.MAX_ITERATIONS:
            try:
                result = await orchestrator.process_iteration(project_id)
                
                # Check if process_iteration reported a network error
                if not result.get("success", True) and result.get("is_network_error"):
                    consecutive_net_errors += 1
                    err_msg = result.get("error", "Network connection failed")
                    if consecutive_net_errors <= 5:
                        yield f"data: {json.dumps({'type': 'network_warning', 'message': f'Network issue detected. Retrying in 4s... (attempt {consecutive_net_errors}/5)', 'error': err_msg})}\n\n"
                        await asyncio.sleep(4)
                        continue
                    else:
                        yield f"data: {json.dumps({'type': 'network_paused', 'message': 'Internet connection interrupted. Workflow paused. Verno will auto-resume once connection returns.'})}\n\n"
                        break
                elif not result.get("success", True) and "error" in result:
                    # Non-network permanent error
                    yield f"data: {json.dumps({'type': 'error', 'message': result.get('error')})}\n\n"
                    break
                
                consecutive_net_errors = 0
                file_ops_payload = []
                for op in result.get("file_operations", []):
                    op_dict = op.model_dump() if hasattr(op, 'model_dump') else dict(op)
                    raw_path = op_dict.get("path", "")
                    full_p = os.path.join(project.project_directory, raw_path).replace("\\", "/")
                    op_dict["full_path"] = full_p
                    op_dict["project_name"] = project.project_name
                    if project.project_name and not raw_path.startswith(f"{project.project_name}/"):
                        op_dict["target_path"] = f"{project.project_name}/{raw_path}".replace("\\", "/")
                    else:
                        op_dict["target_path"] = raw_path
                    file_ops_payload.append(op_dict)

                event_data = {
                    "type": "progress",
                    "agent": result.get("agent"),
                    "next_agent": result.get("next_agent"),
                    "message": result.get("message"),
                    "file_operations": file_ops_payload,
                    "tasks": result.get("tasks", []),
                    "current_phase": result.get("current_phase"),
                    "health_score": result.get("health_score", 100),
                    "scorecard": result.get("scorecard", {}),
                    "tech_stack": result.get("tech_stack", {}),
                    "project_name": project.project_name,
                    "project_directory": project.project_directory,
                    "is_complete": result.get("is_complete", False)
                }
                
                yield f"data: {json.dumps(event_data, default=json_default)}\n\n"
                await asyncio.sleep(1)
                
                if result.get("is_complete"):
                    break
                    
            except Exception as e:
                err_text = str(e)
                is_net = any(k in err_text.lower() for k in ["connecterror", "connection error", "timeout", "network", "remote protocol", "econnreset", "getaddrinfo"])
                if is_net:
                    consecutive_net_errors += 1
                    if consecutive_net_errors <= 5:
                        yield f"data: {json.dumps({'type': 'network_warning', 'message': f'Network blip detected. Retrying in 4s... (attempt {consecutive_net_errors}/5)'})}\n\n"
                        await asyncio.sleep(4)
                        continue
                    else:
                        yield f"data: {json.dumps({'type': 'network_paused', 'message': 'Internet connection interrupted. Workflow safely paused. Auto-resumes when online.'})}\n\n"
                        break
                yield f"data: {json.dumps({'type': 'error', 'message': err_text})}\n\n"
                break
        
        if project.is_complete:
            yield f"data: {json.dumps({'type': 'complete', 'message': 'Project workflow finished!'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@app.get("/api/projects/{project_id}/scorecard")
async def get_project_scorecard(project_id: str):
    """Get the current Quality Scorecard and DoD breakdown for a project"""
    project = orchestrator.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "success": True,
        "scorecard": project.memory.scorecard.model_dump(),
        "health_score": project.memory.scorecard.health_score,
        "dod_passed": project.memory.scorecard.dod_passed,
        "criteria": project.memory.scorecard.criteria_breakdown
    }

@app.post("/api/projects/{project_id}/evaluate")
async def evaluate_project(project_id: str):
    """Run an on-demand Definition of Done and Quality Gatekeeper evaluation"""
    eval_result = await orchestrator.evaluate_project(project_id)
    if not eval_result:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "success": True,
        "evaluation": eval_result
    }

@app.post("/api/projects/{project_id}/messages")
async def add_message(project_id: str, request: MessageRequest):
    """Add a user message"""
    orchestrator.add_message(project_id, AgentRole.USER, request.message)
    return {"success": True}

@app.post("/api/projects/plan")
async def plan_project(request: PlanProjectRequest):
    """Generate a project plan from a prompt using configured PM provider and model"""
    try:
        plan = await orchestrator.plan_project(
            user_prompt=request.message,
            pm_model=request.pm_model,
            api_key=request.api_key,
            base_url=request.base_url,
            pm_provider=request.pm_provider,
            files_context=request.files_context
        )
        return {"success": True, "plan": plan}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inline-edit")
async def inline_edit(request: InlineEditRequest):
    """Smart inline code refactoring and generation using Developer Agent"""
    try:
        prov = request.provider or config.DEVELOPER_PROVIDER
        url, key = config.get_provider_credentials(prov)
        model = request.model or config.DEVELOPER_MODEL
        
        service = AIService(api_key=key, base_url=url)
        
        system_prompt = (
            "You are Verno's Senior AI Code Refactoring Engine. "
            "You will be given a code snippet and an instruction on how to edit it. "
            "Return ONLY the modified code. "
            "Do NOT include markdown formatting backticks (no ```), no conversational filler, no explanations. "
            "Preserve exact indentation, style, and comments unless explicitly asked to modify them."
        )
        
        user_message = f"Language: {request.language or 'text'}\nFile: {request.file_path or 'unknown'}\nInstruction: {request.instruction}\n\nOriginal Code:\n{request.code}"
        
        response = await service.generate(
            model=model,
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            temperature=0.2
        )
        await service.close()
        
        raw = response["choices"][0]["message"]["content"]
        clean_code = raw.strip()
        if clean_code.startswith("```"):
            first_newline = clean_code.find("\n")
            if first_newline != -1:
                clean_code = clean_code[first_newline + 1:]
            if clean_code.endswith("```"):
                clean_code = clean_code[:-3]
            clean_code = clean_code.strip("\r\n")
            
        return {
            "success": True,
            "modified_code": clean_code,
            "provider": prov,
            "model": model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}/messages")
async def get_messages(project_id: str):
    """Get all messages"""
    project = orchestrator.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "success": True,
        "messages": [msg.model_dump() for msg in project.messages]
    }

@app.get("/api/config")
async def get_config():
    """Get current configuration including presets and per-agent model selections"""
    return {
        "success": True,
        "config": config.to_dict(hide_key=False)
    }

@app.post("/api/config")
async def update_config(request: UpdateConfigRequest):
    """Update configuration settings and persist to backend/.env"""
    try:
        updates = {k: v for k, v in request.model_dump().items() if v is not None}
        new_config = config.update(**updates)
        return {
            "success": True,
            "message": "Configuration updated successfully",
            "config": new_config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update config: {str(e)}")

@app.post("/api/config/test")
async def test_config(request: TestConnectionRequest):
    """Test AI provider connection with given or configured credentials"""
    try:
        base_url = request.base_url
        api_key = request.api_key
        if request.provider and (not base_url or not api_key):
            p_url, p_key = config.get_provider_credentials(request.provider)
            base_url = base_url or p_url
            api_key = api_key or p_key
            
        tester = AIService(api_key=api_key, base_url=base_url)
        result = await tester.test_connection(model=request.model)
        await tester.close()
        return result
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection test failed: {str(e)}"
        }

@app.post("/api/config/models")
@app.post("/api/models")
async def fetch_models(request: FetchModelsRequest):
    """Fetch available models list from an OpenAI-compatible endpoint or Ollama"""
    try:
        base_url = request.base_url
        api_key = request.api_key
        
        if request.provider and (not base_url or not api_key):
            p_url, p_key = config.get_provider_credentials(request.provider)
            base_url = base_url or p_url
            api_key = api_key or p_key
            
        if not base_url:
            base_url = config.AI_PROVIDER_BASE_URL
        if not api_key:
            api_key = config.AI_PROVIDER_API_KEY
            
        clean_url = (base_url or "").strip().rstrip("/")
        if clean_url.endswith("/chat/completions"):
            clean_url = clean_url[:-len("/chat/completions")]
            
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        headers["HTTP-Referer"] = "https://verno.ai"
        headers["X-Title"] = "Verno AI Studio"

        models = []
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Try standard OpenAI /models endpoint
            models_endpoint = f"{clean_url}/models"
            try:
                res = await client.get(models_endpoint, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    raw_list = data.get("data") or data.get("models") or []
                    for item in raw_list:
                        if isinstance(item, dict):
                            mid = item.get("id") or item.get("name")
                            if mid:
                                models.append(mid)
                        elif isinstance(item, str):
                            models.append(item)
            except Exception:
                pass
            
            # 2. If nothing found, try Ollama endpoint (/api/tags)
            if not models:
                try:
                    ollama_endpoint = f"{clean_url}/api/tags"
                    res = await client.get(ollama_endpoint, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        for m in data.get("models", []):
                            name = m.get("name") or m.get("model")
                            if name:
                                models.append(name)
                except Exception:
                    pass

        unique_models = sorted(list(set(models)))
        return {
            "success": True,
            "models": unique_models,
            "count": len(unique_models),
            "endpoint": clean_url
        }
    except Exception as e:
        return {
            "success": False,
            "models": [],
            "count": 0,
            "message": str(e)
        }

@app.get("/api/providers")
async def get_providers():
    """Get all built-in provider presets"""
    return {
        "success": True,
        "presets": PROVIDER_PRESETS
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)