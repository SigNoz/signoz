"""
overmind.py - The Overmind Agent.
Watches SigNoz (ClickHouse) for Worker failures.
Diagnoses root cause. Generates fixed prompts. Reruns tasks.
This is the "AI debugging AI" loop.
"""
import sys
import time
import json
import clickhouse_connect
from typing import Any, List, Optional

from langchain_core.language_models.llms import LLM

from config import (
    CLICKHOUSE_HOST,
    CLICKHOUSE_PORT,
    OTEL_ENDPOINT,
    OVERMIND_SERVICE_NAME,
    WORKER_SERVICE_NAME,
    OVERMIND_POLL_INTERVAL,
    MAX_RETRIES,
    FAILURE_LOOKBACK_MINUTES,
)
from telemetry import setup_telemetry


# ─── Overmind LLM (diagnoses failures) ──────────────────────────────────────
class OvermindLLM(LLM):
    """
    The Overmind's reasoning engine.
    Given a failed trace, it diagnoses the root cause and suggests a fix.
    """

    def _call(self, prompt: str, stop: Optional[List[str]] = None, **kwargs: Any) -> str:
        prompt_lower = prompt.lower()

        if "timeout" in prompt_lower or "timed out" in prompt_lower:
            return json.dumps({
                "diagnosis": "Database timeout detected. The tool 'fetch_user_data' failed because the database connection pool was exhausted or the query was too slow.",
                "root_cause": "INFRASTRUCTURE - Database overload",
                "fix_strategy": "RETRY_WITH_BACKOFF",
                "fixed_prompt": "Retry fetching user data. If the database is slow, wait 2 seconds and try again with a simpler query.",
                "confidence": 0.92,
            })

        elif "503" in prompt_lower or "unavailable" in prompt_lower:
            return json.dumps({
                "diagnosis": "Knowledge base API returned 503 Service Unavailable. The search service is temporarily down or under maintenance.",
                "root_cause": "INFRASTRUCTURE - Upstream service outage",
                "fix_strategy": "RETRY_AFTER_DELAY",
                "fixed_prompt": "The knowledge base was temporarily unavailable. Wait 5 seconds then retry the search query.",
                "confidence": 0.88,
            })

        elif "negative" in prompt_lower or "-$" in prompt_lower or "-999" in prompt_lower:
            return json.dumps({
                "diagnosis": "Billing calculation returned negative values, which is nonsensical. This is a data integrity issue — the billing tool returned corrupted data.",
                "root_cause": "DATA_INTEGRITY - Billing calculation bug",
                "fix_strategy": "SKIP_AND_ALERT",
                "fixed_prompt": "The billing calculation returned invalid data. Flag this for manual review and return an error to the user rather than showing incorrect billing.",
                "confidence": 0.95,
            })

        else:
            return json.dumps({
                "diagnosis": f"General failure detected in the agent execution pipeline.",
                "root_cause": "UNKNOWN",
                "fix_strategy": "RETRY_SIMPLE",
                "fixed_prompt": "Retry the original task with simplified instructions.",
                "confidence": 0.60,
            })

    @property
    def _llm_type(self) -> str:
        return "overmind-llm"


# ─── ClickHouse Queries ─────────────────────────────────────────────────────
def get_clickhouse_client():
    """Connect to ClickHouse using HTTP interface."""
    return clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        database="signoz_traces",
    )


def query_failed_traces(client, lookback_minutes: int = 5) -> list:
    """
    Find all failed spans from the Worker agent in the last N minutes.
    Returns list of dicts with traceID, error, prompt, etc.
    """
    query = f"""
    SELECT
        traceID,
        spanID,
        serviceName,
        name AS spanName,
        durationNano / 1000000 AS durationMs,
        statusCode,
        statusMessage
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE serviceName = '{WORKER_SERVICE_NAME}'
      AND statusCode = 2
      AND timestamp > now() - INTERVAL {lookback_minutes} MINUTE
    ORDER BY timestamp DESC
    LIMIT 20
    """
    try:
        result = client.query(query)
        rows = []
        for row in result.result_rows:
            rows.append({
                "traceID": row[0].hex() if isinstance(row[0], bytes) else str(row[0]),
                "spanID": row[1].hex() if isinstance(row[1], bytes) else str(row[1]),
                "serviceName": row[2],
                "spanName": row[3],
                "durationMs": row[4],
                "statusCode": row[5],
                "statusMessage": row[6],
            })
        return rows
    except Exception as e:
        print(f"[overmind] ClickHouse query failed: {e}")
        return []


def query_trace_details(client, trace_id: str) -> list:
    """Get all spans for a specific trace (the full execution tree)."""
    query = f"""
    SELECT
        spanID,
        parentSpanID,
        name,
        durationNano / 1000000 AS durationMs,
        statusCode,
        statusMessage
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE traceID = '{trace_id}'
    ORDER BY timestamp ASC
    """
    try:
        result = client.query(query)
        spans = []
        for row in result.result_rows:
            spans.append({
                "spanID": row[0].hex() if isinstance(row[0], bytes) else str(row[0]),
                "parentSpanID": row[1].hex() if isinstance(row[1], bytes) else str(row[1]),
                "name": row[2],
                "durationMs": row[3],
                "statusCode": row[4],
                "statusMessage": row[5],
            })
        return spans
    except Exception as e:
        print(f"[overmind] Failed to get trace details: {e}")
        return []


