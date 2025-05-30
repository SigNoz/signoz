package tracefunnel

import (
	"fmt"
)

func formatClause(clause string) string {
	if clause == "" {
		return ""
	}
	return fmt.Sprintf("%s", clause)
}

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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
		formatClause(clauseStep3),
	)
}

func BuildTwoStepFunnelOverviewQuery(
	containsErrorT1 int,
	containsErrorT2 int,
	latencyPointerT1 string,
	latencyPointerT2 string,
	startTs int64,
	endTs int64,
	serviceNameT1, spanNameT1, serviceNameT2, spanNameT2, clauseStep1, clauseStep2 string,
) string {
	const tpl = `
WITH
    toDateTime64(%[5]d / 1e9, 9) AS start_ts,
    toDateTime64(%[6]d / 1e9, 9) AS end_ts,
    (%[6]d - %[5]d) / 1e9      AS time_window_sec,

    ('%[7]s','%[8]s') AS step1,
    ('%[9]s','%[10]s') AS step2

, funnel AS (
    SELECT
        trace_id,
        minIf(timestamp, serviceName=step1.1 AND name=step1.2)       AS t1_time,
        minIf(duration_nano, serviceName=step1.1 AND name=step1.2)    AS d1_nano,
        minIf(timestamp, serviceName=step2.1 AND name=step2.2)       AS t2_time,
        minIf(duration_nano, serviceName=step2.1 AND name=step2.2)    AS d2_nano,
        anyIf(has_error, serviceName=step1.1 AND name=step1.2)        AS s1_error,
        anyIf(has_error, serviceName=step2.1 AND name=step2.2)        AS s2_error
    FROM signoz_traces.signoz_index_v3
    WHERE timestamp BETWEEN start_ts AND end_ts
      AND serviceName IN (step1.1, step2.1)
      AND name       IN (step1.2, step2.2)
    GROUP BY trace_id
)

, pointers AS (
    SELECT
        trace_id,
        -- choose start or end per pointerX
        if('%[1]s'='start',
           toUnixTimestamp64Nano(t1_time),
           toUnixTimestamp64Nano(t1_time) + d1_nano
        ) AS p1_ns,
        if('%[2]s'='start',
           toUnixTimestamp64Nano(t2_time),
           toUnixTimestamp64Nano(t2_time) + d2_nano
        ) AS p2_ns,
        s1_error, s2_error
    FROM funnel
    WHERE t1_time>0 AND t2_time>t1_time
)
SELECT
    round(countIf(p1_ns>0 AND p2_ns>0)*100.0/countIf(p1_ns>0),2)       AS conversion_rate,
    countIf(p1_ns>0 AND p2_ns>0)/time_window_sec                      AS avg_rate,
    greatest(sum(s1_error), sum(s2_error))                            AS errors,
    avg((p2_ns-p1_ns)/1e6)                                            AS avg_duration_ms,
    quantile(0.99)((p2_ns-p1_ns)/1e6)                                 AS p99_duration_ms
FROM pointers;
`
	return fmt.Sprintf(tpl,
		latencyPointerT1,
		latencyPointerT2,
		containsErrorT1,
		containsErrorT2,
		startTs,
		endTs,
		serviceNameT1,
		spanNameT1,
		serviceNameT2,
		spanNameT2,
		formatClause(clauseStep1),
		formatClause(clauseStep2),
	)
}

