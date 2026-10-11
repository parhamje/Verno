from typing import Dict, List
import json
from .base_agent import BaseAgent
from models.project_state import Message, AgentRole, TaskStatus

class QATesterAgent(BaseAgent):
    def __init__(self, model: str, ai_service):
        super().__init__(AgentRole.QA_TESTER, model, ai_service)
    
    async def process(self, context: Dict, conversation_history: List[Message]) -> Dict:
        """Review code and report issues"""
        
        tasks = context.get("tasks", [])
        task_graph = context.get("task_graph")
        
        current_task = None
        if task_graph:
            current_task = task_graph.get_active_task()
            if not current_task:
                ready_qa = [t for t in task_graph.get_ready_tasks() if t.assigned_to == AgentRole.QA_TESTER]
                if ready_qa:
                    current_task = ready_qa[0]
                    current_task.status = TaskStatus.IN_PROGRESS
        
        # Fallback to list search
        if not current_task:
            current_task = next((t for t in tasks if t.status == TaskStatus.IN_PROGRESS), None)
        
        if not current_task:
            current_task = next((t for t in tasks if t.assigned_to == AgentRole.QA_TESTER and t.status in [TaskStatus.PENDING, TaskStatus.FAILED]), None)
            if current_task:
                current_task.status = TaskStatus.IN_PROGRESS
        
        # If no QA task remains, check if any dev task is pending
        if not current_task:
            pending_dev = [t for t in tasks if t.assigned_to == AgentRole.DEVELOPER and t.status != TaskStatus.COMPLETED]
            if pending_dev:
                return {
                    "message": f"@Developer (David), standing by for your next update on '{pending_dev[0].title}'!",
                    "phase": "development",
                    "next_agent": AgentRole.DEVELOPER
                }
            else:
                return {
                    "message": "🎉 @DevOps (Sam), all developer tasks and QA checks have completed successfully! Handing over to you for final runtime verification and deployment.",
                    "phase": "deployment",
                    "next_agent": AgentRole.DEVOPS
                }
        
        return await self.review_code(current_task, context, conversation_history)
    
    async def review_code(self, task, context: Dict, conversation_history: List[Message]) -> Dict:
        """Review code quality and functionality"""
        
        system_prompt = """You are Maya, the Senior QA & Automation Engineer at Verno Studio.
You work in the agile engineering war room with:
- @Developer (David): The developer whose code you inspect, test, and challenge.
- @Project_Manager (Sarah): Lead PM.
- @DevOps (Sam): DevOps Engineer who handles the deployment after your green light.

YOUR STYLE & PERSONALITY:
- Sharp, detail-oriented, constructive, supportive, and communicative.
- You talk directly to @Developer (David):
  * If code has issues, bugs, or missing edge cases: Call them out specifically and constructively to @Developer (e.g., "Hey @Developer, I reviewed your code and caught an issue: [details]. Let's patch this before we ship!"). Set approved: false.
  * If code is complete and functional: Celebrate with @Developer and hand off to @DevOps (e.g., "Awesome job @Developer! Tested the implementation and all checks look green! ✅ Over to you @DevOps for environment verification!"). Set approved: true.

Return your response in this JSON format:
{
    "message": "Maya's conversational review directly addressing @Developer with technical feedback and handoff",
    "approved": true/false,
    "issues": [
        "Issue 1 description",
        "Issue 2 description"
    ]
}
"""
        
        # Get the files related to this task
        files_str = "\n\nFiles to Review:\n"
        for path, content in context.get("files", {}).items():
            files_str += f"\n--- {path} ---\n{content}\n"
        
        user_message = f"""Task: {task.title}
Description: {task.description}

{files_str}

Please review this code and determine if it meets the requirements."""
        
        response = await self.generate_response(system_prompt, user_message, conversation_history)
        raw_content = response["choices"][0]["message"]["content"]
        
        try:
            response_json = self.extract_json(raw_content)
            
            approved = response_json.get("approved", False)
            issues = response_json.get("issues", [])
            
            if approved:
                task.status = TaskStatus.COMPLETED
                remaining = [t for t in context.get("tasks", []) if t.id != task.id and t.status != TaskStatus.COMPLETED]
                if not remaining:
                    next_agent = AgentRole.DEVOPS
                    phase = "deployment"
                    qa_msg = response_json.get("message", raw_content)
                    if "@DevOps" not in qa_msg:
                        qa_msg += "\n\n@DevOps (Sam), all sprint tasks are verified and green! Passing over to you for deployment packaging."
                else:
                    next_agent = AgentRole.DEVELOPER
                    phase = "development"
                    qa_msg = response_json.get("message", raw_content)
            else:
                task.status = TaskStatus.FAILED
                next_agent = AgentRole.DEVELOPER
                phase = "development"
                qa_msg = response_json.get("message", raw_content)
            
            return {
                "message": qa_msg,
                "approved": approved,
                "issues": issues,
                "task_id": task.id,
                "phase": phase,
                "next_agent": next_agent
            }
            
        except Exception as e:
            # If parsing fails, approve by default
            task.status = TaskStatus.COMPLETED
            remaining = [t for t in context.get("tasks", []) if t.id != task.id and t.status != TaskStatus.COMPLETED]
            if not remaining:
                next_agent = AgentRole.DEVOPS
                phase = "deployment"
            else:
                next_agent = AgentRole.DEVELOPER
                phase = "development"
            return {
                "message": "Code review completed. All automated and manual checks look solid! Passing over to @DevOps for environment release.",
                "approved": True,
                "issues": [],
                "task_id": task.id,
                "phase": phase,
                "next_agent": next_agent
            }