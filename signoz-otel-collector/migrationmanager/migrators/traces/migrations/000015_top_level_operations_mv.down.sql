DROP TABLE IF EXISTS signoz_traces.top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP VIEW IF EXISTS signoz_traces.sub_root_operations ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP VIEW IF EXISTS signoz_traces.root_operations ON CLUSTER {{.SIGNOZ_CLUSTER}};
