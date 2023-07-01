SELECT
    fingerprint,
    toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), toIntervalSecond(60)) AS ts,
    any(value) AS value
FROM signoz_metrics.distributed_samples_v2
GLOBAL INNER JOIN
(
    SELECT
        fingerprint
    FROM signoz_metrics.distributed_time_series_v2
    WHERE metric_name = 'process_runtime_jvm_threads_count'
) AS filtered_time_series USING (fingerprint)
WHERE metric_name = 'process_runtime_jvm_threads_count'
GROUP BY
    fingerprint,
    ts
ORDER BY
    fingerprint ASC,
    ts ASC