# Technical Requirements Document (TRD)
# Project: Autonomous Neural Optimizer (ANO)
# Hackathon: Agents of SigNoz

---

## 1. System Overview

The Autonomous Neural Optimizer consists of three core subsystems connected in a closed feedback loop:

```
┌─────────────┐    OTel Traces     ┌─────────────┐    SQL Queries    ┌─────────────┐
│   WORKER    │ ─────────────────► │   SigNoz    │ ◄──────────────── │  OVERMIND   │
│   Agent     │                    │ (ClickHouse │                    │   Agent     │
│ (LangChain) │ ◄───────────────── │  + OTel     │ ──────────────► │ (Supervisor)│
│             │   Fixed Prompts    │  Collector) │   Alert Webhooks  │             │
└─────────────┘                    └─────────────┘                    └─────────────┘
```

---

## 2. Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Worker Agent | Python + LangChain | Python 3.12, LangChain 0.3.x | Autonomous task execution |
| Overmind Agent | Python + LangChain | Python 3.12, LangChain 0.3.x | Failure analysis & self-healing |
| LLM Provider | OpenAI GPT-3.5-turbo / FakeLLM | Latest | Language model for agent reasoning |
| Telemetry SDK | OpenTelemetry Python | 1.25+ | Trace instrumentation |
| Telemetry Bridge | OpenInference (LangChain) | 0.1.x | Auto-instrument LangChain spans |
| Trace Collector | SigNoz OTel Collector | v0.142.0 | Receives OTLP traces over gRPC |
| Trace Storage | ClickHouse | 25.12.5 | Stores all trace data |
| Observability UI | SigNoz Frontend | Latest (Vite dev) | Visual trace exploration |
| Backend API | SigNoz Go Backend | Latest (enterprise) | API server for frontend |
| Orchestration | Docker Compose | Latest | Runs ClickHouse, Postgres, ZooKeeper, OTel Collector |

---

## 3. Component Specifications

### 3.1 Worker Agent (`agent.py`)

**Responsibility:** Execute autonomous tasks, fail realistically, stream traces to SigNoz.

**Technical Details:**
- **Runtime:** Python 3.12 (Miniconda)
- **Framework:** LangChain with `ChatOpenAI` or custom `FakeLLM`
- **Instrumentation:** `LangChainInstrumentor` from `openinference.instrumentation.langchain`
- **OTLP Export:** gRPC to `127.0.0.1:4317` via `OTLPSpanExporter`
- **Service Name:** `hackathon-ai-worker`

**Trace Attributes Emitted:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `llm.model_name` | string | Model used (e.g., `gpt-3.5-turbo`) |
| `llm.token_count.prompt` | int | Input tokens consumed |
| `llm.token_count.completion` | int | Output tokens consumed |
| `llm.token_count.total` | int | Total tokens |
| `input.value` | string | The exact prompt sent to the LLM |
| `output.value` | string | The LLM's response |
| `tool.name` | string | Name of the tool invoked |
| `tool.parameters` | string | Parameters passed to the tool |
| `status_code` | string | `OK` or `ERROR` |
| `error.message` | string | Exception message if failed |

**Failure Injection:**
- Random `DatabaseTimeout` exceptions on tool calls (30% probability)
- Simulated hallucination responses (returns nonsensical data)
- API rate limit simulation (429 errors)

---

### 3.2 Overmind Agent (`overmind.py`)

**Responsibility:** Query SigNoz for failed traces, diagnose root cause, generate corrective prompts, restart Workers.

**Technical Details:**
- **Runtime:** Python 3.12 (Miniconda)
- **ClickHouse Client:** `clickhouse-connect` Python library
- **Connection:** `tcp://127.0.0.1:9000` (direct ClickHouse access)
- **Service Name:** `hackathon-ai-overmind`

**Core SQL Queries:**

```sql
-- Find all failed traces from the Worker agent in the last 5 minutes
SELECT
    traceID,
    spanID,
    serviceName,
    name AS spanName,
    durationNano / 1e6 AS durationMs,
    statusCode,
    statusMessage,
    attributes_string['input.value'] AS prompt,
    attributes_string['output.value'] AS response,
    attributes_string['error.message'] AS error
FROM signoz_traces.distributed_signoz_index_v3
WHERE serviceName = 'hackathon-ai-worker'
  AND statusCode = 2  -- STATUS_CODE_ERROR
  AND timestamp > now() - INTERVAL 5 MINUTE
ORDER BY timestamp DESC
LIMIT 10;
```

