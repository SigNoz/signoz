---
description: Write optimised ClickHouse queries for SigNoz dashboards (traces, errors, logs)
user_invocable: true
---

# Writing ClickHouse Queries for SigNoz Dashboards

Read [clickhouse-traces-reference.md](./clickhouse-traces-reference.md) for full schema and query reference before writing any query. It covers:

- All table schemas (`distributed_signoz_index_v3`, `distributed_traces_v3_resource`, `distributed_signoz_error_index_v2`, etc.)
- The mandatory resource filter CTE pattern and timestamp bucketing
- Attribute access syntax (standard, indexed, resource)
- Dashboard panel query templates (timeseries, value, table)
- Real-world query examples (span counts, error rates, latency, event extraction)

## Workflow

1. **Understand the ask**: What metric/data does the user want? (e.g., error rate, latency, span count)
2. **Pick the panel type**: Timeseries (time-series chart), Value (single number), or Table (rows).
3. **Build the query** following the mandatory patterns from the reference doc.
4. **Validate** the query uses all required optimizations (resource CTE, ts_bucket_start, indexed columns).
