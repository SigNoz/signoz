ALTER TABLE signoz_traces.signoz_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 0;
ALTER TABLE signoz_traces.signoz_error_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 0;
ALTER TABLE signoz_traces.signoz_spans ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 0;
ALTER TABLE signoz_traces.durationSort ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 0;
ALTER TABLE signoz_traces.dependency_graph_minutes ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 0;
ALTER TABLE signoz_traces.usage_explorer ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 0;