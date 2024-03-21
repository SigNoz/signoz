DROP TABLE IF EXISTS signoz_metrics.samples_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.distributed_samples_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.distributed_time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.time_series_v3 ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.distributed_time_series_v3 ON CLUSTER {{.SIGNOZ_CLUSTER}};