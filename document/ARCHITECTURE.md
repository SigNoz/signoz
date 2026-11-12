# System Architecture
# Project: Autonomous Neural Optimizer (ANO)
# Hackathon: Agents of SigNoz

---

## 1. High-Level Architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    AUTONOMOUS NEURAL OPTIMIZER (ANO)                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║   ┌──────────────────┐          ┌──────────────────────────────────┐    ║
║   │                  │  OTLP    │          SigNoz Platform         │    ║
║   │  WORKER AGENT    │ traces   │                                  │    ║
║   │  ─────────────   │────────►│  ┌───────────┐  ┌─────────────┐  │    ║
║   │  • LangChain     │         │  │   OTel    │  │ ClickHouse  │  │    ║
║   │  • OpenAI/Fake   │         │  │ Collector │─►│  (Traces +  │  │    ║
║   │  • Tool Calls    │         │  │ :4317     │  │   Metrics)  │  │    ║
║   │  • Random Fails  │         │  └───────────┘  └──────┬──────┘  │    ║
║   │                  │         │                        │         │    ║
║   └────────▲─────────┘         │  ┌───────────┐         │         │    ║
║            │                   │  │  Alert    │◄────────┘         │    ║
║            │ Fixed             │  │  Engine   │                   │    ║
║            │ Prompt            │  └─────┬─────┘                   │    ║
║            │                   │        │ Webhook                 │    ║
║            │                   └────────┼─────────────────────────┘    ║
║            │                            │                              ║
║   ┌────────┴─────────┐                  │                              ║
║   │                  │◄─────────────────┘                              ║
║   │  OVERMIND AGENT  │                                                 ║
║   │  ──────────────  │  SQL queries                                    ║
║   │  • ClickHouse    │──────────────────► ClickHouse :9000             ║
║   │    Direct Query  │                                                 ║
║   │  • Root Cause    │                                                 ║
║   │    Analysis      │  OTLP traces                                    ║
║   │  • Prompt Rewrite│──────────────────► OTel Collector :4317         ║
║   │  • Worker Restart│                                                 ║
║   │                  │                                                 ║
║   └──────────────────┘                                                 ║
║                                                                        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 2. The Three Layers

### Layer 1: The Execution Layer (Worker Agent)

The Worker Agent is the entity that performs real work. It receives tasks, reasons about them using an LLM, calls tools, and produces answers.

```
┌─────────────────────────────────────────────────┐
│                 WORKER AGENT                     │
│                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐  │
│  │  Task    │───►│ LangChain │───►│  Tool    │  │
│  │  Queue   │    │  ReAct    │    │  Router  │  │
│  │          │    │  Loop     │    │          │  │
│  └──────────┘    └─────┬─────┘    └────┬─────┘  │
│                        │               │         │
│                   ┌────▼────┐    ┌─────▼──────┐  │
│                   │  LLM   │    │   Tools    │  │
│                   │ (GPT/  │    │ • FetchUser│  │
│                   │  Fake) │    │ • SearchDB │  │
│                   └────────┘    │ • FailTool │  │
│                                 └────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  OpenTelemetry Instrumentation Layer     │    │
│  │  ─────────────────────────────────────   │    │
│  │  LangChainInstrumentor captures:         │    │
│  │  • Every LLM call (prompt + response)    │    │
│  │  • Every tool invocation (input + output)│    │
│  │  • Token counts (prompt + completion)    │    │
│  │  • Latency per span                      │    │
│  │  • Errors and exceptions                 │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
         │
         │ OTLP gRPC (:4317)
         ▼
    SigNoz OTel Collector
```

**Key Design Decision:** The Worker doesn't know it's being monitored. The instrumentation is injected at the framework level by `LangChainInstrumentor`. This means any LangChain agent you write automatically gets full observability — zero code changes needed.

---

### Layer 2: The Memory Layer (SigNoz + ClickHouse)

SigNoz acts as the **short-term memory** of the entire system. Every decision the Worker makes is stored as a trace, queryable via SQL.

