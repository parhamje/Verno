import os
import sys
import json
import re
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple

try:
    from models.project_state import ProjectState, TaskStatus, AgentRole
    from models.project_memory import QualityScorecard
except ImportError:
    from ..models.project_state import ProjectState, TaskStatus, AgentRole
    from ..models.project_memory import QualityScorecard


class EvaluationResult:
    """Detailed evaluation result and Definition of Done verification report"""
    def __init__(
        self,
        passed: bool,
        health_score: int,
        criteria: Dict[str, Dict],
        summary: str,
        failures: List[str],
        remediation_agent: Optional[AgentRole] = None
    ):
        self.passed = passed
        self.health_score = health_score
        self.criteria = criteria
        self.summary = summary
        self.failures = failures
        self.remediation_agent = remediation_agent

    def to_dict(self) -> Dict:
        return {
            "passed": self.passed,
            "health_score": self.health_score,
            "criteria": self.criteria,
            "summary": self.summary,
            "failures": self.failures,
            "remediation_agent": self.remediation_agent.value if self.remediation_agent else None
        }


class EvaluationService:
    """
    Automated Definition of Done (DoD) & Solution Evaluation Engine for Verno.
    Acts as an autonomous engineering gatekeeper, validating syntax, tests,
    security hygiene, environment setup, and task graph completion before release.
    """

    SECRET_PATTERNS = [
        (re.compile(r"sk-[a-zA-Z0-9]{20,}"), "OpenAI API Key"),
        (re.compile(r"sk-ant-[a-zA-Z0-9_-]{20,}"), "Anthropic API Key"),
        (re.compile(r"AIza[0-9A-Za-z-_]{35}"), "Google Cloud / Gemini API Key"),
        (re.compile(r"ghp_[0-9a-zA-Z]{36}"), "GitHub Personal Access Token"),
        (re.compile(r"(?:api_key|apikey|secret_key|password)\s*=\s*['\"][a-zA-Z0-9_\-]{16,}['\"]", re.IGNORECASE), "Hardcoded Secret / Credential")
    ]

    @classmethod
    async def evaluate_project(cls, project: ProjectState) -> EvaluationResult:
        """
        Run the complete Definition of Done (DoD) and Quality evaluation on a project workspace.
        """
        failures = []
        criteria = {}

        # 1. Task Graph Completeness Check
        task_check = cls._check_tasks(project)
        criteria["tasks_completion"] = task_check
        if not task_check["passed"]:
            failures.extend(task_check["failures"])

        # 2. Syntax & Compilation Check
        syntax_check = await cls._check_syntax(project)
        criteria["syntax_integrity"] = syntax_check
        if not syntax_check["passed"]:
            failures.extend(syntax_check["failures"])

        # 3. Automated Test Suite Check
        test_check = await cls._run_test_suite(project)
        criteria["test_suite"] = test_check
        if not test_check["passed"]:
            failures.extend(test_check["failures"])

        # 4. Security & Hygiene Check (Leaked Secrets / Keys)
        security_check = cls._check_security(project)
        criteria["security_hygiene"] = security_check
        if not security_check["passed"]:
            failures.extend(security_check["failures"])

        # 5. Environment & Documentation Check
        env_check = cls._check_environment(project)
        criteria["environment_docs"] = env_check
        if not env_check["passed"]:
            failures.extend(env_check["failures"])

        # Calculate Overall Health Score (0 - 100)
        # Weights: Syntax 35%, Tests 30%, Tasks 20%, Security 15%
        if not task_check["passed"] and task_check.get("total", 0) == 0:
            health_score = 0
        elif not syntax_check["passed"] and syntax_check.get("checked_count", 0) == 0:
            health_score = 0
        else:
            score = 0
            score += int(task_check["score"] * 0.20)
            score += int(syntax_check["score"] * 0.35)
            score += int(test_check["score"] * 0.30)
            score += int(security_check["score"] * 0.15)
            health_score = max(0, min(100, score))

        # Definition of Done Pass Condition:
        # All syntax valid, no security leaks, all tasks completed, tests passed
        dod_passed = (
            syntax_check["passed"]
            and security_check["passed"]
            and task_check["passed"]
            and (test_check["passed"] if test_check["tests_total"] > 0 else True)
        )

        remediation_agent = None
        if not dod_passed:
            if not syntax_check["passed"] or not security_check["passed"]:
                remediation_agent = AgentRole.DEVELOPER
            elif not test_check["passed"]:
                remediation_agent = AgentRole.DEVELOPER
            elif not task_check["passed"]:
                remediation_agent = AgentRole.DEVELOPER

        summary = cls._generate_summary(dod_passed, health_score, criteria, failures)

        # Update ProjectMemory Scorecard
        project.memory.scorecard.syntax_passed = syntax_check["passed"]
        project.memory.scorecard.tests_total = test_check["tests_total"]
        project.memory.scorecard.tests_passed = test_check["tests_passed"]
        project.memory.scorecard.test_failures = test_check["failures"]
        project.memory.scorecard.security_passed = security_check["passed"]
        project.memory.scorecard.security_issues = security_check["issues"]
        project.memory.scorecard.dod_passed = dod_passed
        project.memory.scorecard.criteria_breakdown = criteria
        project.memory.scorecard.health_score = health_score
        project.memory.scorecard.last_verified_at = datetime.now()

        return EvaluationResult(
            passed=dod_passed,
            health_score=health_score,
            criteria=criteria,
            summary=summary,
            failures=failures,
            remediation_agent=remediation_agent
        )

    @classmethod
    def _check_tasks(cls, project: ProjectState) -> Dict:
        """Verify that all tasks in the project task graph are finished"""
        tasks = project.tasks
        if not tasks:
            return {
                "passed": False,
                "score": 0,
                "total": 0,
                "completed": 0,
                "failures": ["No sprint tasks registered in the project task graph"]
            }

        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        failed_tasks = [t for t in tasks if t.status == TaskStatus.FAILED]
        pending_tasks = [t for t in tasks if t.status in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]]

        failures = []
        for t in failed_tasks:
            failures.append(f"Task '{t.title}' is in FAILED state: {t.failure_reason or 'Unresolved error'}")
        for t in pending_tasks:
            failures.append(f"Task '{t.title}' is not completed ({t.status.value})")

        passed = (completed == total) and not failed_tasks and total > 0
        score = int((completed / total) * 100) if total > 0 else 0

        return {
            "passed": passed,
            "score": score,
            "total": total,
            "completed": completed,
            "failures": failures
        }

    @classmethod
    async def _check_syntax(cls, project: ProjectState) -> Dict:
        """Run syntax compilation on all Python, JavaScript, JSON, HTML, and CSS workspace files"""
        failures = []
        checked_count = 0

        # Scan workspace files from disk or project state
        files_to_check = []
        if os.path.exists(project.project_directory):
            for root, _, files in os.walk(project.project_directory):
                # Ignore .git, node_modules, __pycache__, .venv
                if any(ignored in root for ignored in [".git", "node_modules", "__pycache__", ".venv", ".pytest_cache"]):
                    continue
                for f in files:
                    rel_path = os.path.relpath(os.path.join(root, f), project.project_directory).replace("\\", "/")
                    files_to_check.append(rel_path)
        else:
            files_to_check = list(project.files.keys())

        if not files_to_check and not project.files:
            return {
                "passed": False,
                "score": 0,
                "checked_count": 0,
                "failures": ["No deliverable source files generated in project workspace"]
            }

        for rel_path in files_to_check:
            full_path = os.path.join(project.project_directory, rel_path)
            content = None
            if os.path.exists(full_path):
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                except Exception:
                    pass
            elif rel_path in project.files:
                content = project.files[rel_path]

            if content is None:
                continue

            # Python Check
            if rel_path.endswith(".py"):
                checked_count += 1
                try:
                    proc = await asyncio.create_subprocess_exec(
                        sys.executable, "-m", "py_compile", full_path,
                        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    _, err = await asyncio.wait_for(proc.communicate(), timeout=5.0)
                    if proc.returncode != 0 and err:
                        failures.append(f"Python Syntax Error in {rel_path}:\n{err.decode('utf-8', errors='replace').strip()}")
                except Exception:
                    pass

            # JavaScript Check
            elif rel_path.endswith(".js"):
                checked_count += 1
                try:
                    proc = await asyncio.create_subprocess_exec(
                        "node", "--check", full_path,
                        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    _, err = await asyncio.wait_for(proc.communicate(), timeout=5.0)
                    if proc.returncode != 0 and err:
                        failures.append(f"JavaScript Syntax Error in {rel_path}:\n{err.decode('utf-8', errors='replace').strip()}")
                except Exception:
                    pass

            # JSON Check
            elif rel_path.endswith(".json"):
                checked_count += 1
                try:
                    json.loads(content)
                except Exception as je:
                    failures.append(f"JSON Syntax Error in {rel_path}: {str(je)}")

            # HTML Check (basic tag and structure validation)
            elif rel_path.endswith(".html"):
                checked_count += 1
                if not content.strip():
                    failures.append(f"HTML Empty File in {rel_path}")
                elif "<html" in content.lower() and "</html>" not in content.lower():
                    failures.append(f"HTML Syntax Error in {rel_path}: Unclosed <html> tag")

            # CSS Check (brace balance)
            elif rel_path.endswith(".css"):
                checked_count += 1
                if content.count("{") != content.count("}"):
                    failures.append(f"CSS Syntax Error in {rel_path}: Mismatched braces ({{ {content.count('{')} vs }} {content.count('}')})")

            else:
                checked_count += 1

        passed = len(failures) == 0 and len(files_to_check) > 0
        score = 100 if passed else max(0, 100 - (len(failures) * 35))
        return {
            "passed": passed,
            "score": score,
            "checked_count": checked_count,
            "failures": failures
        }

    @classmethod
    async def _run_test_suite(cls, project: ProjectState) -> Dict:
        """Discover and execute unit tests in the workspace"""
        failures = []
        tests_total = 0
        tests_passed = 0

        test_files = []
        if os.path.exists(project.project_directory):
            for root, _, files in os.walk(project.project_directory):
                if any(ignored in root for ignored in [".git", "node_modules", "__pycache__", ".venv"]):
                    continue
                for f in files:
                    if f.startswith("test_") or f.endswith("_test.py"):
                        test_files.append(os.path.join(root, f))

        if not test_files:
            return {
                "passed": True,
                "score": 100,
                "tests_total": 0,
                "tests_passed": 0,
                "has_tests": False,
                "failures": []
            }

        for test_file in test_files:
            rel = os.path.relpath(test_file, project.project_directory)
            tests_total += 1
            try:
                proc = await asyncio.create_subprocess_exec(
                    sys.executable, "-m", "unittest", test_file,
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                    cwd=project.project_directory
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
                if proc.returncode == 0:
                    tests_passed += 1
                else:
                    err_msg = (stderr or stdout).decode("utf-8", errors="replace").strip()
                    failures.append(f"Test failure in {rel}:\n{err_msg[:250]}")
            except Exception as e:
                failures.append(f"Execution error running test {rel}: {str(e)}")

        passed = (tests_passed == tests_total)
        score = int((tests_passed / tests_total) * 100) if tests_total > 0 else 100

        return {
            "passed": passed,
            "score": score,
            "tests_total": tests_total,
            "tests_passed": tests_passed,
            "has_tests": True,
            "failures": failures
        }

    @classmethod
    def _check_security(cls, project: ProjectState) -> Dict:
        """Scan project files for hardcoded secrets, plain API tokens, or leaked credentials"""
        issues = []
        if os.path.exists(project.project_directory):
            for root, _, files in os.walk(project.project_directory):
                if any(ignored in root for ignored in [".git", "node_modules", "__pycache__", ".venv"]):
                    continue
                for f in files:
                    if f.endswith((".py", ".js", ".ts", ".json", ".env", ".html")):
                        full_path = os.path.join(root, f)
                        rel_path = os.path.relpath(full_path, project.project_directory)
                        try:
                            with open(full_path, "r", encoding="utf-8", errors="ignore") as file_handle:
                                content = file_handle.read()
                                for pattern, desc in cls.SECRET_PATTERNS:
                                    if pattern.search(content):
                                        issues.append(f"Security Alert in {rel_path}: Potential {desc} found hardcoded.")
                        except Exception:
                            pass

        passed = len(issues) == 0
        score = 100 if passed else max(0, 100 - (len(issues) * 40))

        return {
            "passed": passed,
            "score": score,
            "issues": issues,
            "failures": issues
        }

    @classmethod
    def _check_environment(cls, project: ProjectState) -> Dict:
        """Check if registered environment variables are documented"""
        env_vars = project.memory.environment_variables
        if not env_vars:
            return {"passed": True, "score": 100, "failures": []}

        env_example_path = os.path.join(project.project_directory, ".env.example")
        has_example = os.path.exists(env_example_path)

        failures = []
        if not has_example and len(env_vars) > 0:
            failures.append(f"Missing .env.example: Project requires {len(env_vars)} environment variable(s) but no template file was created.")

        passed = len(failures) == 0
        score = 100 if passed else 75
        return {
            "passed": passed,
            "score": score,
            "required_vars": list(env_vars.keys()),
            "failures": failures
        }

    @classmethod
    def _generate_summary(cls, passed: bool, health_score: int, criteria: Dict[str, Dict], failures: List[str]) -> str:
        """Format an evaluation report for chat and UI presentation"""
        status_banner = "✅ **DEFINITION OF DONE: APPROVED**" if passed else "⚠️ **DEFINITION OF DONE: REJECTED (REMEDIATION REQUIRED)**"

        syntax_crit = criteria.get("syntax_integrity", {})
        tasks_crit = criteria.get("tasks_completion", {})
        tests_crit = criteria.get("test_suite", {})
        sec_crit = criteria.get("security_hygiene", {})
        env_crit = criteria.get("environment_docs", {})

        syntax_str = "🟢 100%" if syntax_crit.get("passed") else f"🔴 {syntax_crit.get('score', 0)}%"
        tasks_str = "🟢 100%" if tasks_crit.get("passed") else f"🟡 {tasks_crit.get('score', 0)}%"
        
        if tests_crit.get("passed"):
            tests_str = "🟢 All Passed"
        elif not tests_crit.get("has_tests"):
            tests_str = "🟡 No tests defined"
        else:
            tests_str = f"🔴 {tests_crit.get('tests_passed', 0)}/{tests_crit.get('tests_total', 0)} passed"

        sec_issues = sec_crit.get("issues", [])
        sec_str = "🟢 Clean" if sec_crit.get("passed") else f"🔴 Flagged ({len(sec_issues)} issues)"
        env_str = "🟢 Documented" if env_crit.get("passed") else "🟡 Missing .env.example"

        lines = [
            status_banner,
            f"**Overall Quality Health Score:** {health_score}%",
            "",
            "### Quality Gatekeeper Breakdown:",
            f"- **Syntax & Build Integrity:** {syntax_str}",
            f"- **Sprint Task Completion:** {tasks_str}",
            f"- **Test Suite:** {tests_str}",
            f"- **Security & Secrets Hygiene:** {sec_str}",
            f"- **Environment & Config:** {env_str}"
        ]

        if failures:
            lines.append("\n**Open Blocking Issues:**")
            for f in failures[:5]:
                lines.append(f"• {f}")

        return "\n".join(lines)
