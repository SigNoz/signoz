DROP TABLE IF EXISTS signoz_traces.distributed_signoz_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_traces.distributed_signoz_spans ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_traces.distributed_durationSort ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_traces.distributed_signoz_error_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_traces.distributed_usage_explorer ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_traces.distributed_top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_traces.distributed_dependency_graph_minutes ON CLUSTER {{.SIGNOZ_CLUSTER}}