-- stats without filter

WITH __time_series_counts AS (
    SELECT metric_name, uniq(fingerprint) AS timeseries
    FROM signoz_metrics.distributed_time_series_v4
    WHERE unix_milli BETWEEN 1782910800000 AND 1782916840843
      AND NOT startsWith(metric_name, 'signoz')
    GROUP BY metric_name
),
__sample_counts AS (
    SELECT metric_name, count(*) AS samples
    FROM signoz_metrics.distributed_samples_v4
    WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
      AND NOT startsWith(metric_name, 'signoz')
      AND metric_name IN (
          SELECT DISTINCT metric_name
          FROM signoz_metrics.time_series_v4
          WHERE unix_milli BETWEEN 1782910800000 AND 1782916840843
            AND NOT startsWith(metric_name, 'signoz')
      )
    GROUP BY metric_name
),
__reduced_time_series_counts AS (
    SELECT metric_name, uniq(fingerprint) AS timeseries
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE unix_milli BETWEEN 1782910800000 AND 1782916840843
      AND NOT startsWith(metric_name, 'signoz')
    GROUP BY metric_name
),
__reduced_sample_counts AS (
    SELECT metric_name, sum(cnt) AS samples
    FROM (
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_last_60s
            WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
              AND NOT startsWith(metric_name, 'signoz')
            GROUP BY metric_name
        )
        UNION ALL
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
            WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
              AND NOT startsWith(metric_name, 'signoz')
            GROUP BY metric_name
        )
    ) AS reduced_samples
    GROUP BY metric_name
)
SELECT
    COALESCE(ts.metric_name, rts.metric_name, s.metric_name, rs.metric_name) AS metric_name,
    COALESCE(ts.timeseries, 0) + COALESCE(rts.timeseries, 0) AS timeseries,
    COALESCE(s.samples, 0) + COALESCE(rs.samples, 0) AS samples,
    COUNT(*) OVER() AS total
FROM __time_series_counts ts
FULL OUTER JOIN __reduced_time_series_counts rts ON ts.metric_name = rts.metric_name
FULL OUTER JOIN __sample_counts s ON COALESCE(ts.metric_name, rts.metric_name) = s.metric_name
FULL OUTER JOIN __reduced_sample_counts rs ON COALESCE(ts.metric_name, rts.metric_name, s.metric_name) = rs.metric_name
WHERE (COALESCE(ts.timeseries, 0) + COALESCE(rts.timeseries, 0) > 0
       OR COALESCE(s.samples, 0) + COALESCE(rs.samples, 0) > 0)
ORDER BY samples DESC, metric_name ASC
LIMIT 10 OFFSET 0
SETTINGS join_use_nulls = 1;

-- treemap without filter

WITH __metric_candidates AS (
    SELECT metric_name
    FROM signoz_metrics.distributed_time_series_v4
    WHERE NOT startsWith(metric_name, 'signoz')
      AND unix_milli BETWEEN 1782910800000 AND 1782916840843
    GROUP BY metric_name
    ORDER BY uniq(fingerprint) DESC
    LIMIT 150
),
__reduced_metric_candidates AS (
    SELECT metric_name
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE NOT startsWith(metric_name, 'signoz')
      AND unix_milli BETWEEN 1782910800000 AND 1782916840843
    GROUP BY metric_name
    ORDER BY uniq(fingerprint) DESC
    LIMIT 150
),
__sample_counts AS (
    SELECT metric_name, count(*) AS samples
    FROM signoz_metrics.distributed_samples_v4
    WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
      AND metric_name GLOBAL IN (SELECT metric_name FROM __metric_candidates)
    GROUP BY metric_name
),
__reduced_sample_counts AS (
    SELECT metric_name, sum(cnt) AS samples
    FROM (
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_last_60s
            WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
              AND metric_name GLOBAL IN (SELECT metric_name FROM __reduced_metric_candidates)
            GROUP BY metric_name
        )
        UNION ALL
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
            WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
              AND metric_name GLOBAL IN (SELECT metric_name FROM __reduced_metric_candidates)
            GROUP BY metric_name
        )
    ) AS reduced_samples
    GROUP BY metric_name
),
__total_samples AS (
    SELECT count(*) AS total_samples
    FROM signoz_metrics.distributed_samples_v4
    WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
),
__reduced_total_samples AS (
    SELECT sum(cnt) AS total_samples
    FROM (
        (
            SELECT uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_last_60s
            WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
        )
        UNION ALL
        (
            SELECT uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
            WHERE unix_milli BETWEEN 1782913240843 AND 1782916840843
        )
    ) AS reduced_total
),
__all_candidates AS (
    SELECT DISTINCT metric_name
    FROM (
        (SELECT metric_name FROM __metric_candidates)
        UNION ALL
        (SELECT metric_name FROM __reduced_metric_candidates)
    ) AS candidates
)
SELECT
    ac.metric_name,
    COALESCE(sc.samples, 0) + COALESCE(rsc.samples, 0) AS samples,
    CASE
        WHEN (ts.total_samples + rts.total_samples) = 0 THEN 0
        ELSE ((COALESCE(sc.samples, 0) + COALESCE(rsc.samples, 0)) * 100.0 / (ts.total_samples + rts.total_samples))
    END AS percentage
