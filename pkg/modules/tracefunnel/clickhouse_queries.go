package tracefunnel

import (
	"fmt"
)

func BuildTwoStepFunnelValidationQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	clauseStep1 string,
	clauseStep2 string,
) string {
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    toDateTime64(%[3]d/1e9, 9) AS start_ts,
    toDateTime64(%[4]d/1e9, 9) AS end_ts,

    ('%[5]s','%[6]s') AS step1,
    ('%[7]s','%[8]s') AS step2

SELECT
    trace_id
FROM (
    SELECT
        trace_id,
        minIf(timestamp, serviceName = step1.1 AND name = step1.2) AS t1_time,
        minIf(timestamp, serviceName = step2.1 AND name = step2.2) AS t2_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName = step1.1 AND name = step1.2 AND (contains_error_t1 = 0 OR has_error = true) %[9]s)
         OR
            (serviceName = step2.1 AND name = step2.2 AND (contains_error_t2 = 0 OR has_error = true) %[10]s)
        )
    GROUP BY trace_id
) AS funnel
WHERE
    t2_time > t1_time
    AND t1_time > 0
    AND t2_time > 0
ORDER BY t1_time
LIMIT 5;`
	return fmt.Sprintf(queryTemplate,
		containsErrorT1,
		containsErrorT2,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		clauseStep1,
		clauseStep2,
	)
}

func BuildThreeStepFunnelValidationQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	containsErrorT3 int,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	serviceNameT3 string,
	spanNameT3 string,
	clauseStep1 string,
	clauseStep2 string,
	clauseStep3 string,
) string {
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    %[3]d AS contains_error_t3,
    toDateTime64(%[4]d/1e9, 9) AS start_ts,
    toDateTime64(%[5]d/1e9, 9) AS end_ts,

    ('%[6]s','%[7]s') AS step1,
    ('%[8]s','%[9]s') AS step2,
    ('%[10]s','%[11]s') AS step3

SELECT
    trace_id
FROM (
    SELECT
        trace_id,
        minIf(timestamp, serviceName = step1.1 AND name = step1.2) AS t1_time,
        minIf(timestamp, serviceName = step2.1 AND name = step2.2) AS t2_time,
        minIf(timestamp, serviceName = step3.1 AND name = step3.2) AS t3_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName = step1.1 AND name = step1.2 AND (contains_error_t1 = 0 OR has_error = true) %[12]s)
         OR
            (serviceName = step2.1 AND name = step2.2 AND (contains_error_t2 = 0 OR has_error = true) %[13]s)
         OR
            (serviceName = step3.1 AND name = step3.2 AND (contains_error_t3 = 0 OR has_error = true) %[14]s)
        )
    GROUP BY trace_id
) AS funnel
WHERE
    t1_time > 0
    AND t2_time > t1_time
    AND t3_time > t2_time
ORDER BY t1_time
LIMIT 5;`
	return fmt.Sprintf(queryTemplate,
		containsErrorT1,
		containsErrorT2,
		containsErrorT3,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		serviceNameT3,
		spanNameT3,
		clauseStep1,
		clauseStep2,
		clauseStep3,
	)
}

func BuildTwoStepFunnelOverviewQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	latencyPointerT1 string,
	latencyPointerT2 string,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	clauseStep1 string,
	clauseStep2 string,
) string {
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    '%[3]s' AS latency_pointer_t1,
    '%[4]s' AS latency_pointer_t2,
    toDateTime64(%[5]d/1e9, 9) AS start_ts,
    toDateTime64(%[6]d/1e9, 9) AS end_ts,
    (%[6]d-%[5]d)/1e9     AS time_window_sec,

    ('%[7]s','%[8]s') AS step1,
    ('%[9]s','%[10]s') AS step2

SELECT
    round(countIf(t1_time>0 AND t2_time>0)*100.0/countIf(t1_time>0),2) AS conversion_rate,
    countIf(t1_time>0 AND t2_time>0)/time_window_sec    AS avg_rate,
    greatest(sum(s1_error), sum(s2_error))              AS errors,
    avg(dateDiff('microseconds', t1_time, t2_time)/1000.0)      AS avg_duration,
    quantile(0.99)(dateDiff('microseconds', t1_time, t2_time)/1000.0) AS p99_latency
FROM (
    SELECT
        trace_id,
        minIf(timestamp, serviceName=step1.1 AND name=step1.2) AS t1_time,
        minIf(timestamp, serviceName=step2.1 AND name=step2.2) AS t2_time,
        anyIf(has_error,serviceName=step1.1 AND name=step1.2)   AS s1_error,
        anyIf(has_error,serviceName=step2.1 AND name=step2.2)   AS s2_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName=step1.1 AND name=step1.2 AND (contains_error_t1=0 OR has_error=true) %[11]s)
         OR
            (serviceName=step2.1 AND name=step2.2 AND (contains_error_t2=0 OR has_error=true) %[12]s)
        )
    GROUP BY trace_id
) AS funnel
WHERE t1_time>0 AND t2_time>t1_time;`
	return fmt.Sprintf(queryTemplate,
		containsErrorT1,
		containsErrorT2,
		latencyPointerT1,
		latencyPointerT2,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		clauseStep1,
		clauseStep2,
	)
}

func BuildThreeStepFunnelOverviewQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	containsErrorT3 int,
	latencyPointerT1 string,
	latencyPointerT2 string,
	latencyPointerT3 string,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	serviceNameT3 string,
	spanNameT3 string,
	clauseStep1 string,
	clauseStep2 string,
	clauseStep3 string,
) string {
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    %[3]d AS contains_error_t3,
    '%[4]s' AS latency_pointer_t1,
    '%[5]s' AS latency_pointer_t2,
    '%[6]s' AS latency_pointer_t3,
    toDateTime64(%[7]d/1e9,9) AS start_ts,
    toDateTime64(%[8]d/1e9,9) AS end_ts,
    (%[8]d-%[7]d)/1e9     AS time_window_sec,

    ('%[9]s','%[10]s') AS step1,
    ('%[11]s','%[12]s') AS step2,
    ('%[13]s','%[14]s') AS step3

SELECT
    round(countIf(t1_time>0 AND t2_time>t1_time AND t3_time>t2_time)*100.0/countIf(t1_time>0),2) AS conversion_rate,
    countIf(t1_time>0 AND t2_time>t1_time)/time_window_sec                       AS avg_rate,
    greatest(sum(s1_error), sum(s2_error), sum(s3_error))                        AS errors,
    avg(dateDiff('microseconds', t1_time, t2_time)/1000.0)                      AS avg_duration_ms,
    quantile(0.99)(dateDiff('microseconds', t1_time, t2_time)/1000.0)           AS p99_duration_ms
FROM (
    SELECT
        trace_id,
        minIf(timestamp,serviceName=step1.1 AND name=step1.2) AS t1_time,
        minIf(timestamp,serviceName=step2.1 AND name=step2.2) AS t2_time,
        minIf(timestamp,serviceName=step3.1 AND name=step3.2) AS t3_time,
        anyIf(has_error,serviceName=step1.1 AND name=step1.2)   AS s1_error,
        anyIf(has_error,serviceName=step2.1 AND name=step2.2)   AS s2_error,
        anyIf(has_error,serviceName=step3.1 AND name=step3.2)   AS s3_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName=step1.1 AND name=step1.2 AND (contains_error_t1=0 OR has_error=true) %[15]s)
         OR
            (serviceName=step2.1 AND name=step2.2 AND (contains_error_t2=0 OR has_error=true) %[16]s)
         OR
            (serviceName=step3.1 AND name=step3.2 AND (contains_error_t3=0 OR has_error=true) %[17]s)
        )
    GROUP BY trace_id
) AS funnel
WHERE t1_time>0 AND t2_time>t1_time AND t3_time>t2_time;`
	return fmt.Sprintf(queryTemplate,
		containsErrorT1,
		containsErrorT2,
		containsErrorT3,
		latencyPointerT1,
		latencyPointerT2,
		latencyPointerT3,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		serviceNameT3,
		spanNameT3,
		clauseStep1,
		clauseStep2,
		clauseStep3,
	)
}

func BuildTwoStepFunnelCountQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	clauseStep1 string,
	clauseStep2 string,
) string {
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    toDateTime64(%[3]d/1e9,9) AS start_ts,
    toDateTime64(%[4]d/1e9,9) AS end_ts,

    ('%[5]s','%[6]s') AS step1,
    ('%[7]s','%[8]s') AS step2

SELECT
    countIf(t1_time>0)                                                 AS total_s1_spans,
    countIf(t1_error=1)                                                AS total_s1_errored_spans,
    countIf(t1_time>0 AND t2_time>t1_time)                              AS total_s2_spans,
    countIf(t1_time>0 AND t2_time>t1_time AND t2_error=1)               AS total_s2_errored_spans
FROM (
    SELECT
        trace_id,
        minIf(timestamp,serviceName=step1.1 AND name=step1.2)           AS t1_time,
        minIf(timestamp,serviceName=step2.1 AND name=step2.2)           AS t2_time,
        toUInt8(anyIf(has_error,serviceName=step1.1 AND name=step1.2))  AS t1_error,
        toUInt8(anyIf(has_error,serviceName=step2.1 AND name=step2.2))  AS t2_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName=step1.1 AND name=step1.2 AND (contains_error_t1=0 OR has_error=true) %[9]s)
         OR
            (serviceName=step2.1 AND name=step2.2 AND (contains_error_t2=0 OR has_error=true) %[10]s)
        )
    GROUP BY trace_id
) AS funnel
WHERE t1_time>0;`
	return fmt.Sprintf(queryTemplate,
		containsErrorT1,
		containsErrorT2,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		clauseStep1,
		clauseStep2,
	)
}

func BuildThreeStepFunnelCountQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	containsErrorT3 int,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	serviceNameT3 string,
	spanNameT3 string,
	clauseStep1 string,
	clauseStep2 string,
	clauseStep3 string,
) string {
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    %[3]d AS contains_error_t3,
    toDateTime64(%[4]d/1e9,9) AS start_ts,
    toDateTime64(%[5]d/1e9,9) AS end_ts,

    ('%[6]s','%[7]s') AS step1,
    ('%[8]s','%[9]s') AS step2,
    ('%[10]s','%[11]s') AS step3

SELECT
    countIf(t1_time>0)                                                       AS total_s1_spans,
    countIf(t1_error=1)                                                      AS total_s1_errored_spans,
    countIf(t1_time>0 AND t2_time>t1_time)                                    AS total_s2_spans,
    countIf(t1_time>0 AND t2_time>t1_time AND t2_error=1)                     AS total_s2_errored_spans,
    countIf(t1_time>0 AND t2_time>t1_time AND t3_time>t2_time)                AS total_s3_spans,
    countIf(t1_time>0 AND t2_time>t1_time AND t3_time>t2_time AND t3_error=1) AS total_s3_errored_spans
FROM (
    SELECT
        trace_id,
        minIf(timestamp,serviceName=step1.1 AND name=step1.2)             AS t1_time,
        minIf(timestamp,serviceName=step2.1 AND name=step2.2)             AS t2_time,
        minIf(timestamp,serviceName=step3.1 AND name=step3.2)             AS t3_time,
        toUInt8(anyIf(has_error,serviceName=step1.1 AND name=step1.2))   AS t1_error,
        toUInt8(anyIf(has_error,serviceName=step2.1 AND name=step2.2))   AS t2_error,
        toUInt8(anyIf(has_error,serviceName=step3.1 AND name=step3.2))   AS t3_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName=step1.1 AND name=step1.2 AND (contains_error_t1=0 OR has_error=true) %[12]s)
         OR
            (serviceName=step2.1 AND name=step2.2 AND (contains_error_t2=0 OR has_error=true) %[13]s)
         OR
            (serviceName=step3.1 AND name=step3.2 AND (contains_error_t3=0 OR has_error=true) %[14]s)
        )
    GROUP BY trace_id
) AS funnel
WHERE t1_time>0;`
	return fmt.Sprintf(queryTemplate,
		containsErrorT1,
		containsErrorT2,
		containsErrorT3,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		serviceNameT3,
		spanNameT3,
		clauseStep1,
		clauseStep2,
		clauseStep3,
	)
}

