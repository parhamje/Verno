from enum import Enum
from typing import Dict, Optional, Tuple, List
import re

try:
    from models.project_state import AgentRole
except ImportError:
    from ..models.project_state import AgentRole


class IntentType(str, Enum):
    NEW_FEATURE_OR_PROJECT = "new_feature_or_project"
    BUG_FIX_OR_CODE_EDIT = "bug_fix_or_code_edit"
    TESTING_OR_QA = "testing_or_qa"
    DEVOPS_OR_DEPLOYMENT = "devops_or_deployment"
    QUESTION_OR_CHAT = "question_or_chat"


class IntentRoutingResult:
    def __init__(
        self,
        intent: IntentType,
        target_agent: AgentRole,
        target_phase: str,
        fast_track: bool,
        suggested_task_title: Optional[str] = None,
        rationale: str = ""
    ):
        self.intent = intent
        self.target_agent = target_agent
        self.target_phase = target_phase
        self.fast_track = fast_track
        self.suggested_task_title = suggested_task_title
        self.rationale = rationale

    def to_dict(self) -> Dict:
        return {
            "intent": self.intent.value,
            "target_agent": self.target_agent.value,
            "target_phase": self.target_phase,
            "fast_track": self.fast_track,
            "suggested_task_title": self.suggested_task_title,
            "rationale": self.rationale
        }


class IntentRouter:
    """
    Intelligent Intent Classifier and Dynamic Router for Verno.
    Directs tasks and user prompts to the best-suited agent without unnecessary rigid pipeline loops.
    """

    BUG_KEYWORDS = [
        "fix", "bug", "error", "typo", "broken", "issue", "crash", "fails", "traceback",
        "patch", "refactor", "correct", "wrong", "change color", "style issue",
        "باگ", "ارور", "خطا", "اصلاح", "درست کن", "رفع باگ", "تعمیر", "تغییر بده", "حل کن"
    ]

    QA_KEYWORDS = [
        "test", "tests", "unit test", "unittest", "pytest", "jest", "qa", "verify",
        "coverage", "assertion", "benchmark", "validation",
        "تست", "تست کن", "بررسی کن", "تست بنویس", "آزمایش", "وریفای"
    ]

    DEVOPS_KEYWORDS = [
        "deploy", "docker", "dockerfile", "container", "run command", "how to run",
        "npm start", "build", "ci/cd", "pipeline", "release", "github pages", "production",
        "دیپلوی", "ران کن", "چطور اجرا کنم", "دستور اجرا", "داکر", "کانفیگ", "نصب"
    ]

    QUESTION_KEYWORDS = [
        "what is", "how does", "explain", "tell me about", "why does", "what does",
        "difference between", "help me understand",
        "توضیح بده", "چجوری کار میکنه", "معنی", "چرا", "یعنی چی", "چطور"
    ]

    @classmethod
    def classify_intent(cls, prompt: str, has_existing_files: bool = False) -> IntentRoutingResult:
        """
        Classifies user prompt intent and returns target agent & phase.
        """
        text = prompt.strip().lower()

        # 1. Bug fix or direct code modification on existing code
        if any(kw in text for kw in cls.BUG_KEYWORDS):
            title = cls._extract_title(prompt, "Quick Fix / Code Adjustment")
            return IntentRoutingResult(
                intent=IntentType.BUG_FIX_OR_CODE_EDIT,
                target_agent=AgentRole.DEVELOPER,
                target_phase="development",
                fast_track=True,
                suggested_task_title=title,
                rationale="Identified targeted bug fix or code adjustment. Fast-tracking directly to Developer Agent."
            )

        # 2. Testing / QA Request
        if any(kw in text for kw in cls.QA_KEYWORDS) and not any(w in text for w in ["create", "build", "بساز"]):
            title = cls._extract_title(prompt, "QA & Test Verification")
            return IntentRoutingResult(
                intent=IntentType.TESTING_OR_QA,
                target_agent=AgentRole.QA_TESTER,
                target_phase="testing",
                fast_track=True,
                suggested_task_title=title,
                rationale="Identified testing or quality verification request. Fast-tracking to QA Tester Agent."
            )

        # 3. DevOps / Deployment Request
        if any(kw in text for kw in cls.DEVOPS_KEYWORDS) and not any(w in text for w in ["create", "build", "بساز"]):
            title = cls._extract_title(prompt, "DevOps & Environment Setup")
            return IntentRoutingResult(
                intent=IntentType.DEVOPS_OR_DEPLOYMENT,
                target_agent=AgentRole.DEVOPS,
                target_phase="deployment",
                fast_track=True,
                suggested_task_title=title,
                rationale="Identified deployment or runtime configuration request. Fast-tracking to DevOps Agent."
            )

        # 4. Pure Question / Explanation
        if any(kw in text for kw in cls.QUESTION_KEYWORDS) and len(text.split()) < 35:
            return IntentRoutingResult(
                intent=IntentType.QUESTION_OR_CHAT,
                target_agent=AgentRole.DEVELOPER if has_existing_files else AgentRole.PROJECT_MANAGER,
                target_phase="chat",
                fast_track=True,
                suggested_task_title=None,
                rationale="Identified technical query or question without workspace modifications required."
            )

        # 5. Full Project or major feature (default for comprehensive prompts)
        return IntentRoutingResult(
            intent=IntentType.NEW_FEATURE_OR_PROJECT,
            target_agent=AgentRole.PROJECT_MANAGER,
            target_phase="planning",
            fast_track=False,
            suggested_task_title=None,
            rationale="Identified new project or multi-step feature requirement. Initiating PM planning & DAG decomposition."
        )

    @staticmethod
    def _extract_title(prompt: str, fallback: str) -> str:
        first_line = prompt.strip().split("\n")[0].strip()
        if len(first_line) > 60:
            return first_line[:57] + "..."
        return first_line if first_line else fallback