FROM __all_candidates ac
LEFT JOIN __sample_counts sc ON ac.metric_name = sc.metric_name
LEFT JOIN __reduced_sample_counts rsc ON ac.metric_name = rsc.metric_name
JOIN __total_samples ts ON 1=1
JOIN __reduced_total_samples rts ON 1=1
ORDER BY percentage DESC
LIMIT 100
SETTINGS join_use_nulls = 1;


-- stats with filter

WITH __time_series_counts AS (
    SELECT metric_name, uniq(fingerprint) AS timeseries
    FROM signoz_metrics.distributed_time_series_v4
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY metric_name
),
__filtered_fingerprints AS (
    SELECT fingerprint
    FROM signoz_metrics.time_series_v4
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY fingerprint
),
__sample_counts AS (
    SELECT metric_name, count(*) AS samples
    FROM signoz_metrics.distributed_samples_v4
    WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND fingerprint IN (SELECT fingerprint FROM __filtered_fingerprints)
    GROUP BY metric_name
),
__reduced_filtered_fingerprints AS (
    SELECT fingerprint
    FROM signoz_metrics.time_series_v4_reduced
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY fingerprint
),
__reduced_time_series_counts AS (
    SELECT metric_name, uniq(fingerprint) AS timeseries
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY metric_name
),
__reduced_sample_counts AS (
    SELECT metric_name, sum(cnt) AS samples
    FROM (
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_last_60s
            WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
              AND NOT startsWith(metric_name, 'signoz')
              AND reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)
            GROUP BY metric_name
        )
        UNION ALL
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
            WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
              AND NOT startsWith(metric_name, 'signoz')
              AND reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)
            GROUP BY metric_name
        )
    ) AS reduced_samples
    GROUP BY metric_name
)
SELECT
    COALESCE(ts.metric_name, rts.metric_name, s.metric_name, rs.metric_name) AS metric_name,
    COALESCE(ts.timeseries, 0) + COALESCE(rts.timeseries, 0) AS timeseries,
    COALESCE(s.samples, 0) + COALESCE(rs.samples, 0) AS samples,
    COUNT(*) OVER() AS total
FROM __time_series_counts ts
FULL OUTER JOIN __reduced_time_series_counts rts ON ts.metric_name = rts.metric_name
FULL OUTER JOIN __sample_counts s ON COALESCE(ts.metric_name, rts.metric_name) = s.metric_name
FULL OUTER JOIN __reduced_sample_counts rs ON COALESCE(ts.metric_name, rts.metric_name, s.metric_name) = rs.metric_name
WHERE (COALESCE(ts.timeseries, 0) + COALESCE(rts.timeseries, 0) > 0
       OR COALESCE(s.samples, 0) + COALESCE(rs.samples, 0) > 0)
ORDER BY samples DESC, metric_name ASC
LIMIT 10 OFFSET 0
SETTINGS join_use_nulls = 1;


-- treemap with filter