func BuildTwoStepFunnelTopSlowTracesQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	clauseStep1 string,
	clauseStep2 string,
) string {
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    toDateTime64(%[3]d/1e9,9) AS start_ts,
    toDateTime64(%[4]d/1e9,9) AS end_ts,

    ('%[5]s','%[6]s') AS step1,
    ('%[7]s','%[8]s') AS step2

SELECT
    trace_id,
    dateDiff('microseconds', t1_time, t2_time)/1000.0 AS duration_ms,
    span_count
FROM (
    SELECT
        trace_id,
        minIf(timestamp,serviceName=step1.1 AND name=step1.2) AS t1_time,
        minIf(timestamp,serviceName=step2.1 AND name=step2.2) AS t2_time,
        count()                                                 AS span_count
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName=step1.1 AND name=step1.2 AND (contains_error_t1=0 OR has_error=true) %[9]s)
         OR
            (serviceName=step2.1 AND name=step2.2 AND (contains_error_t2=0 OR has_error=true) %[10]s)
        )
    GROUP BY trace_id
) AS funnel
WHERE t2_time>t1_time
ORDER BY duration_ms DESC
LIMIT 5;`
	return fmt.Sprintf(queryTemplate,
		containsErrorT1,
		containsErrorT2,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		clauseStep1,
		clauseStep2,
	)
}

func BuildTwoStepFunnelTopSlowErrorTracesQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	clauseStep1 string,
	clauseStep2 string,
) string {
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    toDateTime64(%[3]d/1e9,9) AS start_ts,
    toDateTime64(%[4]d/1e9,9) AS end_ts,

    ('%[5]s','%[6]s') AS step1,
    ('%[7]s','%[8]s') AS step2

SELECT
    trace_id,
    dateDiff('microseconds', t1_time, t2_time)/1000.0 AS duration_ms,
    span_count
FROM (
    SELECT
        trace_id,
        minIf(timestamp,serviceName=step1.1 AND name=step1.2) AS t1_time,
        minIf(timestamp,serviceName=step2.1 AND name=step2.2) AS t2_time,
        toUInt8(anyIf(has_error,serviceName=step1.1 AND name=step1.2)) AS t1_error,
        toUInt8(anyIf(has_error,serviceName=step2.1 AND name=step2.2)) AS t2_error,
        count()                                                 AS span_count
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName=step1.1 AND name=step1.2 AND (contains_error_t1=0 OR has_error=true) %[9]s)
         OR
            (serviceName=step2.1 AND name=step2.2 AND (contains_error_t2=0 OR has_error=true) %[10]s)
        )
    GROUP BY trace_id
) AS funnel
WHERE
    (t1_error=1 OR t2_error=1)
    AND t2_time>t1_time
ORDER BY duration_ms DESC
LIMIT 5;`
	return fmt.Sprintf(queryTemplate,
		containsErrorT1,
		containsErrorT2,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		clauseStep1,
		clauseStep2,
	)
}

func BuildTwoStepFunnelStepOverviewQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	latencyPointerT1 string,
	latencyPointerT2 string,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	clauseStep1 string,
	clauseStep2 string,
	latencyTypeT2 string,
) string {
	const tpl = `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    '%[3]s' AS latency_pointer_t1,
    '%[4]s' AS latency_pointer_t2,
    toDateTime64(%[5]d/1e9,9) AS start_ts,
    toDateTime64(%[6]d/1e9,9) AS end_ts,
    (%[6]d - %[5]d)/1e9         AS time_window_sec,
    '%[7]s' AS service_name_t1,
    '%[8]s' AS span_name_t1,
    '%[9]s' AS service_name_t2,
    '%[10]s' AS span_name_t2

, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp)       AS t1_time,
        argMin(has_error, timestamp)       AS s1_has_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name        = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true)
        %[11]s
    GROUP BY trace_id
    LIMIT 100000
)
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp)       AS t2_time,
        argMin(has_error, timestamp)       AS s2_has_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name        = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true)
        %[12]s
    GROUP BY trace_id
    LIMIT 100000
)
, joined AS (
    SELECT
        s1.trace_id,
        s1.t1_time,
        s2.t2_time,
        s1.s1_has_error,
        s2.s2_has_error
    FROM step1 AS s1
    INNER JOIN step2 AS s2 ON s1.trace_id = s2.trace_id
    WHERE s2.t2_time > s1.t1_time
)
, errors_step1 AS (SELECT countIf(s1_has_error) AS errors FROM step1)
, errors_step2 AS (SELECT countIf(s2_has_error) AS errors FROM step2)

SELECT
    round(
      count(DISTINCT trace_id)*100.0
    / (SELECT count(DISTINCT trace_id) FROM step1), 2
    ) AS conversion_rate,
    count(DISTINCT trace_id) / time_window_sec          AS avg_rate,
    greatest(
      (SELECT errors FROM errors_step1),
      (SELECT errors FROM errors_step2)
    )                                                    AS errors,
    avg(
      abs(
        CAST(t2_time AS Decimal(20,9))
      - CAST(t1_time AS Decimal(20,9))
      ) * 1000
    )                                                    AS avg_duration,
    CASE 
      WHEN '%[13]s' = 'p99' THEN quantile(0.99)(
        abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) * 1000
      )
      WHEN '%[13]s' = 'p95' THEN quantile(0.95)(
        abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) * 1000
      )
      WHEN '%[13]s' = 'p90' THEN quantile(0.90)(
        abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) * 1000
      )
      ELSE quantile(0.99)(
        abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) * 1000
      )
    END                                                   AS latency
FROM joined;
`

	return fmt.Sprintf(tpl,
		containsErrorT1,
		containsErrorT2,
		latencyPointerT1,
		latencyPointerT2,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		clauseStep1,
		clauseStep2,
		latencyTypeT2,
	)
}

func BuildThreeStepFunnelStepOverviewQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	containsErrorT3 int,
	latencyPointerT1 string,
	latencyPointerT2 string,
	latencyPointerT3 string,
	startTs int64,
	endTs int64,
	serviceNameT1 string,
	spanNameT1 string,
	serviceNameT2 string,
	spanNameT2 string,
	serviceNameT3 string,
	spanNameT3 string,
	clauseStep1 string,
	clauseStep2 string,
	clauseStep3 string,
	stepStart int64,
	stepEnd int64,
	latencyTypeT2 string,
	latencyTypeT3 string,
) string {
	base := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    %[3]d AS contains_error_t3,
    '%[4]s' AS latency_pointer_t1,
    '%[5]s' AS latency_pointer_t2,
    '%[6]s' AS latency_pointer_t3,
    toDateTime64(%[7]d/1e9,9) AS start_ts,
    toDateTime64(%[8]d/1e9,9) AS end_ts,
    (%[8]d - %[7]d)/1e9         AS time_window_sec,
    '%[9]s'  AS service_name_t1,
    '%[10]s' AS span_name_t1,
    '%[11]s' AS service_name_t2,
    '%[12]s' AS span_name_t2,
    '%[13]s' AS service_name_t3,
    '%[14]s' AS span_name_t3

, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS t1_time,
        argMin(has_error, timestamp) AS s1_has_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name        = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true)
        %[15]s
    GROUP BY trace_id
    LIMIT 100000
)
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS t2_time,
        argMin(has_error, timestamp) AS s2_has_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name        = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true)
        %[16]s
    GROUP BY trace_id
    LIMIT 100000
)
, step3 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS t3_time,
        argMin(has_error, timestamp) AS s3_has_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t3
        AND name        = span_name_t3
        AND (contains_error_t3 = 0 OR has_error = true)
        %[17]s
    GROUP BY trace_id
    LIMIT 100000
)
, joined_t2 AS (
    SELECT
        s1.trace_id,
        s1.t1_time,
        s2.t2_time,
        s1.s1_has_error,
        s2.s2_has_error
    FROM step1 AS s1
    INNER JOIN step2 AS s2 ON s1.trace_id = s2.trace_id
    WHERE s2.t2_time > s1.t1_time
)
, joined_t3 AS (
    SELECT
        j.trace_id,
        j.t1_time,
        j.t2_time,
        s3.t3_time,
        j.s1_has_error,
        j.s2_has_error,
        s3.s3_has_error
    FROM joined_t2 AS j
    INNER JOIN step3 AS s3 ON j.trace_id = s3.trace_id
    WHERE s3.t3_time > j.t2_time
)
, errors_step1 AS (SELECT countIf(s1_has_error) AS errors FROM step1)
, errors_step2 AS (SELECT countIf(s2_has_error) AS errors FROM step2)
, errors_step3 AS (SELECT countIf(s3_has_error) AS errors FROM step3)
`

	var sel string
	if stepStart == 1 && stepEnd == 2 {
		sel = `
