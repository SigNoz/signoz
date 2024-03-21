ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} drop index IF EXISTS severity_number_idx;

ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} drop index IF EXISTS severity_text_idx;

ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} drop index IF EXISTS trace_flags_idx;