WITH __metric_candidates AS (
    SELECT metric_name
    FROM signoz_metrics.distributed_time_series_v4
    WHERE NOT startsWith(metric_name, 'signoz')
      AND unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY metric_name
    ORDER BY uniq(fingerprint) DESC
    LIMIT 150
),
__reduced_metric_candidates AS (
    SELECT metric_name
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE NOT startsWith(metric_name, 'signoz')
      AND unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY metric_name
    ORDER BY uniq(fingerprint) DESC
    LIMIT 150
),
__filtered_fingerprints AS (
    SELECT fingerprint
    FROM signoz_metrics.time_series_v4
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
      AND metric_name GLOBAL IN (SELECT metric_name FROM __metric_candidates)
    GROUP BY fingerprint
),
__reduced_filtered_fingerprints AS (
    SELECT fingerprint
    FROM signoz_metrics.time_series_v4_reduced
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
      AND metric_name GLOBAL IN (SELECT metric_name FROM __reduced_metric_candidates)
    GROUP BY fingerprint
),
__sample_counts AS (
    SELECT metric_name, count(*) AS samples
    FROM signoz_metrics.distributed_samples_v4
    WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
      AND metric_name GLOBAL IN (SELECT metric_name FROM __metric_candidates)
      AND fingerprint IN (SELECT fingerprint FROM __filtered_fingerprints)
    GROUP BY metric_name
),
__reduced_sample_counts AS (
    SELECT metric_name, sum(cnt) AS samples
    FROM (
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_last_60s
            WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
              AND metric_name GLOBAL IN (SELECT metric_name FROM __reduced_metric_candidates)
              AND reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)
            GROUP BY metric_name
        )
        UNION ALL
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
            WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
              AND metric_name GLOBAL IN (SELECT metric_name FROM __reduced_metric_candidates)
              AND reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)
            GROUP BY metric_name
        )
    ) AS reduced_samples
    GROUP BY metric_name
),
__total_samples AS (
    SELECT count(*) AS total_samples
    FROM signoz_metrics.distributed_samples_v4
    WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
),
__reduced_total_samples AS (
    SELECT sum(cnt) AS total_samples
    FROM (
        (
            SELECT uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_last_60s
            WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
        )
        UNION ALL
        (
            SELECT uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
            WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
        )
    ) AS reduced_total
),
__all_candidates AS (
    SELECT DISTINCT metric_name
    FROM (
        (SELECT metric_name FROM __metric_candidates)
        UNION ALL
        (SELECT metric_name FROM __reduced_metric_candidates)
    ) AS candidates
)
SELECT
    ac.metric_name,
    COALESCE(sc.samples, 0) + COALESCE(rsc.samples, 0) AS samples,
    CASE
        WHEN (ts.total_samples + rts.total_samples) = 0 THEN 0
        ELSE ((COALESCE(sc.samples, 0) + COALESCE(rsc.samples, 0)) * 100.0 / (ts.total_samples + rts.total_samples))
    END AS percentage
FROM __all_candidates ac
LEFT JOIN __sample_counts sc ON ac.metric_name = sc.metric_name
LEFT JOIN __reduced_sample_counts rsc ON ac.metric_name = rsc.metric_name
JOIN __total_samples ts ON 1=1
JOIN __reduced_total_samples rts ON 1=1
ORDER BY percentage DESC
LIMIT 100
SETTINGS join_use_nulls = 1;


-- treemap but time series based


WITH __total_time_series AS (
    SELECT uniq(fingerprint) AS total_time_series
    FROM signoz_metrics.distributed_time_series_v4
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
),
__metric_totals AS (
    SELECT metric_name, uniq(fingerprint) AS total_value
    FROM signoz_metrics.distributed_time_series_v4
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY metric_name
),
__reduced_total_time_series AS (
    SELECT uniq(fingerprint) AS total_time_series
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
),
__reduced_metric_totals AS (
    SELECT metric_name, uniq(fingerprint) AS total_value
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY metric_name
)
SELECT
    COALESCE(mt.metric_name, rmt.metric_name) AS metric_name,
    COALESCE(mt.total_value, 0) + COALESCE(rmt.total_value, 0) AS total_value,
    CASE
        WHEN (tts.total_time_series + rtts.total_time_series) = 0 THEN 0
        ELSE ((COALESCE(mt.total_value, 0) + COALESCE(rmt.total_value, 0)) * 100.0 / (tts.total_time_series + rtts.total_time_series))
    END AS percentage
