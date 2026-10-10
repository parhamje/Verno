import os
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

load_dotenv()

# Preset definitions for popular providers
PROVIDER_PRESETS = {
    "openrouter": {
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "default_models": {
            "pm": "anthropic/claude-3.5-sonnet",
            "dev": "anthropic/claude-3.5-sonnet",
            "qa": "openai/gpt-4o-mini",
            "devops": "anthropic/claude-3.5-sonnet"
        }
    },
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "default_models": {
            "pm": "gpt-4o",
            "dev": "gpt-4o",
            "qa": "gpt-4o-mini",
            "devops": "gpt-4o"
        }
    },
    "groq": {
        "name": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "default_models": {
            "pm": "llama-3.3-70b-versatile",
            "dev": "llama-3.3-70b-versatile",
            "qa": "llama-3.1-8b-instant",
            "devops": "llama-3.3-70b-versatile"
        }
    },
    "ollama": {
        "name": "Ollama (Local)",
        "base_url": "http://localhost:11434/v1",
        "default_models": {
            "pm": "llama3.1:latest",
            "dev": "qwen2.5-coder:latest",
            "qa": "llama3.1:latest",
            "devops": "llama3.1:latest"
        }
    },
    "gemini": {
        "name": "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "default_models": {
            "pm": "gemini-1.5-pro",
            "dev": "gemini-1.5-pro",
            "qa": "gemini-1.5-flash",
            "devops": "gemini-1.5-pro"
        }
    },
    "deepseek": {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "default_models": {
            "pm": "deepseek-chat",
            "dev": "deepseek-coder",
            "qa": "deepseek-chat",
            "devops": "deepseek-chat"
        }
    },
    "liara": {
        "name": "Liara AI",
        "base_url": "https://ai.liara.ir/api/693bc6a1dc577f85e738b9a9/v1",
        "default_models": {
            "pm": "anthropic/claude-sonnet-4.5",
            "dev": "qwen/qwen3-coder",
            "qa": "openai/gpt-4o-mini",
            "devops": "anthropic/claude-sonnet-4.5"
        }
    },
    "custom": {
        "name": "Custom OpenAI Compatible",
        "base_url": "",
        "default_models": {
            "pm": "gpt-4o",
            "dev": "gpt-4o",
            "qa": "gpt-4o-mini",
            "devops": "gpt-4o"
        }
    }
}

