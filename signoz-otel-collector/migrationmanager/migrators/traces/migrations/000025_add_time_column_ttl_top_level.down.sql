ALTER TABLE signoz_traces.top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}} 
    DROP COLUMN IF EXISTS time;

ALTER TABLE signoz_traces.top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}} 
    REMOVE TTL;

ALTER TABLE signoz_traces.distributed_top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}}
    DROP COLUMN IF EXISTS time;