```
┌─────────────────────────────────────────────────────────────┐
│                    SigNoz MEMORY LAYER                       │
│                                                              │
│  ┌──────────────────┐     ┌──────────────────────────────┐  │
│  │  OTel Collector  │     │       ClickHouse             │  │
│  │  ──────────────  │     │  ────────────────────────    │  │
│  │  Receives OTLP   │────►│  signoz_traces               │  │
│  │  Processes spans  │     │    └── distributed_          │  │
│  │  Batches writes   │     │        signoz_index_v3      │  │
│  └──────────────────┘     │                              │  │
│                            │  signoz_metrics              │  │
│  ┌──────────────────┐     │    └── token_usage           │  │
│  │  Alert Engine    │     │    └── latency_histogram     │  │
│  │  ──────────────  │     │                              │  │
│  │  Rules:          │     │  Key Columns:                │  │
│  │  • status = ERR  │◄────│  • traceID                   │  │
│  │  • latency > 10s │     │  • spanID / parentSpanID     │  │
│  │  • token > 4000  │     │  • serviceName               │  │
│  └────────┬─────────┘     │  • statusCode (0=OK, 2=ERR) │  │
│           │               │  • attributes_string         │  │
│           │ Webhook        │    (prompt, response, error) │  │
│           ▼               └──────────────────────────────┘  │
│     Overmind Agent                                           │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Decision:** We query ClickHouse directly (not the SigNoz HTTP API) for maximum speed and flexibility. The `distributed_signoz_index_v3` table gives us access to every span attribute, letting the Overmind reconstruct the full execution tree of a failed task.

---

### Layer 3: The Intelligence Layer (Overmind Agent)

The Overmind is the "supervisor" agent. It never executes tasks itself — it only watches, analyzes, and corrects.

```
┌─────────────────────────────────────────────────────────────┐
│                    OVERMIND AGENT                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  OBSERVE                                              │   │
│  │  ────────                                             │   │
│  │  Poll ClickHouse every 10s for statusCode=2 traces    │   │
│  │  Extract: traceID, prompt, error, full span tree      │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DIAGNOSE                                             │   │
│  │  ────────                                             │   │
│  │  Feed the failed trace context to the LLM:            │   │
│  │  "Here is the full execution trace of an AI agent     │   │
│  │   that failed. The original task was: {prompt}.       │   │
│  │   The error was: {error}. The execution steps were:   │   │
│  │   {span_tree}. What went wrong and how should the     │   │
│  │   prompt be rewritten to avoid this failure?"         │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HEAL                                                 │   │
│  │  ────                                                 │   │
│  │  • Extract the corrected prompt from LLM diagnosis    │   │
│  │  • Log the diagnosis as a span (Overmind's own trace) │   │
│  │  • Re-invoke the Worker Agent with the fixed prompt   │   │
│  │  • Track retry count (max 3 attempts per task)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Decision:** The Overmind is itself instrumented with OpenTelemetry under a different service name (`hackathon-ai-overmind`). This means you can watch the Overmind debugging the Worker inside SigNoz — it's observability all the way down.

---

## 3. The Self-Healing Loop (Sequence Diagram)

```
     Worker              SigNoz Collector        ClickHouse          Overmind
       │                       │                      │                 │
       │──── Execute Task ────►│                      │                 │
       │     (LLM + Tools)     │                      │                 │
       │                       │                      │                 │
       │──── OTLP Traces ─────►│                      │                 │
       │     (all spans)       │──── Write Traces ───►│                 │
       │                       │                      │                 │
       │──── TOOL FAILS ──────►│                      │                 │
       │     (status=ERROR)    │──── Write Error ────►│                 │
       │                       │                      │                 │
       │                       │                      │◄── Poll Query ──│
       │                       │                      │    (every 10s)  │
       │                       │                      │                 │
       │                       │                      │── Failed Trace ►│
       │                       │                      │   (prompt+err)  │
       │                       │                      │                 │
       │                       │                      │                 │── Diagnose
       │                       │                      │                 │   via LLM
       │                       │                      │                 │
       │                       │                      │                 │── Generate
       │                       │                      │                 │   fixed prompt
       │                       │                      │                 │
       │◄──── Re-Execute ─────────────────────────────────────────────│
       │      (fixed prompt)                                           │
       │                       │                      │                 │
       │──── OTLP Traces ─────►│                      │                 │
       │     (success!)        │──── Write Traces ───►│                 │
       │                       │                      │                 │
       ▼                       ▼                      ▼                 ▼
```

---

## 4. Implementation Phases

### Phase 1: Foundation (DONE ✅)
- [x] Set up SigNoz infrastructure (ClickHouse, Postgres, OTel Collector, ZooKeeper)
- [x] Start SigNoz Go backend and React frontend
- [x] Create Worker Agent (`agent.py`) with OTel instrumentation
- [x] Verify traces export to SigNoz

### Phase 2: Worker Enhancement (NEXT 🔨)
- [ ] Add realistic failure injection (random tool failures, hallucinations)
- [ ] Add multiple tools (FetchUser, SearchDocs, FailingTool)
- [ ] Add custom span attributes for token counts and costs
- [ ] Add a task queue so the Worker processes tasks sequentially

### Phase 3: Overmind Agent (CORE 🧠)
- [ ] Create `overmind.py` with ClickHouse query capability
- [ ] Implement failure detection SQL queries
- [ ] Build the diagnosis prompt (feed trace context to LLM)
- [ ] Implement prompt rewriting and Worker re-execution
- [ ] Instrument the Overmind itself with OpenTelemetry
- [ ] Add retry limits and exponential backoff

### Phase 4: Integration & Demo (FINAL 🎬)
- [ ] Set up SigNoz alert rule for Worker errors
- [ ] Create a minimal SigNoz dashboard showing both services
- [ ] Record the demo video:
  1. Show Worker failing
  2. Show the trace in SigNoz
  3. Show Overmind automatically diagnosing and fixing
  4. Show the successful retry trace in SigNoz
- [ ] Write the hackathon submission README

---

## 5. Security Considerations

| Concern | Mitigation |
|---------|------------|
| OpenAI API key exposure | Stored in environment variables only, never committed |
| ClickHouse open port | Bound to `127.0.0.1` only (no external access) |
| Overmind prompt injection | Sanitize all trace data before feeding to LLM |
| Runaway loop costs | Hard cap: max 3 retries per task, exponential backoff |

---

## 6. Why This Architecture Wins

| Judging Criteria | How We Address It |
|-----------------|-------------------|
| **Best Use of SigNoz** | SigNoz is not just a viewer — it's the AI's memory and nervous system. We use traces, ClickHouse queries, alerts, and dashboards. |
| **Technical Depth** | Direct ClickHouse SQL queries, custom OTel span attributes, multi-agent architecture, closed-loop feedback. |
| **Innovation** | No one else is building AI that debugs itself via observability data. This is a genuinely new paradigm. |
| **Impact** | Reduces MTTR from hours to seconds. Cuts token costs. Eliminates human-in-the-loop for routine failures. |
| **Marketing Value** | SigNoz can showcase this as proof that their platform is ready for the AI agent era — a huge competitive differentiator vs. Datadog, Grafana, etc. |
