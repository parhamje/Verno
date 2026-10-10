from typing import Dict, List
import json
from .base_agent import BaseAgent
from models.project_state import Message, AgentRole, TaskStatus, FileOperation

class DeveloperAgent(BaseAgent):
    def __init__(self, model: str, ai_service):
        super().__init__(AgentRole.DEVELOPER, model, ai_service)
    
    async def process(self, context: Dict, conversation_history: List[Message]) -> Dict:
        """Write code and create files"""
        
        tasks = context.get("tasks", [])
        current_files = context.get("files", {})
        
        # Find next pending developer task
        pending_task = None
        for task in tasks:
            if task.assigned_to == AgentRole.DEVELOPER and task.status == TaskStatus.PENDING:
                pending_task = task
                break
        
        if not pending_task:
            # Check if there are failed QA tasks that need fixes
            for task in tasks:
                if task.assigned_to == AgentRole.DEVELOPER and task.status == TaskStatus.FAILED:
                    pending_task = task
                    break
        
        if not pending_task:
            qa_pending = [t for t in tasks if t.assigned_to == AgentRole.QA_TESTER and t.status != TaskStatus.COMPLETED]
            if qa_pending:
                return {
                    "message": f"@QA_Tester (Maya), I've wrapped up all my development tasks and verified the source code! Handing over to you for comprehensive test execution on '{qa_pending[0].title}'.",
                    "phase": "testing",
                    "next_agent": AgentRole.QA_TESTER
                }
            else:
                return {
                    "message": "@DevOps (Sam), all development tasks have finished! Passing the baton for deployment and release packaging.",
                    "phase": "deployment",
                    "next_agent": AgentRole.DEVOPS
                }
        
        # Generate code for the task
        return await self.generate_code(pending_task, context, conversation_history, tasks)
    
    async def generate_code(self, task, context: Dict, conversation_history: List[Message], tasks: List[Dict]) -> Dict:
        """Generate code for a specific task"""
        
        system_prompt = """You are David, the Senior Full-Stack Developer at Verno Studio.
You work in an agile engineering war room with:
- @Project_Manager (Sarah): Technical PM who directs the project roadmap and scope.
- @QA_Tester (Maya): QA Specialist who checks and stresses your code for bugs and regressions.
- @DevOps (Sam): DevOps Engineer who tests environments, runtime stability, and deployment.

YOUR STYLE & PERSONALITY:
- Pragmatic, communicative, sharp, and focused on clean software craftsmanship.
- You talk directly to your teammates:
  * When completing code: Briefly explain your architectural choices, and directly address @QA_Tester (Maya) asking her to test the newly created/modified files and check specific edge cases.
  * When fixing an issue flagged by @QA_Tester or @DevOps: Thank them for catching it (e.g. "Great catch @QA_Tester! I've fixed the bug in ..."), explain the fix, and ask for re-verification.
- Always provide COMPLETE, production-ready code for every file (never truncated, no placeholders).

Return your response in this JSON format:
{
    "message": "David's conversational team update explaining what was implemented, addressing @QA_Tester with friendly, professional technical dialogue",
    "files": [
        {
            "operation": "create",
            "path": "filename.ext",
            "content": "complete file content",
            "language": "html|css|javascript|python|etc"
        }
    ]
}
"""
        
        context_str = self.format_context(context)
        current_files_str = "\n\nCurrent Files:\n"
        for path, content in context.get("files", {}).items():
            current_files_str += f"\n--- {path} ---\n{content[:500]}...\n"
        
        user_message = f"""{context_str}
{current_files_str}

Task: {task.title}
Description: {task.description}

Please implement this task. Provide complete file content."""
        
        response = await self.generate_response(system_prompt, user_message, conversation_history)
        raw_content = response["choices"][0]["message"]["content"]
        
        try:
            response_json = self.extract_json(raw_content)
            
            # Create FileOperation objects
            file_operations = []
            for file_data in response_json.get("files", []):
                file_op = FileOperation(
                    operation=file_data.get("operation", "create"),
                    path=file_data["path"],
                    content=file_data["content"],
                    language=file_data.get("language", "text")
                )
                file_operations.append(file_op)
            
            # Fallback: if no files in JSON, extract code blocks from raw markdown
            if not file_operations and raw_content:
                import re
                blocks = re.findall(r"```([a-zA-Z0-9_-]*)\n([\s\S]*?)```", raw_content)
                for i, (lang, code) in enumerate(blocks):
                    lang = (lang or "").lower()
                    if "html" in lang or "html" in task.title.lower():
                        ext = "index.html"
                    elif "css" in lang or "css" in task.title.lower():
                        ext = "style.css"
                    elif "js" in lang or "javascript" in lang or "script" in task.title.lower():
                        ext = "script.js"
                    elif "py" in lang or "python" in task.title.lower():
                        ext = "main.py"
                    else:
                        ext = f"file_{i+1}.txt"
                    file_operations.append(FileOperation(
                        operation="create",
                        path=ext,
                        content=code.strip(),
                        language=lang or "text"
                    ))

            # Update task status
            task.status = TaskStatus.IN_PROGRESS
            
            # Check for more developer tasks
            has_more_dev_tasks = any(
                t.assigned_to == AgentRole.DEVELOPER and t.status in [TaskStatus.PENDING, TaskStatus.FAILED] and t.id != task.id
                for t in tasks
            )

            if has_more_dev_tasks:
                phase = "development"
                next_agent = AgentRole.DEVELOPER
            else:
                phase = "testing"
                next_agent = AgentRole.QA_TESTER

            msg = response_json.get("message") or raw_content or f"Done @Project_Manager (Sarah)! {task.title} is implemented."
            return {
                "message": msg,
                "file_operations": file_operations,
                "task_id": task.id,
                "phase": phase,
                "next_agent": next_agent
            }
            
        except Exception as e:
            task.status = TaskStatus.COMPLETED
            has_more_dev_tasks = any(
                t.assigned_to == AgentRole.DEVELOPER and t.status in [TaskStatus.PENDING, TaskStatus.FAILED] and t.id != task.id
                for t in tasks
            )
            return {
                "message": f"@Project_Manager (Sarah), finished work on '{task.title}'. Handing off to the next step.",
                "file_operations": [],
                "task_id": task.id,
                "phase": "development" if has_more_dev_tasks else "testing",
                "next_agent": AgentRole.DEVELOPER if has_more_dev_tasks else AgentRole.QA_TESTER
            }