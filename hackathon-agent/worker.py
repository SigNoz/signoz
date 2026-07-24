"""
worker.py - The Worker Agent.
Receives tasks, uses tools, sends everything to SigNoz via OpenTelemetry.
Designed to fail sometimes — that's the whole point.
The Overmind watches these failures and fixes them.
"""
import sys
import time
import random
import traceback
from typing import Any, List, Optional

from langchain_core.language_models.llms import LLM

from config import (
    OTEL_ENDPOINT,
    WORKER_SERVICE_NAME,
)
from telemetry import setup_telemetry
from tools import fetch_user_data, search_knowledge_base, calculate_billing


# ─── FakeLLM that simulates realistic agent reasoning ───────────────────────
class WorkerLLM(LLM):
    """
    A mock LLM that simulates ReAct-style reasoning.
    Uses the tools by name. Sometimes hallucinates.
    We use this instead of real OpenAI to avoid quota limits during dev.
    Swap to ChatOpenAI for the final demo recording.
    """

    def _call(self, prompt: str, stop: Optional[List[str]] = None, **kwargs: Any) -> str:
        prompt_lower = prompt.lower()

        if "user" in prompt_lower and ("status" in prompt_lower or "fetch" in prompt_lower or "data" in prompt_lower):
            user_id = "user_123"
            for word in prompt.split():
                if word.startswith("'") and word.endswith("'"):
                    user_id = word.strip("'")
                    break
            result = fetch_user_data(user_id)
            return f"I used the FetchUserData tool. Result: {result}"

        elif "search" in prompt_lower or "knowledge" in prompt_lower or "docs" in prompt_lower:
            result = search_knowledge_base(prompt[:50])
            return f"I searched the knowledge base. Result: {result}"

        elif "billing" in prompt_lower or "invoice" in prompt_lower or "cost" in prompt_lower:
            account_id = "ACC-" + str(random.randint(1000, 9999))
            result = calculate_billing(account_id)
            return f"I calculated billing. Result: {result}"

        else:
            return f"I analyzed the request: '{prompt[:80]}'. Based on my knowledge, the answer is: This is a general inquiry that has been processed successfully."

    @property
    def _llm_type(self) -> str:
        return "worker-llm"


# ─── Task definitions ───────────────────────────────────────────────────────
TASKS = [
    "What is the status of user 'user_123'? Fetch their data.",
    "Search the knowledge base for 'how to reset password'",
    "Calculate the billing for the enterprise account",
    "What is the status of user 'error_user'? Fetch their data.",
    "Search docs for 'refund policy for cancelled subscriptions'",
    "What is the billing cost for the current month?",
    "Fetch user data for 'vip_customer_42'",
    "Search knowledge base for 'API rate limit documentation'",
]


def run_single_task(llm: LLM, tracer, task: str, task_id: int) -> dict:
    """
    Run a single task with full tracing.
    Returns a dict with task_id, task, status, result/error.
    """
    with tracer.start_as_current_span(
        f"worker.task.{task_id}",
        attributes={
            "task.id": task_id,
            "task.input": task,
            "worker.version": "1.0.0",
        }
    ) as span:
        print(f"\n{'='*60}")
        print(f"[worker] Task {task_id}: {task}")
        print(f"{'='*60}")

        try:
            start = time.time()
            response = llm.invoke(task)
            duration = time.time() - start

            span.set_attribute("task.output", str(response)[:500])
            span.set_attribute("task.duration_ms", int(duration * 1000))
            span.set_attribute("task.status", "success")

            print(f"[worker] [OK] Success ({duration:.2f}s): {str(response)[:100]}")
            return {"task_id": task_id, "task": task, "status": "success", "result": str(response)}

        except Exception as e:
            duration = time.time() - start
            error_msg = f"{type(e).__name__}: {str(e)}"

            span.set_attribute("task.status", "error")
            span.set_attribute("task.error", error_msg)
            span.set_attribute("task.duration_ms", int(duration * 1000))
            span.set_status(trace_status_error(error_msg))
            span.record_exception(e)

            print(f"[worker] [FAIL] FAILED ({duration:.2f}s): {error_msg}")
            return {"task_id": task_id, "task": task, "status": "error", "error": error_msg}


def trace_status_error(description: str):
    """Create an OTel error status."""
    from opentelemetry.trace import StatusCode, Status
    return Status(StatusCode.ERROR, description)


def main():
    # Step 1: Setup telemetry
    tracer = setup_telemetry(WORKER_SERVICE_NAME, OTEL_ENDPOINT)
    llm = WorkerLLM()

    # Step 2: Run tasks
    num_tasks = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    tasks_to_run = [random.choice(TASKS) for _ in range(num_tasks)]

    print(f"\n[worker] Starting {num_tasks} tasks...")
    results = []

    for i, task in enumerate(tasks_to_run):
        result = run_single_task(llm, tracer, task, task_id=i)
        results.append(result)
        time.sleep(0.5)  # small gap between tasks

    # Step 3: Summary
    successes = sum(1 for r in results if r["status"] == "success")
    failures = sum(1 for r in results if r["status"] == "error")

    print(f"\n{'='*60}")
    print(f"[worker] DONE: {successes} succeeded, {failures} failed out of {num_tasks}")
    print(f"{'='*60}")

    # Give the batch exporter time to flush
    time.sleep(3)
    print("[worker] Traces flushed to SigNoz.")


if __name__ == "__main__":
    main()
