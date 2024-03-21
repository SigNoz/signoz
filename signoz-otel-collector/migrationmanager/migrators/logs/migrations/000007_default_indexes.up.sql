-- This migration adds default indexes to top level keys of the log model

-- https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber range 1-24 and 0 means it's not set
ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} add index IF NOT EXISTS severity_number_idx (severity_number) TYPE set(25) GRANULARITY 4;

-- https://opentelemetry.io/docs/specs/otel/logs/data-model/#displaying-severity 24 different values and empty means not set.
ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} add index IF NOT EXISTS severity_text_idx (severity_text) TYPE set(25) GRANULARITY 4;


-- No point in addding index for trace_id, span_id as they are not set and they are always unique
-- trace_flags can be a set so adding a default bloom filter
ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} add index IF NOT EXISTS trace_flags_idx (trace_flags) TYPE bloom_filter() GRANULARITY 4;