func BuildThreeStepFunnelOverviewQuery(
	containsErrorT1, containsErrorT2, containsErrorT3 int,
	latencyPointerT1, latencyPointerT2, latencyPointerT3 string,
	startTs, endTs int64,
	serviceNameT1, spanNameT1,
	serviceNameT2, spanNameT2,
	serviceNameT3, spanNameT3,
	clauseStep1, clauseStep2, clauseStep3 string,
) string {
	const tpl = `
WITH
    toDateTime64(%[7]d / 1e9,9) AS start_ts,
    toDateTime64(%[8]d / 1e9,9) AS end_ts,
    (%[8]d - %[7]d)/1e9         AS time_window_sec,

    ('%[9]s','%[10]s') AS step1,
    ('%[11]s','%[12]s') AS step2,
    ('%[13]s','%[14]s') AS step3

, funnel AS (
    SELECT
        trace_id,
        minIf(timestamp, serviceName=step1.1 AND name=step1.2)    AS t1_time,
        minIf(duration_nano, serviceName=step1.1 AND name=step1.2) AS d1_nano,
        minIf(timestamp, serviceName=step2.1 AND name=step2.2)    AS t2_time,
        minIf(duration_nano, serviceName=step2.1 AND name=step2.2) AS d2_nano,
        minIf(timestamp, serviceName=step3.1 AND name=step3.2)    AS t3_time,
        minIf(duration_nano, serviceName=step3.1 AND name=step3.2) AS d3_nano,
        anyIf(has_error, serviceName=step1.1 AND name=step1.2)     AS s1_error,
        anyIf(has_error, serviceName=step2.1 AND name=step2.2)     AS s2_error,
        anyIf(has_error, serviceName=step3.1 AND name=step3.2)     AS s3_error
    FROM signoz_traces.signoz_index_v3
    WHERE timestamp BETWEEN start_ts AND end_ts
      AND serviceName IN (step1.1,step2.1,step3.1)
      AND name       IN (step1.2,step2.2,step3.2)
    GROUP BY trace_id
)

, pointers AS (
    SELECT
        trace_id,
        if('%[1]s'='start', toUnixTimestamp64Nano(t1_time), toUnixTimestamp64Nano(t1_time)+d1_nano) AS p1_ns,
        if('%[2]s'='start', toUnixTimestamp64Nano(t2_time), toUnixTimestamp64Nano(t2_time)+d2_nano) AS p2_ns,
        if('%[3]s'='start', toUnixTimestamp64Nano(t3_time), toUnixTimestamp64Nano(t3_time)+d3_nano) AS p3_ns,
        s1_error,s2_error,s3_error
    FROM funnel
    WHERE t1_time>0 AND t2_time>t1_time AND t3_time>t2_time
)
SELECT
    round(countIf(p1_ns>0 AND p2_ns>p1_ns AND p3_ns>p2_ns)*100.0/countIf(p1_ns>0),2) AS conversion_rate,
    countIf(p1_ns>0 AND p2_ns>p1_ns)/time_window_sec                      AS avg_rate_step1_to_2,
    greatest(sum(s1_error),sum(s2_error),sum(s3_error))                     AS errors,
    avg((p2_ns-p1_ns)/1e6)                                                  AS avg_duration_ms,
    quantile(0.99)((p2_ns-p1_ns)/1e6)                                       AS p99_duration_ms
FROM pointers;
`
	return fmt.Sprintf(tpl,
		latencyPointerT1,
		latencyPointerT2,
		latencyPointerT3,
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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
		formatClause(clauseStep3),
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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
		formatClause(clauseStep3),
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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
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
    (%[6]d - %[5]d)/1e9                   AS time_window_sec,

    ('%[7]s','%[8]s') AS step1,
    ('%[9]s','%[10]s') AS step2

, funnel AS (
    SELECT
        trace_id,
        minIf(timestamp,    serviceName=step1.1 AND name=step1.2) AS t1_time,
        minIf(duration_nano, serviceName=step1.1 AND name=step1.2) AS d1_nano,
        minIf(timestamp,    serviceName=step2.1 AND name=step2.2) AS t2_time,
        minIf(duration_nano, serviceName=step2.1 AND name=step2.2) AS d2_nano,
        toUInt8(anyIf(has_error, serviceName=step1.1 AND name=step1.2)) AS s1_error,
        toUInt8(anyIf(has_error, serviceName=step2.1 AND name=step2.2)) AS s2_error
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName IN (step1.1, step2.1)
        AND name       IN (step1.2, step2.2)
        AND ((%[1]d=0) OR (has_error AND serviceName=step1.1 AND name=step1.2))
        AND ((%[2]d=0) OR (has_error AND serviceName=step2.1 AND name=step2.2))
        %[11]s
        %[12]s
    GROUP BY trace_id
)

, pointers AS (
    SELECT
        trace_id,
        if('%[3]s'='start',
           toUnixTimestamp64Nano(t1_time),
           toUnixTimestamp64Nano(t1_time)+d1_nano
        ) AS p1_ns,
        if('%[4]s'='start',
           toUnixTimestamp64Nano(t2_time),
           toUnixTimestamp64Nano(t2_time)+d2_nano
        ) AS p2_ns,
        s1_error,
        s2_error
    FROM funnel
    WHERE t1_time>0 AND p2_ns>p1_ns
)

SELECT
    round(countIf(p1_ns>0 AND p2_ns>p1_ns)*100.0/countIf(p1_ns>0),2)                           AS conversion_rate,
    countIf(p1_ns>0 AND p2_ns>p1_ns)/time_window_sec                                           AS avg_rate,
    greatest(sum(s1_error), sum(s2_error))                                                      AS errors,
    avg((p2_ns - p1_ns)/1e6)                                                                    AS avg_duration_ms,
    CASE
      WHEN '%[13]s'='p99' THEN quantile(0.99)((p2_ns - p1_ns)/1e6)
      WHEN '%[13]s'='p95' THEN quantile(0.95)((p2_ns - p1_ns)/1e6)
      WHEN '%[13]s'='p90' THEN quantile(0.90)((p2_ns - p1_ns)/1e6)
      ELSE quantile(0.99)((p2_ns - p1_ns)/1e6)
    END                                                                                         AS latency
FROM pointers;`

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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
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
	const base = `
WITH
    toDateTime64(%[7]d/1e9,9) AS start_ts,
    toDateTime64(%[8]d/1e9,9) AS end_ts,
    (%[8]d-%[7]d)/1e9               AS time_window_sec,

    ('%[9]s','%[10]s') AS step1,
    ('%[11]s','%[12]s') AS step2,
    ('%[13]s','%[14]s') AS step3

, funnel AS (
    SELECT
        trace_id,
        minIf(timestamp,    serviceName=step1.1 AND name=step1.2) AS t1_time,
        minIf(duration_nano, serviceName=step1.1 AND name=step1.2) AS d1_nano,
        minIf(timestamp,    serviceName=step2.1 AND name=step2.2) AS t2_time,
        minIf(duration_nano, serviceName=step2.1 AND name=step2.2) AS d2_nano,
        minIf(timestamp,    serviceName=step3.1 AND name=step3.2) AS t3_time,
        minIf(duration_nano, serviceName=step3.1 AND name=step3.2) AS d3_nano,
        toUInt8(anyIf(has_error, serviceName=step1.1 AND name=step1.2)) AS s1_error,
        toUInt8(anyIf(has_error, serviceName=step2.1 AND name=step2.2)) AS s2_error,
        toUInt8(anyIf(has_error, serviceName=step3.1 AND name=step3.2)) AS s3_error
    FROM signoz_traces.signoz_index_v3
    WHERE timestamp BETWEEN start_ts AND end_ts
      AND serviceName IN (step1.1, step2.1, step3.1)
      AND name       IN (step1.2, step2.2, step3.2)
      AND ((%[4]d=0) OR (has_error AND serviceName=step1.1 AND name=step1.2))
      AND ((%[5]d=0) OR (has_error AND serviceName=step2.1 AND name=step2.2))
      AND ((%[6]d=0) OR (has_error AND serviceName=step3.1 AND name=step3.2))
      %[15]s
      %[16]s
      %[17]s
    GROUP BY trace_id
)
, pointers AS (
    SELECT
        trace_id,
        if('%[1]s'='start', toUnixTimestamp64Nano(t1_time), toUnixTimestamp64Nano(t1_time)+d1_nano) AS p1_ns,
        if('%[2]s'='start', toUnixTimestamp64Nano(t2_time), toUnixTimestamp64Nano(t2_time)+d2_nano) AS p2_ns,
        if('%[3]s'='start', toUnixTimestamp64Nano(t3_time), toUnixTimestamp64Nano(t3_time)+d3_nano) AS p3_ns,
        s1_error, s2_error, s3_error
    FROM funnel
    WHERE t1_time>0 AND t2_time>t1_time AND t3_time>t2_time
)
`
	var sel string
	if stepStart == 1 && stepEnd == 2 {
		sel = `
SELECT
    round(countIf(p1_ns>0 AND p2_ns>p1_ns)*100.0/countIf(p1_ns>0),2)     AS conversion_rate,
    countIf(p1_ns>0 AND p2_ns>p1_ns)/time_window_sec                  AS avg_rate,
    greatest(sum(s1_error),sum(s2_error))                              AS errors,
    avg((p2_ns-p1_ns)/1e6)                                             AS avg_duration_ms,
    CASE
      WHEN '%[18]s'='p99' THEN quantile(0.99)((p2_ns-p1_ns)/1e6)
      WHEN '%[18]s'='p95' THEN quantile(0.95)((p2_ns-p1_ns)/1e6)
      WHEN '%[18]s'='p90' THEN quantile(0.90)((p2_ns-p1_ns)/1e6)
      ELSE quantile(0.99)((p2_ns-p1_ns)/1e6)
    END                                                               AS latency
FROM pointers;`
	} else {
		sel = `
SELECT
    round(countIf(p2_ns>0 AND p3_ns>p2_ns)*100.0/countIf(p2_ns>0),2)     AS conversion_rate,
    countIf(p2_ns>0 AND p3_ns>p2_ns)/time_window_sec                  AS avg_rate,
    greatest(sum(s2_error),sum(s3_error))                              AS errors,
    avg((p3_ns-p2_ns)/1e6)                                             AS avg_duration_ms,
    CASE
      WHEN '%[19]s'='p99' THEN quantile(0.99)((p3_ns-p2_ns)/1e6)
      WHEN '%[19]s'='p95' THEN quantile(0.95)((p3_ns-p2_ns)/1e6)
      WHEN '%[19]s'='p90' THEN quantile(0.90)((p3_ns-p2_ns)/1e6)
      ELSE quantile(0.99)((p3_ns-p2_ns)/1e6)
    END                                                               AS latency
FROM pointers;`
	}

	return fmt.Sprintf(
		base+sel,
		latencyPointerT1,
		latencyPointerT2,
		latencyPointerT3,
		containsErrorT1,
		containsErrorT2,
		containsErrorT3,
		startTs,
		endTs,
		serviceNameT1, spanNameT1,
		serviceNameT2, spanNameT2,
		serviceNameT3, spanNameT3,
		formatClause(clauseStep1),
		formatClause(clauseStep2),
		formatClause(clauseStep3),
		latencyTypeT2,
		latencyTypeT3,
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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
	)
}
