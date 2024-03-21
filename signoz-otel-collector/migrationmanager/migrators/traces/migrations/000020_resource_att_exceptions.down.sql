ALTER TABLE signoz_traces.signoz_error_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    DROP COLUMN IF EXISTS resourceTagsMap;
ALTER TABLE signoz_traces.distributed_signoz_error_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    DROP COLUMN IF EXISTS resourceTagsMap;