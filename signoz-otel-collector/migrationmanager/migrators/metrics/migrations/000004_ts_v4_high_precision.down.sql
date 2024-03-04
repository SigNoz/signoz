DROP TABLE IF EXISTS signoz_metrics.time_series_v4_6hrs ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.distributed_time_series_v4_6hrs ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.time_series_v4_1day ON CLUSTER {{.SIGNOZ_CLUSTER}};

DROP TABLE IF EXISTS signoz_metrics.distributed_time_series_v4_1day ON CLUSTER {{.SIGNOZ_CLUSTER}};
