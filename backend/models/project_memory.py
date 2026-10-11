from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
import uuid
from pydantic import BaseModel, Field

class DecisionCategory(str, Enum):
    ARCHITECTURE = "architecture"
    TECH_STACK = "tech_stack"
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    API_DESIGN = "api_design"
    STYLING = "styling"
    TESTING = "testing"
    INFRASTRUCTURE = "infrastructure"

class ArchitecturalDecision(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    topic: str
    decision: str
    rationale: Optional[str] = None
    decided_by: str = "project_manager"
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ProjectConvention(BaseModel):
    category: str  # e.g., "naming", "api_response", "file_structure", "code_style"
    rule: str      # e.g., "All API endpoints must return {success: bool, data: ...}"

class QualityScorecard(BaseModel):
    syntax_passed: bool = True
    tests_total: int = 0
    tests_passed: int = 0
    test_failures: List[str] = Field(default_factory=list)
    lint_errors: List[str] = Field(default_factory=list)
    health_score: int = 100  # 0 to 100%
    last_verified_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ProjectMemory(BaseModel):
    """
    Shared Knowledge Base & Project Memory across all agents.
    Provides structured, token-efficient, persistent domain knowledge.
    """
    tech_stack: Dict[str, str] = Field(default_factory=dict)
    decisions: List[ArchitecturalDecision] = Field(default_factory=list)
    conventions: List[ProjectConvention] = Field(default_factory=list)
    environment_variables: Dict[str, str] = Field(default_factory=dict)
    scorecard: QualityScorecard = Field(default_factory=QualityScorecard)
    key_findings: List[str] = Field(default_factory=list)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    def add_decision(self, topic: str, decision: str, rationale: Optional[str] = None, decided_by: str = "project_manager") -> ArchitecturalDecision:
        for d in self.decisions:
            if d.topic.lower() == topic.lower():
                d.decision = decision
                d.rationale = rationale
                d.decided_by = decided_by
                d.timestamp = datetime.now()
                return d
        new_d = ArchitecturalDecision(topic=topic, decision=decision, rationale=rationale, decided_by=decided_by)
        self.decisions.append(new_d)
        return new_d

    def add_convention(self, category: str, rule: str):
        for c in self.conventions:
            if c.category.lower() == category.lower() and c.rule.lower() == rule.lower():
                return
        self.conventions.append(ProjectConvention(category=category, rule=rule))

    def set_tech_stack(self, stack_dict: Dict[str, str]):
        self.tech_stack.update(stack_dict)

    def register_env_var(self, name: str, description: str):
        self.environment_variables[name] = description

    def update_verification_score(self, syntax_ok: bool, total_tests: int, passed_tests: int, failures: List[str]):
        self.scorecard.syntax_passed = syntax_ok
        self.scorecard.tests_total = total_tests
        self.scorecard.tests_passed = passed_tests
        self.scorecard.test_failures = failures
        self.scorecard.last_verified_at = datetime.now()
        
        score = 100
        if not syntax_ok:
            score -= 40
        if total_tests > 0:
            test_rate = (passed_tests / total_tests)
            score = int(score * test_rate)
        elif failures:
            score -= min(50, len(failures) * 20)
            
        self.scorecard.health_score = max(0, min(100, score))

    def format_memory_summary(self) -> str:
        """Format the memory into a concise, token-efficient architectural context card"""
        lines = ["=== 🧠 SHARED PROJECT MEMORY & ARCHITECTURE ==="]
        
        # 1. Tech Stack
        if self.tech_stack:
            stack_items = [f"{k}: {v}" for k, v in self.tech_stack.items()]
            lines.append("• Tech Stack: " + " | ".join(stack_items))
        
        # 2. Key Architectural Decisions
        if self.decisions:
            lines.append("• Architectural Decisions:")
            for d in self.decisions[-6:]:
                rat = f" (Rationale: {d.rationale})" if d.rationale else ""
                lines.append(f"  - [{d.topic}]: {d.decision}{rat}")
        
        # 3. Conventions & Rules
        if self.conventions:
            lines.append("• Core Conventions & Rules:")
            for c in self.conventions[-5:]:
                lines.append(f"  - [{c.category}]: {c.rule}")
        
        # 4. Environment Variables
        if self.environment_variables:
            lines.append("• Required Environment Variables:")
            for k, v in self.environment_variables.items():
                lines.append(f"  - {k}: {v}")
                
        # 5. Health Scorecard
        sc = self.scorecard
        status_icon = "🟢" if sc.health_score >= 80 else ("🟡" if sc.health_score >= 50 else "🔴")
        lines.append(f"• Health Score: {status_icon} {sc.health_score}% | Syntax: {'Valid' if sc.syntax_passed else 'Broken'}")
        if sc.test_failures:
            lines.append(f"  ⚠️ Unresolved Test Failures ({len(sc.test_failures)}): " + "; ".join(sc.test_failures[:3]))
            
        lines.append("================================================")
        return "\n".join(lines)
