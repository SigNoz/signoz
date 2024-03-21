DROP TABLE IF EXISTS signoz_metrics.time_series_v4 ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.distributed_time_series_v4 ON CLUSTER {{.SIGNOZ_CLUSTER}};