from typing import List, Dict, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel, Field

try:
    from models.project_state import Task, TaskStatus, AgentRole
except ImportError:
    from .project_state import Task, TaskStatus, AgentRole


class TaskGraph(BaseModel):
    """
    Dynamic Directed Task Graph for multi-agent workflows.
    Manages task dependencies, readiness, active executions, and self-healing retries.
    """
    tasks: List[Task] = Field(default_factory=list)

    def add_task(self, task: Task) -> Task:
        """Add a single task to the graph"""
        self.tasks.append(task)
        return task

    def add_tasks(self, new_tasks: List[Task]) -> List[Task]:
        """Add multiple tasks to the graph"""
        for t in new_tasks:
            self.tasks.append(t)
        return self.tasks

    def get_task(self, task_id: str) -> Optional[Task]:
        """Find task by ID"""
        for t in self.tasks:
            if t.id == task_id:
                return t
        return None

    def get_completed_task_ids(self) -> set:
        """Get set of task IDs that are completed"""
        return {t.id for t in self.tasks if t.status == TaskStatus.COMPLETED}

    def get_ready_tasks(self) -> List[Task]:
        """
        Return tasks whose dependencies are ALL completed, and whose status is PENDING.
        If a dependency failed, marks the task as BLOCKED.
        """
        completed_ids = self.get_completed_task_ids()
        failed_ids = {t.id for t in self.tasks if t.status == TaskStatus.FAILED}
        ready: List[Task] = []

        for task in self.tasks:
            if task.status == TaskStatus.PENDING or task.status == TaskStatus.BLOCKED:
                # Check if blocked by any failed dependency
                if any(dep_id in failed_ids for dep_id in task.dependencies):
                    task.status = TaskStatus.BLOCKED
                    continue

                # Check if all dependencies are satisfied
                if all(dep_id in completed_ids for dep_id in task.dependencies):
                    task.status = TaskStatus.PENDING
                    ready.append(task)
                else:
                    task.status = TaskStatus.BLOCKED

        return ready

    def get_active_task(self) -> Optional[Task]:
        """Return the task currently in progress"""
        for t in self.tasks:
            if t.status == TaskStatus.IN_PROGRESS:
                return t
        return None

    def start_next_task(self) -> Optional[Task]:
        """
        If a task is already active, return it.
        Otherwise, find the first ready task and set it to IN_PROGRESS.
        """
        active = self.get_active_task()
        if active:
            return active

        ready = self.get_ready_tasks()
        if ready:
            next_task = ready[0]
            next_task.status = TaskStatus.IN_PROGRESS
            return next_task
        return None

    def mark_completed(self, task_id: str, artifacts: Optional[List[str]] = None) -> Optional[Task]:
        """Mark a task as completed and record any produced artifacts"""
        task = self.get_task(task_id)
        if task:
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            if artifacts:
                for art in artifacts:
                    if art not in task.artifacts:
                        task.artifacts.append(art)
            # Re-evaluate any blocked tasks that might now be ready
            self.get_ready_tasks()
            return task
        return None

    def mark_failed(self, task_id: str, reason: str, auto_retry: bool = True) -> bool:
        """
        Record failure reason.
        If auto_retry and retry_count < max_retries, increment count and keep in progress.
        Otherwise mark as FAILED and block dependents.
        Returns True if eligible for retry, False if permanently failed.
        """
        task = self.get_task(task_id)
        if not task:
            return False

        task.failure_reason = reason
        if auto_retry and task.retry_count < task.max_retries:
            task.retry_count += 1
            task.status = TaskStatus.IN_PROGRESS
            return True
        else:
            task.status = TaskStatus.FAILED
            # Re-evaluate dependencies so dependents get marked BLOCKED
            self.get_ready_tasks()
            return False

    def all_completed(self) -> bool:
        """Return True if tasks exist and all are completed"""
        if not self.tasks:
            return False
        return all(t.status == TaskStatus.COMPLETED for t in self.tasks)

    def has_failed(self) -> bool:
        """Return True if any task permanently failed"""
        return any(t.status == TaskStatus.FAILED for t in self.tasks)

    def get_progress(self) -> Dict:
        """Return detailed progress metrics"""
        total = len(self.tasks)
        if total == 0:
            return {
                "total": 0, "completed": 0, "in_progress": 0,
                "pending": 0, "failed": 0, "blocked": 0, "percent": 0.0
            }
        completed = sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETED)
        in_prog = sum(1 for t in self.tasks if t.status == TaskStatus.IN_PROGRESS)
        failed = sum(1 for t in self.tasks if t.status == TaskStatus.FAILED)
        blocked = sum(1 for t in self.tasks if t.status == TaskStatus.BLOCKED)
        pending = sum(1 for t in self.tasks if t.status == TaskStatus.PENDING)
        percent = round((completed / total) * 100, 1)

        return {
            "total": total,
            "completed": completed,
            "in_progress": in_prog,
            "pending": pending,
            "failed": failed,
            "blocked": blocked,
            "percent": percent
        }

    def format_graph_summary(self) -> str:
        """Format the task graph into an easy-to-read summary for agent prompt context"""
        if not self.tasks:
            return "No structured tasks registered yet."

        prog = self.get_progress()
        lines = [
            f"**Sprint Progress:** {prog['completed']}/{prog['total']} tasks completed ({prog['percent']}%)",
            ""
        ]

        for i, t in enumerate(self.tasks, 1):
            assigned = getattr(t.assigned_to, "value", str(t.assigned_to))
            status_symbol = {
                TaskStatus.COMPLETED: "[x]",
                TaskStatus.IN_PROGRESS: "[>]",
                TaskStatus.PENDING: "[ ]",
                TaskStatus.BLOCKED: "[-]",
                TaskStatus.FAILED: "[!]"
            }.get(t.status, "[ ]")

            extra = ""
            if t.status == TaskStatus.IN_PROGRESS and t.retry_count > 0:
                extra = f" (Self-Healing Retry {t.retry_count}/{t.max_retries})"
            elif t.status == TaskStatus.BLOCKED:
                extra = " (Waiting for dependencies)"
            elif t.status == TaskStatus.FAILED and t.failure_reason:
                extra = f" (Failed: {t.failure_reason[:60]}...)"

            lines.append(f"{status_symbol} Task #{i}: {t.title} [Owner: {assigned}] [{t.status.value.upper()}{extra}]")
            if t.description:
                lines.append(f"    Description: {t.description}")
            if t.artifacts:
                lines.append(f"    Artifacts: {', '.join(t.artifacts)}")

        return "\n".join(lines)
