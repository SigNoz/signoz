DROP TABLE IF EXISTS signoz_traces.distributed_span_attributes ON CLUSTER {{.SIGNOZ_CLUSTER}}
DROP TABLE IF EXISTS signoz_traces.span_attributes ON CLUSTER {{.SIGNOZ_CLUSTER}};