FROM __metric_totals mt
FULL OUTER JOIN __reduced_metric_totals rmt ON mt.metric_name = rmt.metric_name
JOIN __total_time_series tts ON 1=1
JOIN __reduced_total_time_series rtts ON 1=1
ORDER BY percentage DESC
LIMIT 100
SETTINGS join_use_nulls = 1;

-- paginated stats with filter


WITH __time_series_counts AS (
    SELECT metric_name, uniq(fingerprint) AS timeseries
    FROM signoz_metrics.distributed_time_series_v4
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY metric_name
),
__filtered_fingerprints AS (
    SELECT fingerprint
    FROM signoz_metrics.time_series_v4
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY fingerprint
),
__sample_counts AS (
    SELECT metric_name, count(*) AS samples
    FROM signoz_metrics.distributed_samples_v4
    WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND fingerprint IN (SELECT fingerprint FROM __filtered_fingerprints)
    GROUP BY metric_name
),
__reduced_filtered_fingerprints AS (
    SELECT fingerprint
    FROM signoz_metrics.time_series_v4_reduced
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY fingerprint
),
__reduced_time_series_counts AS (
    SELECT metric_name, uniq(fingerprint) AS timeseries
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE unix_milli BETWEEN 1782910800000 AND 1782917128601
      AND NOT startsWith(metric_name, 'signoz')
      AND LOWER(metric_name) LIKE LOWER('%system%')
    GROUP BY metric_name
),
__reduced_sample_counts AS (
    SELECT metric_name, sum(cnt) AS samples
    FROM (
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_last_60s
            WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
              AND NOT startsWith(metric_name, 'signoz')
              AND reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)
            GROUP BY metric_name
        )
        UNION ALL
        (
            SELECT metric_name, uniq(reduced_fingerprint, unix_milli) AS cnt
            FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
            WHERE unix_milli BETWEEN 1782913528601 AND 1782917128601
              AND NOT startsWith(metric_name, 'signoz')
              AND reduced_fingerprint IN (SELECT fingerprint FROM __reduced_filtered_fingerprints)
            GROUP BY metric_name
        )
    ) AS reduced_samples
    GROUP BY metric_name
)
SELECT
    COALESCE(ts.metric_name, rts.metric_name, s.metric_name, rs.metric_name) AS metric_name,
    COALESCE(ts.timeseries, 0) + COALESCE(rts.timeseries, 0) AS timeseries,
    COALESCE(s.samples, 0) + COALESCE(rs.samples, 0) AS samples,
    COUNT(*) OVER() AS total
FROM __time_series_counts ts
FULL OUTER JOIN __reduced_time_series_counts rts ON ts.metric_name = rts.metric_name
FULL OUTER JOIN __sample_counts s ON COALESCE(ts.metric_name, rts.metric_name) = s.metric_name
FULL OUTER JOIN __reduced_sample_counts rs ON COALESCE(ts.metric_name, rts.metric_name, s.metric_name) = rs.metric_name
WHERE (COALESCE(ts.timeseries, 0) + COALESCE(rts.timeseries, 0) > 0
       OR COALESCE(s.samples, 0) + COALESCE(rs.samples, 0) > 0)
ORDER BY samples DESC, metric_name ASC
LIMIT 10 OFFSET 10
SETTINGS join_use_nulls = 1;


----


