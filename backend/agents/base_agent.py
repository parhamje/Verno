from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from models.project_state import Message, AgentRole

class BaseAgent(ABC):
    def __init__(self, role: AgentRole, model: str, ai_service):
        self.role = role
        self.model = model
        self.ai_service = ai_service
        
    @abstractmethod
    async def process(self, context: Dict, conversation_history: List[Message]) -> Dict:
        """
        Process the current context and return a response
        
        Returns:
            Dict with keys: message, actions (optional), next_agent (optional)
        """
        pass
    
    async def generate_response(self, system_prompt: str, user_message: str, 
                                conversation_history: List[Message] = None) -> Dict:
        """Generate a response using the AI service"""
        messages = []
        
        # Add conversation history if provided
        if conversation_history:
            persona_map = {
                AgentRole.PROJECT_MANAGER: "Sarah (Project Manager)",
                AgentRole.DEVELOPER: "David (Developer)",
                AgentRole.QA_TESTER: "Maya (QA Tester)",
                AgentRole.DEVOPS: "Sam (DevOps)",
                AgentRole.USER: "User"
            }
            for msg in conversation_history[-14:]:  # Last 14 messages for rich team context
                speaker = persona_map.get(msg.role, str(msg.role))
                content_with_speaker = f"[{speaker}]: {msg.content}"
                role = "user" if msg.role == AgentRole.USER else "assistant"
                messages.append({"role": role, "content": content_with_speaker})
        
        # Add current message
        messages.append({"role": "user", "content": user_message})
        
        response = await self.ai_service.generate(
            model=self.model,
            system_prompt=system_prompt,
            messages=messages
        )
        
        return response
    
    def format_context(self, context: Dict) -> str:
        """Format the context into a readable string"""
        formatted = []
        
        if "requirement" in context:
            formatted.append(f"Project Requirement: {context['requirement']}")
        
        if "task_graph" in context and context["task_graph"]:
            tg = context["task_graph"]
            if hasattr(tg, "format_graph_summary"):
                formatted.append("\n### Directed Task Graph & Sprint Execution\n" + tg.format_graph_summary())
        elif "tasks" in context and context["tasks"]:
            formatted.append(f"\nCurrent Tasks ({len(context['tasks'])}):")
            for task in context['tasks']:
                status_val = getattr(task.status, 'value', str(task.status)) if hasattr(task, 'status') else 'pending'
                formatted.append(f"- [{status_val}] {getattr(task, 'title', '')}")
        
        if "files" in context:
            formatted.append(f"\nCurrent Files ({len(context['files'])}):")
            for path in context['files'].keys():
                formatted.append(f"- {path}")
        
        if "current_phase" in context:
            formatted.append(f"\nCurrent Phase: {context['current_phase']}")
        
        if "memory" in context and context["memory"]:
            mem = context["memory"]
            if hasattr(mem, "format_memory_summary"):
                formatted.append("\n" + mem.format_memory_summary())
        
        return "\n".join(formatted)

    def extract_json(self, text: str) -> Dict:
        """Extract and parse JSON from markdown code blocks or raw text"""
        import json
        import re

        if not text:
            return {}

        text = text.strip()

        # Try to find JSON inside markdown code fence (```json ... ``` or ``` ... ```)
        json_fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if json_fence_match:
            candidate = json_fence_match.group(1).strip()
            try:
                return json.loads(candidate)
            except Exception:
                pass

        # Try to find the outermost JSON object { ... }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = text[start : end + 1]
            try:
                return json.loads(candidate)
            except Exception:
                # Clean trailing commas before closing braces/brackets
                cleaned = re.sub(r",\s*([\]}])", r"\1", candidate)
                try:
                    return json.loads(cleaned)
                except Exception:
                    pass

        # Fallback to direct parse or empty dict
        try:
            return json.loads(text)
        except Exception:
            return {}