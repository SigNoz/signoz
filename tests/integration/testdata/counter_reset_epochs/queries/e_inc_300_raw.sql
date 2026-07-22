-- e_inc_300_raw (epochs=true step=5m0s agg=increase)
SELECT toUnixTimestamp(ts) AS ts_s, `scenario`, value FROM (
WITH __temporal_aggregation_cte AS (SELECT
  ts,
  `scenario`, if(countIf(isNaN(__contrib) = 0) > 0, sumIf(__contrib, isNaN(__contrib) = 0), nan) AS per_series_value
FROM (SELECT
  fingerprint,
  ts,
  `scenario`, __prev_bucket_ts,
  __bucket_rn,
  __kv.1 AS __epoch,
  __kv.2 AS __lval,
  __first_by_epoch[__kv.1] AS __fval,
  lagInFrame(__lval, 1) OVER (PARTITION BY fingerprint, __kv.1 ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_lval,
  row_number() OVER (PARTITION BY fingerprint, __kv.1 ORDER BY ts) AS __epoch_rn,
  multiIf(
    __epoch != 0 AND __epoch_rn > 1, if(__lval >= __prev_lval, __lval - __prev_lval, __lval),
    __epoch != 0 AND (__has0 OR __ever_had0), __lval - if(__fval >= if(__has0, __v0, __prev_v0), if(__has0, __v0, __prev_v0), 0.),
    __epoch != 0 AND __epoch >= 1784332500000, __lval,
    __epoch != 0, __lval - __fval,
    __bucket_rn = 1, nan,
    __lval < __prev_bucket_max, __lval,
    __lval - __prev_bucket_max
  ) AS __contrib
FROM (SELECT
  fingerprint,
  ts,
  `scenario`, __first_by_epoch,
  __last_by_epoch,
  mapContains(__last_by_epoch, toInt64(0)) AS __has0,
  __last_by_epoch[toInt64(0)] AS __v0,
  anyLastIf(__v0, __has0) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS __prev_v0,
  max(__has0) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS __ever_had0,
  arrayMax(mapValues(__last_by_epoch)) AS __bucket_max,
  lagInFrame(__bucket_max, 1) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_bucket_max,
  lagInFrame(ts, 1) OVER (PARTITION BY fingerprint ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS __prev_bucket_ts,
  row_number() OVER (PARTITION BY fingerprint ORDER BY ts) AS __bucket_rn
FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, `scenario`, minMap(map(start_ts, value)) AS __first_by_epoch, maxMap(map(start_ts, value)) AS __last_by_epoch FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'scenario') AS `scenario` FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ('it_counter_total') AND unix_milli >= 1784246400000 AND unix_milli <= 1784419200000 AND LOWER(temporality) LIKE LOWER('cumulative') GROUP BY fingerprint, `scenario`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN ('it_counter_total') AND unix_milli >= 1784332500000 AND unix_milli < 1784419200000 AND bitAnd(flags, 1) = 0 GROUP BY fingerprint, ts, `scenario` ORDER BY fingerprint, ts)) ARRAY JOIN arrayZip(mapKeys(__last_by_epoch), mapValues(__last_by_epoch)) AS __kv)
WHERE ts >= toDateTime(1784332800)
GROUP BY fingerprint, ts, `scenario`), __spatial_aggregation_cte AS (SELECT ts, `scenario`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = 0 GROUP BY ts, `scenario`) SELECT * FROM __spatial_aggregation_cte ORDER BY `scenario`, ts
) ORDER BY scenario, ts_s FORMAT CSV;
