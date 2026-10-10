import httpx
from typing import List, Dict, Optional
import json
import uuid
import asyncio
from config import config

class AIService:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or config.AI_PROVIDER_API_KEY
        raw_url = (base_url or config.AI_PROVIDER_BASE_URL or "").strip().rstrip("/")
        self.base_url = raw_url
        self.client = httpx.AsyncClient(timeout=float(config.TIMEOUT))
        self.session_id = f"verno_{uuid.uuid4().hex[:16]}"
    
    def _get_endpoint(self) -> str:
        if not self.base_url:
            raise Exception("AI Provider Base URL is not configured. Please check your settings.")
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        return f"{self.base_url}/chat/completions"

    async def generate(self, model: str, system_prompt: str, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 4000) -> Dict:
        """Generate a response from the AI model"""
        
        full_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages
        
        headers = {
            "Content-Type": "application/json",
            "x-opencode-session": self.session_id,
        }
        
        # Include Authorization header if api_key is present (Ollama might not require it)
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            
        # OpenRouter / general metadata headers
        headers["HTTP-Referer"] = "https://verno.ai"
        headers["X-Title"] = "Verno AI Studio"
        
        payload = {
            "model": model,
            "messages": full_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        endpoint = self._get_endpoint()
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                response = await self.client.post(
                    endpoint,
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 400:
                    error_details = response.text
                    raise Exception(f"Bad Request (400): {error_details}")
                elif response.status_code == 401:
                    raise Exception("Unauthorized (401): Invalid API key or token")
                elif response.status_code == 404:
                    raise Exception(f"Not Found (404): Endpoint '{endpoint}' not found. Please verify your Base URL.")
                elif response.status_code != 200:
                    raise Exception(f"AI Provider error ({response.status_code}): {response.text}")
                
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    msg = data["choices"][0].get("message", {})
                    if not msg.get("content") and msg.get("reasoning_content"):
                        msg["content"] = msg["reasoning_content"]
                return data
                
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.RemoteProtocolError, httpx.NetworkError) as e:
                if attempt < max_retries - 1:
                    delay = 2 ** (attempt + 1)
                    print(f"[AIService] Network interrupted ({type(e).__name__}: {e}). Retrying in {delay}s (attempt {attempt + 1}/{max_retries})...")
                    await asyncio.sleep(delay)
                    continue
                else:
                    raise Exception(f"Network disconnected or provider unreachable after {max_retries} attempts: {str(e)}. Please check your internet connection or proxy.")
            except Exception as e:
                print(f"AI Service Error: {e}")
                raise Exception(f"Failed to generate response: {str(e)}")
    
    async def test_connection(self, model: Optional[str] = None) -> Dict:
        """Lightweight test to verify API key and Base URL connectivity"""
        test_model = model or config.PROJECT_MANAGER_MODEL
        endpoint = self._get_endpoint()
        
        headers = {
            "Content-Type": "application/json",
            "x-opencode-session": self.session_id,
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            
        headers["HTTP-Referer"] = "https://verno.ai"
        headers["X-Title"] = "Verno AI Studio"

        payload = {
            "model": test_model,
            "messages": [
                {"role": "user", "content": "Respond with the word 'OK'."}
            ],
            "max_tokens": 10,
            "temperature": 0.1
        }
        
        response = await self.client.post(
            endpoint,
            headers=headers,
            json=payload,
            timeout=15.0
        )
        
        if response.status_code == 200:
            data = response.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            return {
                "success": True,
                "message": f"Connection successful! Model '{test_model}' responded: '{reply}'",
                "endpoint": endpoint,
                "model": test_model
            }
        else:
            return {
                "success": False,
                "status_code": response.status_code,
                "message": f"HTTP {response.status_code}: {response.text}",
                "endpoint": endpoint
            }

    async def generate_plan(self, user_prompt: str, model: Optional[str] = None) -> str:
        """Generate a project plan from a user prompt"""
        system_prompt = (
            "You are a senior project manager. Your task is to take a user's project requirement "
            "and break it down into a detailed, actionable plan. This plan should be clear, concise, "
            "and provide a good starting point for a team of AI developers. "
            "The output should be a markdown-formatted plan. After presenting the plan, ask the user for approval."
        )
        
        messages = [
            {"role": "user", "content": user_prompt}
        ]
        
        target_model = model or config.PROJECT_MANAGER_MODEL
        response = await self.generate(target_model, system_prompt, messages)
        return response["choices"][0]["message"]["content"]

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()