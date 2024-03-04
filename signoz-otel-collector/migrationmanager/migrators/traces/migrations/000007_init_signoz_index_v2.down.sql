DROP TABLE IF EXISTS signoz_traces.signoz_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}};

SET allow_experimental_projection_optimization = 0;