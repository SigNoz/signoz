ALTER TABLE signoz_traces.top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}} 
    ADD COLUMN IF NOT EXISTS time DateTime DEFAULT now() CODEC(ZSTD(1));

ALTER TABLE signoz_traces.top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}} 
    MODIFY TTL time + INTERVAL 1 MONTH;

ALTER TABLE signoz_traces.distributed_top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}}
    ADD COLUMN IF NOT EXISTS time DateTime DEFAULT now() CODEC(ZSTD(1));