SELECT * FROM (
    WITH __temporal_aggregation_cte AS (
        SELECT
            ts,
            `le`,
            multiIf(
                row_number() OVER rate_window = 1, nan,
                (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0,
                    per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window),
                (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)
            ) AS per_series_value
        FROM (
            SELECT
                fingerprint,
                toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(900)) AS ts,
                `le`,
                max(max) AS per_series_value
            FROM signoz_metrics.distributed_samples_v4_agg_5m AS points
            INNER JOIN (
                SELECT fingerprint, JSONExtractString(labels, 'le') AS `le`
                FROM signoz_metrics.time_series_v4_1day
                WHERE metric_name IN ('http.server.response.size.bucket')
                  AND unix_milli >= 1782604800000
                  AND unix_milli <= 1782919260000
                  AND LOWER(temporality) LIKE LOWER('cumulative')
                  AND __normalized = false
                GROUP BY fingerprint, `le`
            ) AS filtered_time_series
            ON points.fingerprint = filtered_time_series.fingerprint
            WHERE metric_name IN ('http.server.response.size.bucket')
              AND unix_milli >= 1782658800000
              AND unix_milli < 1782919260000
            GROUP BY fingerprint, ts, `le`
            ORDER BY fingerprint, ts
        )
        WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)
    ),
    __spatial_aggregation_cte AS (
        SELECT ts, `le`, sum(per_series_value) AS value
        FROM __temporal_aggregation_cte
        WHERE isNaN(per_series_value) = 0
        GROUP BY ts, `le`
    )
    SELECT
        ts,
        histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.900) AS value
    FROM __spatial_aggregation_cte
    GROUP BY ts
    ORDER BY ts
)
UNION ALL
SELECT * FROM (
    WITH __temporal_aggregation_cte AS (
        SELECT
            fingerprint,
            toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(900)) AS ts,
            `le`,
            sum(value) / 900 AS per_series_value
        FROM (
            SELECT
                reduced_fingerprint AS fingerprint,
                unix_milli,
                argMax(`sum`, computed_at) AS value
            FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
            WHERE metric_name IN ('http.server.response.size.bucket')
              AND unix_milli >= 1782658800000
              AND unix_milli < 1782919260000
            GROUP BY reduced_fingerprint, unix_milli
        ) AS points
        INNER JOIN (
            SELECT fingerprint, JSONExtractString(labels, 'le') AS `le`
            FROM signoz_metrics.distributed_time_series_v4_reduced
            WHERE metric_name IN ('http.server.response.size.bucket')
              AND unix_milli >= 1782658800000
              AND unix_milli <= 1782919260000
              AND __normalized = false
            GROUP BY fingerprint, `le`
        ) AS filtered_time_series
        ON points.fingerprint = filtered_time_series.fingerprint
        GROUP BY fingerprint, ts, `le`
    ),
    __spatial_aggregation_cte AS (
        SELECT ts, `le`, sum(per_series_value) AS value
        FROM __temporal_aggregation_cte
        GROUP BY ts, `le`
    )
    SELECT
        ts,
        histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.900) AS value
    FROM __spatial_aggregation_cte
    GROUP BY ts
    ORDER BY ts
)
ORDER BY ts;




SELECT
    fingerprint,
    toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(900)) AS ts,
    `le`,
    sum(value) / 900 AS per_series_value
FROM (
    SELECT
        reduced_fingerprint AS fingerprint,
        unix_milli,
        argMax(`sum`, computed_at) AS value
    FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
    WHERE metric_name IN ('http.server.response.size.bucket')
      AND unix_milli >= 1782658800000
      AND unix_milli < 1782919260000
    GROUP BY reduced_fingerprint, unix_milli
) AS points
INNER JOIN (
    SELECT fingerprint, JSONExtractString(labels, 'le') AS `le`
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE metric_name IN ('http.server.response.size.bucket')
      AND unix_milli >= 1782658800000
      AND unix_milli <= 1782919260000
      AND __normalized = false
    GROUP BY fingerprint, `le`
) AS filtered_time_series
ON points.fingerprint = filtered_time_series.fingerprint
GROUP BY fingerprint, ts, `le`


SELECT
    fingerprint,
    toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(900)) AS ts,
    `le`,
    sum(value) / 900 AS per_series_value
FROM (
    SELECT
        reduced_fingerprint AS fingerprint,
        unix_milli,
        argMax(`sum`, computed_at) AS value
    FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s
    WHERE metric_name IN ('http.server.response.size.bucket')
      AND unix_milli >= 1782658800000
      AND unix_milli < 1782919260000
    GROUP BY reduced_fingerprint, unix_milli
) AS points
GLOBAL INNER JOIN (
    SELECT fingerprint, JSONExtractString(labels, 'le') AS `le`
    FROM signoz_metrics.distributed_time_series_v4_reduced
    WHERE metric_name IN ('http.server.response.size.bucket')
      AND unix_milli >= 1782658800000
      AND unix_milli <= 1782919260000
      AND __normalized = false
    GROUP BY fingerprint, `le`
) AS filtered_time_series
ON points.fingerprint = filtered_time_series.fingerprint
GROUP BY fingerprint, ts, `le`