class Config:
    def __init__(self):
        self.reload()

    def reload(self):
        load_dotenv(override=True)
        # Server Config
        self.API_HOST = os.getenv("API_HOST", "127.0.0.1")
        self.API_PORT = int(os.getenv("API_PORT", "8000"))
        
        # Legacy / Default Provider Config
        self.AI_PROVIDER = os.getenv("AI_PROVIDER", "liara")
        self.AI_PROVIDER_BASE_URL = os.getenv("AI_PROVIDER_BASE_URL", "https://ai.liara.ir/api/693bc6a1dc577f85e738b9a9/v1")
        self.AI_PROVIDER_API_KEY = os.getenv("AI_PROVIDER_API_KEY", "")
        
        # Per-Agent Providers
        self.PROJECT_MANAGER_PROVIDER = os.getenv("PROJECT_MANAGER_PROVIDER", self.AI_PROVIDER)
        self.DEVELOPER_PROVIDER = os.getenv("DEVELOPER_PROVIDER", self.AI_PROVIDER)
        self.QA_TESTER_PROVIDER = os.getenv("QA_TESTER_PROVIDER", self.AI_PROVIDER)
        self.DEVOPS_PROVIDER = os.getenv("DEVOPS_PROVIDER", self.AI_PROVIDER)
        
        # Per-Agent Models
        self.PROJECT_MANAGER_MODEL = os.getenv("PROJECT_MANAGER_MODEL", "anthropic/claude-3.5-sonnet")
        self.DEVELOPER_MODEL = os.getenv("DEVELOPER_MODEL", "qwen/qwen3-coder")
        self.QA_TESTER_MODEL = os.getenv("QA_TESTER_MODEL", "anthropic/claude-3.5-sonnet")
        self.DEVOPS_MODEL = os.getenv("DEVOPS_MODEL", "anthropic/claude-3.5-sonnet")
        
        # Per-Provider Credentials dictionary
        self.providers: Dict[str, Dict[str, str]] = {}
        for p_key, p_val in PROVIDER_PRESETS.items():
            env_url_key = f"AI_PROVIDER_{p_key.upper()}_BASE_URL"
            env_key_key = f"AI_PROVIDER_{p_key.upper()}_API_KEY"
            
            p_url = os.getenv(env_url_key)
            if not p_url:
                if p_key == self.AI_PROVIDER and self.AI_PROVIDER_BASE_URL:
                    p_url = self.AI_PROVIDER_BASE_URL
                else:
                    p_url = p_val.get("base_url", "")
                    
            p_key_val = os.getenv(env_key_key)
            if not p_key_val:
                if p_key == self.AI_PROVIDER:
                    p_key_val = self.AI_PROVIDER_API_KEY
                else:
                    p_key_val = ""
                    
            self.providers[p_key] = {
                "name": p_val["name"],
                "base_url": p_url,
                "api_key": p_key_val
            }
        
        # System Limits
        self.MAX_ITERATIONS = int(os.getenv("MAX_ITERATIONS", "20"))
        self.TIMEOUT = int(os.getenv("TIMEOUT", "120"))

    def get_provider_credentials(self, provider_name: str) -> Tuple[str, str]:
        p = (provider_name or self.AI_PROVIDER or "liara").lower()
        if p in self.providers:
            prov = self.providers[p]
            url = prov.get("base_url") or self.AI_PROVIDER_BASE_URL
            key = prov.get("api_key") or self.AI_PROVIDER_API_KEY
            return url, key
        return self.AI_PROVIDER_BASE_URL, self.AI_PROVIDER_API_KEY

    def to_dict(self, hide_key: bool = False) -> Dict[str, Any]:
        key = self.AI_PROVIDER_API_KEY
        if hide_key and key:
            if len(key) > 8:
                key = f"{key[:4]}...{key[-4:]}"
            else:
                key = "********"
                
        # Clone providers dictionary
        providers_out = {}
        for k, v in self.providers.items():
            pk = v.get("api_key", "")
            if hide_key and pk:
                if len(pk) > 8:
                    pk = f"{pk[:4]}...{pk[-4:]}"
                else:
                    pk = "********"
            providers_out[k] = {
                "name": v.get("name", k),
                "base_url": v.get("base_url", ""),
                "api_key": pk
            }
            
        return {
            "AI_PROVIDER": self.AI_PROVIDER,
            "AI_PROVIDER_BASE_URL": self.AI_PROVIDER_BASE_URL,
            "AI_PROVIDER_API_KEY": key,
            "PROJECT_MANAGER_PROVIDER": self.PROJECT_MANAGER_PROVIDER,
            "DEVELOPER_PROVIDER": self.DEVELOPER_PROVIDER,
            "QA_TESTER_PROVIDER": self.QA_TESTER_PROVIDER,
            "DEVOPS_PROVIDER": self.DEVOPS_PROVIDER,
            "PROJECT_MANAGER_MODEL": self.PROJECT_MANAGER_MODEL,
            "DEVELOPER_MODEL": self.DEVELOPER_MODEL,
            "QA_TESTER_MODEL": self.QA_TESTER_MODEL,
            "DEVOPS_MODEL": self.DEVOPS_MODEL,
            "providers": providers_out,
            "API_HOST": self.API_HOST,
            "API_PORT": self.API_PORT,
            "MAX_ITERATIONS": self.MAX_ITERATIONS,
            "TIMEOUT": self.TIMEOUT,
            "PRESETS": PROVIDER_PRESETS
        }

    def update(self, **kwargs) -> Dict[str, Any]:
        """Update configurations in memory and persist them to backend/.env"""
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        
        # Read existing .env lines
        existing_env: Dict[str, str] = {}
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        existing_env[k.strip()] = v.strip()

        # Handle nested "providers" if provided
        if "providers" in kwargs and isinstance(kwargs["providers"], dict):
            for p_name, p_data in kwargs["providers"].items():
                if isinstance(p_data, dict):
                    if "base_url" in p_data and p_data["base_url"] is not None:
                        kwargs[f"AI_PROVIDER_{p_name.upper()}_BASE_URL"] = p_data["base_url"]
                    if "api_key" in p_data and p_data["api_key"] is not None:
                        kwargs[f"AI_PROVIDER_{p_name.upper()}_API_KEY"] = p_data["api_key"]

        # Handle per-agent configuration updates
        for k, v in kwargs.items():
            if v is None:
                continue
            str_val = str(v).strip()
            
            # Match allowed fields or provider credential fields
            is_valid = (
                k in [
                    "AI_PROVIDER", "AI_PROVIDER_BASE_URL", "AI_PROVIDER_API_KEY",
                    "PROJECT_MANAGER_PROVIDER", "DEVELOPER_PROVIDER", "QA_TESTER_PROVIDER", "DEVOPS_PROVIDER",
                    "PROJECT_MANAGER_MODEL", "DEVELOPER_MODEL", "QA_TESTER_MODEL", "DEVOPS_MODEL",
                    "MAX_ITERATIONS", "TIMEOUT", "API_HOST", "API_PORT"
                ] or 
                (k.startswith("AI_PROVIDER_") and (k.endswith("_BASE_URL") or k.endswith("_API_KEY")))
            )
            
            if is_valid:
                os.environ[k] = str_val
                existing_env[k] = str_val
                if hasattr(self, k):
                    if k in ["MAX_ITERATIONS", "TIMEOUT", "API_PORT"]:
                        setattr(self, k, int(str_val))
                    else:
                        setattr(self, k, str_val)

        # Write back to .env
        with open(env_path, "w", encoding="utf-8") as f:
            for k, v in existing_env.items():
                f.write(f"{k}={v}\n")

        # Reload state from env
        self.reload()
        return self.to_dict(hide_key=False)

config = Config()