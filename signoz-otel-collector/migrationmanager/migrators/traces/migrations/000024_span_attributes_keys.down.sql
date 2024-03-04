DROP TABLE IF EXISTS signoz_traces.distributed_span_attributes_keys ON CLUSTER {{.SIGNOZ_CLUSTER}}
DROP TABLE IF EXISTS signoz_traces.span_attributes_keys ON CLUSTER {{.SIGNOZ_CLUSTER}};
