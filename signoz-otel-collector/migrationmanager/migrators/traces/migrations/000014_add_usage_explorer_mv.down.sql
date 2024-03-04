DROP TABLE IF EXISTS signoz_traces.usage_explorer ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP VIEW IF EXISTS signoz_traces.usage_explorer_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