SELECT
    round(
      count(DISTINCT trace_id)*100.0
    / (SELECT count(DISTINCT trace_id) FROM step1), 2
    ) AS conversion_rate,
    count(DISTINCT trace_id) / time_window_sec                          AS avg_rate,
    greatest(
      (SELECT errors FROM errors_step1),
      (SELECT errors FROM errors_step2)
    )                                                                    AS errors,
    avg(
      abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) *1000
    )                                                                    AS avg_duration,
    CASE
      WHEN '%[19]s' = 'p99' THEN quantile(0.99)(
        abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) *1000
      )
      WHEN '%[19]s' = 'p95' THEN quantile(0.95)(
        abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) *1000
      )
      WHEN '%[19]s' = 'p90' THEN quantile(0.90)(
        abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) *1000
      )
      ELSE quantile(0.99)(
        abs(CAST(t2_time AS Decimal(20,9)) - CAST(t1_time AS Decimal(20,9))) *1000
      )
    END                                                                   AS latency
FROM joined_t2;`
	} else {
		sel = `
SELECT
    round(
      count(DISTINCT trace_id)*100.0
    / (SELECT count(DISTINCT trace_id) FROM joined_t2), 2
    ) AS conversion_rate,
    count(DISTINCT trace_id) / time_window_sec                          AS avg_rate,
    greatest(
      (SELECT errors FROM errors_step2),
      (SELECT errors FROM errors_step3)
    )                                                                    AS errors,
    avg(
      abs(CAST(t3_time AS Decimal(20,9)) - CAST(t2_time AS Decimal(20,9))) *1000
    )                                                                    AS avg_duration,
    CASE
      WHEN '%[20]s' = 'p99' THEN quantile(0.99)(
        abs(CAST(t3_time AS Decimal(20,9)) - CAST(t2_time AS Decimal(20,9))) *1000
      )
      WHEN '%[20]s' = 'p95' THEN quantile(0.95)(
        abs(CAST(t3_time AS Decimal(20,9)) - CAST(t2_time AS Decimal(20,9))) *1000
      )
      WHEN '%[20]s' = 'p90' THEN quantile(0.90)(
        abs(CAST(t3_time AS Decimal(20,9)) - CAST(t2_time AS Decimal(20,9))) *1000
      )
      ELSE quantile(0.99)(
        abs(CAST(t3_time AS Decimal(20,9)) - CAST(t2_time AS Decimal(20,9))) *1000
      )
    END                                                                   AS latency
FROM joined_t3;`
	}

	return fmt.Sprintf(base+sel,
		containsErrorT1,
		containsErrorT2,
		containsErrorT3,
		latencyPointerT1,
		latencyPointerT2,
		latencyPointerT3,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		serviceNameT3,
		spanNameT3,
		clauseStep1,
		clauseStep2,
		clauseStep3,
		latencyTypeT2,
		latencyTypeT3,
	)
}
