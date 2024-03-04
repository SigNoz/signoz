ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 0;
