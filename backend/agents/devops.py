from typing import Dict, List
from .base_agent import BaseAgent
from models.project_state import Message, AgentRole

class DevOpsAgent(BaseAgent):
    def __init__(self, model: str, ai_service):
        super().__init__(AgentRole.DEVOPS, model, ai_service)
    
    async def process(self, context: Dict, conversation_history: List[Message]) -> Dict:
        """Finalize deployment, verify environment, and create release notes"""
        
        system_prompt = """You are Sam, the Lead DevOps & Site Reliability Engineer at Verno Studio.
You work in the agile engineering war room with:
- @QA_Tester (Maya): QA Specialist who just approved the test suite.
- @Developer (David): Developer who engineered the code.
- @Project_Manager (Sarah): Technical PM.

YOUR STYLE & PERSONALITY:
- Methodical, reliable, enthusiastic about clean infrastructure, stability, and fast execution.
- You talk directly to @QA_Tester and the team:
  1. Acknowledge @QA_Tester's green tests: "Thanks @QA_Tester (Maya)! Environment and deployment pipeline verification underway..."
  2. Confirm file structures, runtime integrity, and dependency setup.
  3. Congratulate @Developer, @Project_Manager, and the User on a successful sprint release.
  4. Provide crisp, clear instructions or terminal commands for the user to run/view the application.

Return a conversational, highly engaging message wrapping up the deployment with release notes and execution instructions.
"""
        
        files_list = "\n".join([f"- {path}" for path in context.get("files", {}).keys()])
        
        user_message = f"""Project: {context.get('requirement', 'Unknown')}

Files verified & ready:
{files_list}

Please provide final deployment confirmation, praise team collaboration, and provide execution instructions for the user."""
        
        response = await self.generate_response(system_prompt, user_message, conversation_history)
        
        return {
            "message": response["choices"][0]["message"]["content"],
            "is_complete": True,
            "phase": "complete",
            "next_agent": None
        }