```sql
-- Get the full trace tree for a specific failed trace
SELECT
    spanID,
    parentSpanID,
    name,
    durationNano / 1e6 AS durationMs,
    statusCode,
    attributes_string
FROM signoz_traces.distributed_signoz_index_v3
WHERE traceID = '{trace_id}'
ORDER BY timestamp ASC;
```

**Self-Healing Logic:**

```python
# Pseudocode for the Overmind's core loop
while True:
    failed_traces = query_clickhouse_for_errors()
    
    for trace in failed_traces:
        # 1. Extract the original prompt and error
        original_prompt = trace['prompt']
        error_message = trace['error']
        
        # 2. Ask the LLM to diagnose and fix
        diagnosis = llm.invoke(f"""
            An AI agent was given this task: {original_prompt}
            It failed with this error: {error_message}
            
            Analyze the root cause and rewrite the prompt to avoid this failure.
        """)
        
        # 3. Re-execute the Worker with the fixed prompt
        worker.execute(diagnosis.fixed_prompt)
    
    sleep(10)  # Poll every 10 seconds
```

---

### 3.3 SigNoz Infrastructure

**Docker Services (already running):**

| Container | Port | Purpose |
|-----------|------|---------|
| `signoz-otel-collector-dev` | `4317` (gRPC), `4318` (HTTP) | Receives OTLP traces |
| `clickhouse` | `9000` (native), `8123` (HTTP) | Trace & metric storage |
| `postgres` | `5432` | SigNoz metadata |
| `zookeeper` | `2181` | ClickHouse coordination |

**SigNoz Alert Rule (to trigger Overmind):**

```yaml
# Alert: Trigger when Worker agent has errors
alert: WorkerAgentFailure
expr: count(status_code == "ERROR" AND service.name == "hackathon-ai-worker") > 0
for: 10s
labels:
  severity: critical
annotations:
  summary: "Worker agent failed - Overmind intervention required"
```

---

## 4. Data Flow

```
Step 1: Worker Agent receives a task
         ↓
Step 2: Worker executes LangChain chain (LLM + Tools)
         ↓
Step 3: OpenInference auto-instruments every span
         ↓
Step 4: OTLPSpanExporter sends traces to SigNoz Collector (port 4317)
         ↓
Step 5: Collector processes and writes to ClickHouse
         ↓
Step 6: If status_code = ERROR → SigNoz alert fires
         ↓
Step 7: Overmind Agent wakes up, queries ClickHouse for the trace
         ↓
Step 8: Overmind extracts failed prompt + error from span attributes
         ↓
Step 9: Overmind asks LLM to diagnose and generate fixed prompt
         ↓
Step 10: Overmind re-executes Worker with corrected prompt
         ↓
Step 11: New traces flow back to SigNoz (loop closes)
```

---

## 5. File Structure

```
signoz/
├── document/
│   ├── PRD.md                    # Product requirements
│   ├── TRD.md                    # This file - technical requirements
│   └── ARCHITECTURE.md           # System architecture & diagrams
├── hackathon-agent/
│   ├── agent.py                  # Worker Agent (exists)
│   ├── overmind.py               # Overmind Agent (to build)
│   ├── config.py                 # Shared configuration
│   ├── tools/
│   │   ├── fetch_user.py         # Simulated database tool
│   │   ├── search_docs.py        # Simulated search tool
│   │   └── failing_tool.py       # Intentionally failing tool
│   └── requirements.txt          # Python dependencies
└── .devenv/docker/               # SigNoz infrastructure (exists)
```

---

## 6. Dependencies

```txt
# requirements.txt
langchain>=0.3.0
langchain-openai>=0.3.0
langchain-core>=0.3.0
opentelemetry-api>=1.25.0
opentelemetry-sdk>=1.25.0
opentelemetry-exporter-otlp-proto-grpc>=1.25.0
openinference-instrumentation-langchain>=0.1.0
clickhouse-connect>=0.8.0
```

---

## 7. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key for real LLM calls |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://127.0.0.1:4317` | SigNoz OTel Collector endpoint |
| `CLICKHOUSE_HOST` | `127.0.0.1` | ClickHouse host for Overmind queries |
| `CLICKHOUSE_PORT` | `9000` | ClickHouse native port |
| `WORKER_SERVICE_NAME` | `hackathon-ai-worker` | OTel service name for Worker |
| `OVERMIND_SERVICE_NAME` | `hackathon-ai-overmind` | OTel service name for Overmind |
| `OVERMIND_POLL_INTERVAL` | `10` | Seconds between Overmind polling cycles |
| `MAX_RETRIES` | `3` | Max times Overmind retries a failed task |
