CREATE TABLE IF NOT EXISTS signoz_traces.distributed_signoz_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_traces.signoz_index_v2
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_traces", signoz_index_v2, cityHash64(traceID));

CREATE TABLE IF NOT EXISTS signoz_traces.distributed_signoz_spans ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_traces.signoz_spans
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_traces", signoz_spans, cityHash64(traceID));

CREATE TABLE IF NOT EXISTS signoz_traces.distributed_durationSort ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_traces.durationSort
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_traces", durationSort, cityHash64(traceID));

CREATE TABLE IF NOT EXISTS signoz_traces.distributed_signoz_error_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_traces.signoz_error_index_v2
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_traces", signoz_error_index_v2, cityHash64(groupID));

CREATE TABLE IF NOT EXISTS signoz_traces.distributed_usage_explorer ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_traces.usage_explorer
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_traces", usage_explorer, cityHash64(rand()));

CREATE TABLE IF NOT EXISTS signoz_traces.distributed_top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_traces.top_level_operations
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_traces", top_level_operations, cityHash64(rand()));

CREATE TABLE IF NOT EXISTS signoz_traces.distributed_dependency_graph_minutes ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_traces.dependency_graph_minutes
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_traces", dependency_graph_minutes, cityHash64(rand()));

