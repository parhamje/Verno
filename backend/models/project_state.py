from enum import Enum
from typing import List, Dict, Optional
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
try:
    from models.project_memory import ProjectMemory
except ImportError:
    from .project_memory import ProjectMemory

class AgentRole(str, Enum):
    USER = "user"
    PROJECT_MANAGER = "project_manager"
    DEVELOPER = "developer"
    QA_TESTER = "qa_tester"
    DEVOPS = "devops"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: AgentRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    assigned_to: AgentRole
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    dependencies: List[str] = []

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class FileOperation(BaseModel):
    operation: str  # create, update, delete
    path: str
    content: Optional[str] = None
    language: Optional[str] = None

class ProjectState(BaseModel):
    project_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_name: str
    project_directory: str
    requirement: str
    tasks: List[Task] = []
    messages: List[Message] = []
    files: Dict[str, str] = {}  # path -> content
    current_phase: str = "initialization"
    iterations: int = 0
    is_complete: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    api_key: str = ""
    providers_config: Optional[Dict] = None
    memory: ProjectMemory = Field(default_factory=ProjectMemory)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }