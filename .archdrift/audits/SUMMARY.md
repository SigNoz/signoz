# ArchDrift Architectural Drift Analysis

**Workspace:** signoz-1

---

## Architectural Drift (Snapshot): **17%**

[██░░░░░░░░]

Generated at (UTC): 2026-02-18T15:39:28.217Z

Architectural drift becomes meaningful when tracked over time. Scan later to see how drift changes as your codebase evolves.

---

### Primary Drift Contributors

**Structural Drift**
Risk signals from layer violations and architectural coupling patterns

**Performance Drift**
Risk signals from N+1 queries and data-access patterns

**Complexity Drift**
Risk signals from large files and monolithic structures

---

## Top Offenders

1. [frontend/src/lib/dashboard/getQueryResults.ts:5](../../frontend/src/lib/dashboard/getQueryResults.ts#L5) - 7 issues
2. [frontend/src/lib/uPlotLib/getUplotChartOptions.ts:20](../../frontend/src/lib/uPlotLib/getUplotChartOptions.ts#L20) - 4 issues
3. [frontend/src/container/Home/Services/ServiceTraces.tsx:5](../../frontend/src/container/Home/Services/ServiceTraces.tsx#L5) - 3 issues
4. [frontend/src/lib/uPlotLib/getUplotHistogramChartOptions.ts:9](../../frontend/src/lib/uPlotLib/getUplotHistogramChartOptions.ts#L9) - 3 issues
5. [frontend/src/api/generated/services/users/index.ts:1](../../frontend/src/api/generated/services/users/index.ts#L1) - 2 issues

---

## Pattern Breakdown

| Pattern | Count | Contribution |
|---------|-------|--------------|
| Layer Violation | 57 | Primary |
| God Class | 29 | Significant |
| N+1 Query | 1 | Minor |

*Note: 11 violations found in test files (excluded from drift calculation)*

---

📋 [View Full Details →](FULL_DETAILS.md)

---

> Copy the block below to share these results.

```text
ArchDrift Snapshot — signoz-1

Drift Score: 17% [██░░░░░░░░]
Primary Signals: Layer Violation: 57, God Class: 29, N+1 Query: 1
Top Offenders: frontend/src/lib/dashboard/getQueryResults.ts, frontend/src/lib/uPlotLib/getUplotChartOptions.ts

Generated at (UTC): 2026-02-18T15:39:28.217Z
Generated locally by ArchDrift. No code left the machine.
```

---

## Notes
- Generated locally by ArchDrift. No code left the machine.
- Drift highlights architectural risk signals that affect long-term maintainability and velocity.
- Domain detected: FRAMEWORK. Domain inference affects scoring emphasis only; it does not change which violations are detected.
