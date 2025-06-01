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
    %[1]d    AS contains_error_t1,
    %[2]d    AS contains_error_t2,
    '%[3]s'  AS latency_pointer_t1,
    '%[4]s'  AS latency_pointer_t2,
    toDateTime64(%[5]d/1e9, 9) AS start_ts,
    toDateTime64(%[6]d/1e9, 9) AS end_ts,
    (%[6]d - %[5]d)/1e9        AS time_window_sec,

    ('%[7]s','%[8]s') AS step1,
    ('%[9]s','%[10]s') AS step2

, funnel AS (
    SELECT
        trace_id,
        minIf(timestamp, serviceName=step1.1 AND name=step1.2) AS t1_time,
        minIf(timestamp, serviceName=step2.1 AND name=step2.2) AS t2_time,
        anyIf(has_error, serviceName=step1.1 AND name=step1.2)   AS s1_error,
        anyIf(has_error, serviceName=step2.1 AND name=step2.2)   AS s2_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName=step1.1 AND name=step1.2 AND (contains_error_t1=0 OR has_error=true) %[11]s)
         OR
            (serviceName=step2.1 AND name=step2.2 AND (contains_error_t2=0 OR has_error=true) %[12]s)
        )
    GROUP BY trace_id
)

, totals AS (
    SELECT
        countIf(t1_time>0)                                         AS total_s1_spans,
        countIf(t1_time>0 AND t2_time>t1_time)                     AS total_s2_spans,
        countIf(t1_time>0 AND t2_time>0)                           AS total_s2_raw_spans,
        sum(s1_error)                                              AS sum_s1_error,
        sum(s2_error)                                              AS sum_s2_error,
        avg((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6)     AS avg_duration,
        quantile(0.99)((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6) AS latency
    FROM funnel
)

SELECT
    round(total_s2_spans * 100.0 / total_s1_spans, 2)  AS conversion_rate,
    total_s2_raw_spans / time_window_sec               AS avg_rate,
    greatest(sum_s1_error, sum_s2_error)               AS errors,
    avg_duration,
    latency
FROM totals;
`
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
    %[1]d    AS contains_error_t1,
    %[2]d    AS contains_error_t2,
    %[3]d    AS contains_error_t3,
    '%[4]s'  AS latency_pointer_t1,
    '%[5]s'  AS latency_pointer_t2,
    '%[6]s'  AS latency_pointer_t3,
    toDateTime64(%[7]d/1e9,9) AS start_ts,
    toDateTime64(%[8]d/1e9,9) AS end_ts,
    (%[8]d - %[7]d)/1e9      AS time_window_sec,

    ('%[9]s','%[10]s') AS step1,
    ('%[11]s','%[12]s') AS step2,
    ('%[13]s','%[14]s') AS step3

, funnel AS (
    SELECT
        trace_id,
        minIf(timestamp, serviceName=step1.1 AND name=step1.2) AS t1_time,
        minIf(timestamp, serviceName=step2.1 AND name=step2.2) AS t2_time,
        minIf(timestamp, serviceName=step3.1 AND name=step3.2) AS t3_time,
        anyIf(has_error, serviceName=step1.1 AND name=step1.2)   AS s1_error,
        anyIf(has_error, serviceName=step2.1 AND name=step2.2)   AS s2_error,
        anyIf(has_error, serviceName=step3.1 AND name=step3.2)   AS s3_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (serviceName=step1.1 AND name=step1.2 AND (contains_error_t1=0 OR has_error=true) %[15]s)
         OR (serviceName=step2.1 AND name=step2.2 AND (contains_error_t2=0 OR has_error=true) %[16]s)
         OR (serviceName=step3.1 AND name=step3.2 AND (contains_error_t3=0 OR has_error=true) %[17]s)
        )
    GROUP BY trace_id
)

, totals AS (
    SELECT
        countIf(t1_time > 0)                                                   AS total_s1_spans,
        countIf(t1_time > 0 AND t2_time > t1_time)                              AS total_s2_spans,
        countIf(t1_time > 0 AND t2_time > t1_time AND t3_time > t2_time)        AS total_s3_spans,
        sum(s1_error)                                                           AS sum_s1_error,
        sum(s2_error)                                                           AS sum_s2_error,
        sum(s3_error)                                                           AS sum_s3_error,
        avg((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6)                  AS avg_duration,
        quantile(0.99)((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6)       AS latency
    FROM funnel
)

SELECT
    round(total_s3_spans * 100.0 / total_s1_spans, 2)                         AS conversion_rate,
    total_s2_spans / time_window_sec                                          AS avg_rate,
    greatest(sum_s1_error, sum_s2_error, sum_s3_error)                         AS errors,
    avg_duration,
    latency
FROM totals;
`
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
    (toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6 AS duration_ms,
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
    (toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6 AS duration_ms,
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
    toDateTime64(%[5]d/1e9,9) AS start_ts,
    toDateTime64(%[6]d/1e9,9) AS end_ts,
    (%[6]d - %[5]d)/1e9      AS time_window_sec,

    ('%[7]s','%[8]s')        AS step1,
    ('%[9]s','%[10]s')       AS step2

, funnel AS (
    SELECT
        trace_id,
        minIf(timestamp, serviceName = step1.1 AND name = step1.2) AS t1_time,
        minIf(timestamp, serviceName = step2.1 AND name = step2.2) AS t2_time,
        toUInt8(anyIf(has_error, serviceName = step1.1 AND name = step1.2)) AS s1_error,
        toUInt8(anyIf(has_error, serviceName = step2.1 AND name = step2.2)) AS s2_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName IN (step1.1, step2.1)
        AND name       IN (step1.2, step2.2)
        AND ((%[1]d = 0) OR (has_error AND serviceName = step1.1 AND name = step1.2))
        AND ((%[2]d = 0) OR (has_error AND serviceName = step2.1 AND name = step2.2))
        %[11]s
        %[12]s
    GROUP BY trace_id
)

, totals AS (
    SELECT
        countIf(t1_time > 0)                                        AS total_s1_spans,
        countIf(t1_time > 0 AND t2_time > t1_time)                  AS total_s2_spans,
        greatest(sum(s1_error), sum(s2_error))                      AS errors,
        avg((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6)      AS avg_duration,
        quantile(%[13]s)((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6) AS latency
    FROM funnel
)

SELECT
    round(total_s2_spans * 100.0 / total_s1_spans, 2) AS conversion_rate,
    total_s2_spans / time_window_sec                  AS avg_rate,
    errors,
    avg_duration,
    latency
FROM totals;`

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
	const baseTpl = `
WITH
    toDateTime64(%[7]d/1e9,9) AS start_ts,
    toDateTime64(%[8]d/1e9,9) AS end_ts,
    (%[8]d - %[7]d)/1e9       AS time_window_sec,

    ('%[9]s','%[10]s') AS step1,
    ('%[11]s','%[12]s') AS step2,
    ('%[13]s','%[14]s') AS step3,

    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    %[3]d AS contains_error_t3

, funnel AS (
    SELECT
        trace_id,
        minIf(timestamp, serviceName = step1.1 AND name = step1.2) AS t1_time,
        minIf(timestamp, serviceName = step2.1 AND name = step2.2) AS t2_time,
        minIf(timestamp, serviceName = step3.1 AND name = step3.2) AS t3_time,
        toUInt8(anyIf(has_error, serviceName = step1.1 AND name = step1.2)) AS s1_error,
        toUInt8(anyIf(has_error, serviceName = step2.1 AND name = step2.2)) AS s2_error,
        toUInt8(anyIf(has_error, serviceName = step3.1 AND name = step3.2)) AS s3_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName IN (step1.1, step2.1, step3.1)
        AND name       IN (step1.2, step2.2, step3.2)
        AND ((contains_error_t1=0) OR (has_error AND serviceName=step1.1 AND name=step1.2)) %[15]s
        AND ((contains_error_t2=0) OR (has_error AND serviceName=step2.1 AND name=step2.2)) %[16]s
        AND ((contains_error_t3=0) OR (has_error AND serviceName=step3.1 AND name=step3.2)) %[17]s
    GROUP BY trace_id
)

, totals AS (
    SELECT
        countIf(t1_time > 0)                                                     AS total_s1_spans,
        countIf(t1_time > 0 AND t2_time > t1_time)                                AS total_s2_spans,
        countIf(t1_time > 0 AND t2_time > t1_time AND t3_time > t2_time)          AS total_s3_spans,
        sum(s1_error)                                                             AS sum_s1_error,
        sum(s2_error)                                                             AS sum_s2_error,
        sum(s3_error)                                                             AS sum_s3_error,
        avg((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6)                    AS avg_duration_12,
        quantile(%[18]s)((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6)       AS latency_12,
        avg((toUnixTimestamp64Nano(t3_time) - toUnixTimestamp64Nano(t2_time)) / 1e6)                    AS avg_duration_23,
        quantile(%[19]s)((toUnixTimestamp64Nano(t3_time) - toUnixTimestamp64Nano(t2_time)) / 1e6)       AS latency_23
    FROM funnel
)
`

	const select12 = `
SELECT
    round(total_s2_spans * 100.0 / total_s1_spans, 2) AS conversion_rate,
    total_s2_spans / time_window_sec                AS avg_rate,
    greatest(sum_s1_error, sum_s2_error)             AS errors,
    avg_duration_12                                  AS avg_duration,
    latency_12                                       AS latency
FROM totals;
`

	const select23 = `
SELECT
    round(total_s3_spans * 100.0 / total_s2_spans, 2) AS conversion_rate,
    total_s3_spans / time_window_sec                AS avg_rate,
    greatest(sum_s2_error, sum_s3_error)             AS errors,
    avg_duration_23                                  AS avg_duration,
    latency_23                                       AS latency
FROM totals;
`

	var selectTpl string
	switch {
	case stepStart == 1 && stepEnd == 2:
		selectTpl = select12
	case stepStart == 2 && stepEnd == 3:
		selectTpl = select23
	default:
		selectTpl = `SELECT 0 AS conversion_rate, 0 AS avg_rate, 0 AS errors, 0 AS avg_duration, 0 AS latency;`
	}

	return fmt.Sprintf(
		baseTpl+selectTpl,
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