# ─── The Core Loop ──────────────────────────────────────────────────────────
def diagnose_and_heal(llm: LLM, tracer, failed_trace: dict, trace_details: list):
    """
    Given a failed trace, ask the Overmind LLM to diagnose and generate a fix.
    """
    with tracer.start_as_current_span(
        "overmind.diagnose",
        attributes={
            "failed.traceID": failed_trace["traceID"],
            "failed.spanName": failed_trace["spanName"],
            "failed.statusMessage": str(failed_trace.get("statusMessage", "")),
            "failed.durationMs": float(failed_trace.get("durationMs", 0)),
        }
    ) as span:
        # Build context for the LLM
        context = f"""
A Worker AI agent failed during execution.

Failed Span: {failed_trace['spanName']}
Error: {failed_trace.get('statusMessage', 'unknown')}
Duration: {failed_trace.get('durationMs', 0):.0f}ms
Trace ID: {failed_trace['traceID']}

Full execution tree ({len(trace_details)} spans):
"""
        for s in trace_details:
            status = "[OK]" if s["statusCode"] != 2 else "[ERR]"
            context += f"  [{status}] {s['name']} ({s['durationMs']:.0f}ms) {s.get('statusMessage', '')}\n"

        context += "\nDiagnose the root cause and provide a JSON fix."

        # Ask the Overmind LLM
        diagnosis_raw = llm.invoke(context)
        try:
            diagnosis = json.loads(diagnosis_raw)
        except json.JSONDecodeError:
            diagnosis = {"diagnosis": diagnosis_raw, "root_cause": "PARSE_ERROR", "confidence": 0.0}

        span.set_attribute("diagnosis.root_cause", diagnosis.get("root_cause", "unknown"))
        span.set_attribute("diagnosis.fix_strategy", diagnosis.get("fix_strategy", "unknown"))
        span.set_attribute("diagnosis.confidence", diagnosis.get("confidence", 0.0))
        span.set_attribute("diagnosis.fixed_prompt", diagnosis.get("fixed_prompt", ""))

        print(f"  [overmind] +-- DIAGNOSIS -----------------------------------")
        print(f"  [overmind] | Root Cause:    {diagnosis.get('root_cause', '?')}")
        print(f"  [overmind] | Strategy:      {diagnosis.get('fix_strategy', '?')}")
        print(f"  [overmind] | Confidence:    {diagnosis.get('confidence', 0):.0%}")
        print(f"  [overmind] | Fixed Prompt:  {diagnosis.get('fixed_prompt', '?')[:80]}")
        print(f"  [overmind] +---------------------------------------------")

        return diagnosis


def run_overmind_loop(cycles: int = 3):
    """
    The main Overmind loop.
    Polls ClickHouse for failures, diagnoses them, suggests fixes.
    """
    tracer = setup_telemetry(OVERMIND_SERVICE_NAME, OTEL_ENDPOINT)
    llm = OvermindLLM()

    print(f"\n[overmind] Connecting to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}...")
    client = get_clickhouse_client()

    for cycle in range(cycles):
        print(f"\n{'='*60}")
        print(f"[overmind] Cycle {cycle + 1}/{cycles} -- scanning for failures...")
        print(f"{'='*60}")

        with tracer.start_as_current_span(
            f"overmind.cycle.{cycle}",
            attributes={"cycle.number": cycle, "lookback_minutes": FAILURE_LOOKBACK_MINUTES}
        ) as cycle_span:
            # Query ClickHouse for failed traces
            failures = query_failed_traces(client, FAILURE_LOOKBACK_MINUTES)

            if not failures:
                print(f"[overmind] No failures found. All clear.")
                cycle_span.set_attribute("failures.count", 0)
            else:
                print(f"[overmind] Found {len(failures)} failed traces!")
                cycle_span.set_attribute("failures.count", len(failures))

                # Process each failure
                seen_traces = set()
                for failure in failures:
                    if failure["traceID"] in seen_traces:
                        continue
                    seen_traces.add(failure["traceID"])

                    print(f"\n[overmind] Analyzing trace {failure['traceID'][:16]}...")

                    # Get the full trace tree
                    details = query_trace_details(client, failure["traceID"])

                    # Diagnose and generate fix
                    diagnosis = diagnose_and_heal(llm, tracer, failure, details)

                    # Active Remediation (Closed-Loop Healing)
                    if diagnosis.get("fix_strategy") in ["RETRY_WITH_BACKOFF", "RETRY_AFTER_DELAY"]:
                        fixed_prompt = diagnosis.get("fixed_prompt", "Fetch user data for 'user_123'")
                        print(f"\n  [overmind -> worker] ⚡ [HEALING INTERVENTION] Executing active remediation...")
                        print(f"  [overmind -> worker] Applying backoff delay (2s)...")
                        time.sleep(2)

                        from worker import run_single_task, WorkerLLM
                        worker_llm = WorkerLLM()
                        healed_task = f"[HEALED] {fixed_prompt}"
                        healed_result = run_single_task(worker_llm, tracer, healed_task, task_id=999)
                        print(f"  [overmind -> worker] ✅ [REMEDIATION COMPLETE] Status: {healed_result.get('status')}")

        if cycle < cycles - 1:
            print(f"\n[overmind] Sleeping {OVERMIND_POLL_INTERVAL}s before next cycle...")
            time.sleep(OVERMIND_POLL_INTERVAL)

    # Flush traces
    time.sleep(3)
    print(f"\n[overmind] Done. All diagnoses sent to SigNoz as traces.")


def main():
    cycles = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    run_overmind_loop(cycles=cycles)


if __name__ == "__main__":
    main()
