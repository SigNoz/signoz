package tracefunnel

import (
	"fmt"
)

// Helper function to format clause with AND if not empty
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
    toDateTime64(%[3]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[4]d / 1000000000, 9) AS end_ts,
    '%[5]s' AS service_name_t1,
    '%[6]s' AS span_name_t1,
    '%[7]s' AS service_name_t2,
    '%[8]s' AS span_name_t2
-- Step 1: first span
, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[9]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 2: first span
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[10]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Join steps to validate funnel ordering
, joined AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
SELECT trace_id
FROM joined
ORDER BY t1_time
LIMIT 5;`

	// Fill in the top variables
	query := fmt.Sprintf(queryTemplate,
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

	return query
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
    toDateTime64(%[4]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[5]d / 1000000000, 9) AS end_ts,
    '%[6]s' AS service_name_t1,
    '%[7]s' AS span_name_t1,
    '%[8]s' AS service_name_t2,
    '%[9]s' AS span_name_t2,
    '%[10]s' AS service_name_t3,
    '%[11]s' AS span_name_t3
-- Step 1
, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[12]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 2
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[13]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 3
, step3 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t3
        AND name = span_name_t3
        AND (contains_error_t3 = 0 OR has_error = true) %[14]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Join steps to validate funnel ordering
, joined AS (
    SELECT
        s1.trace_id AS trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s3.first_time AS t3_time
    FROM step1 AS s1
    INNER JOIN step2 AS s2 ON s1.trace_id = s2.trace_id
    INNER JOIN step3 AS s3 ON s1.trace_id = s3.trace_id
    WHERE s2.first_time > s1.first_time
      AND s3.first_time > s2.first_time
)
SELECT trace_id
FROM joined
ORDER BY t1_time
LIMIT 5;`

	query := fmt.Sprintf(queryTemplate,
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

	return query
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
    toDateTime64(%[5]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[6]d / 1000000000, 9) AS end_ts,
    (%[6]d - %[5]d) / 1000000000 AS time_window_sec,
    '%[7]s' AS service_name_t1,
    '%[8]s' AS span_name_t1,
    '%[9]s' AS service_name_t2,
    '%[10]s' AS span_name_t2
-- Step 1
, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[11]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 2
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[12]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Join steps
, joined AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s1.has_error_flag AS s1_has_error,
        s2.has_error_flag AS s2_has_error
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
-- Error counts for each step
, errors_step1 AS (SELECT countIf(has_error_flag) AS errors FROM step1)
, errors_step2 AS (SELECT countIf(has_error_flag) AS errors FROM step2)
SELECT
    round((count(DISTINCT joined.trace_id) * 100.0) / (SELECT count(DISTINCT joined.trace_id) FROM step1), 2) AS conversion_rate,
    count(DISTINCT joined.trace_id) / time_window_sec AS avg_rate,
    greatest((SELECT errors FROM errors_step1), (SELECT errors FROM errors_step2)) AS errors,
    avg(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000) AS avg_duration,
    quantile(0.99)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000) AS p99_latency
FROM joined;`

	query := fmt.Sprintf(queryTemplate,
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
	)

	return query
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
    toDateTime64(%[7]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[8]d / 1000000000, 9) AS end_ts,
    (%[8]d - %[7]d) / 1000000000 AS time_window_sec,
    '%[9]s' AS service_name_t1,
    '%[10]s' AS span_name_t1,
    '%[11]s' AS service_name_t2,
    '%[12]s' AS span_name_t2,
    '%[13]s' AS service_name_t3,
    '%[14]s' AS span_name_t3
-- Step 1
, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[15]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 2
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[16]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 3
, step3 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t3
        AND name = span_name_t3
        AND (contains_error_t3 = 0 OR has_error = true) %[17]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Join T1 and T2
, joined_t2 AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s1.has_error_flag AS s1_has_error,
        s2.has_error_flag AS s2_has_error
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
-- Join with T3 for complete funnel
, joined_t3 AS (
    SELECT
        j2.trace_id,
        j2.t1_time,
        j2.t2_time,
        s3.first_time AS t3_time,
        j2.s1_has_error,
        j2.s2_has_error,
        s3.has_error_flag AS s3_has_error
    FROM joined_t2 j2
    INNER JOIN step3 s3 ON j2.trace_id = s3.trace_id
    WHERE s3.first_time > j2.t2_time
)
-- Error counts for each step
, errors_step1 AS (SELECT countIf(has_error_flag) AS errors FROM step1)
, errors_step2 AS (SELECT countIf(has_error_flag) AS errors FROM step2)
, errors_step3 AS (SELECT countIf(has_error_flag) AS errors FROM step3)
SELECT
    round((count(DISTINCT joined_t3.trace_id) * 100.0) / (SELECT count(DISTINCT trace_id) FROM step1), 2) AS conversion_rate,
    count(DISTINCT joined_t3.trace_id) / time_window_sec AS avg_rate,
    greatest((SELECT errors FROM errors_step1), (SELECT errors FROM errors_step2), (SELECT errors FROM errors_step3)) AS errors,
    avg(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000) AS avg_duration,
    quantile(0.99)(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000) AS p99_latency
FROM joined_t3;`

	query := fmt.Sprintf(queryTemplate,
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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
		formatClause(clauseStep3),
	)

	return query
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
	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    '%[3]s' AS latency_pointer_t1,
    '%[4]s' AS latency_pointer_t2,
    toDateTime64(%[5]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[6]d / 1000000000, 9) AS end_ts,
    (%[6]d - %[5]d) / 1000000000 AS time_window_sec,
    '%[7]s' AS service_name_t1,
    '%[8]s' AS span_name_t1,
    '%[9]s' AS service_name_t2,
    '%[10]s' AS span_name_t2
-- Step 1
, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[11]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 2
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[12]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Join steps
, joined AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s1.has_error_flag AS s1_has_error,
        s2.has_error_flag AS s2_has_error
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
-- Error counts for each step
, errors_step1 AS (SELECT countIf(has_error_flag) AS errors FROM step1)
, errors_step2 AS (SELECT countIf(has_error_flag) AS errors FROM step2)
SELECT
    round((count(DISTINCT joined.trace_id) * 100.0) / (SELECT count(DISTINCT joined.trace_id) FROM step1), 2) AS conversion_rate,
    count(DISTINCT joined.trace_id) / time_window_sec AS avg_rate,
    greatest((SELECT errors FROM errors_step1), (SELECT errors FROM errors_step2)) AS errors,
    avg(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000) AS avg_duration,
    CASE 
        WHEN '%[13]s' = 'p99' THEN quantile(0.99)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000)
        WHEN '%[13]s' = 'p95' THEN quantile(0.95)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000)
        WHEN '%[13]s' = 'p90' THEN quantile(0.90)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000)
        ELSE quantile(0.99)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000)
    END AS latency
FROM joined;`

	query := fmt.Sprintf(queryTemplate,
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

	return query
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
	// Common WITH and CTEs for all cases
	baseQuery := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    %[3]d AS contains_error_t3,
    '%[4]s' AS latency_pointer_t1,
    '%[5]s' AS latency_pointer_t2,
    '%[6]s' AS latency_pointer_t3,
    toDateTime64(%[7]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[8]d / 1000000000, 9) AS end_ts,
    (%[8]d - %[7]d) / 1000000000 AS time_window_sec,
    '%[9]s' AS service_name_t1,
    '%[10]s' AS span_name_t1,
    '%[11]s' AS service_name_t2,
    '%[12]s' AS span_name_t2,
    '%[13]s' AS service_name_t3,
    '%[14]s' AS span_name_t3
-- Step 1
, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[15]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 2
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[16]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 3
, step3 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t3
        AND name = span_name_t3
        AND (contains_error_t3 = 0 OR has_error = true) %[17]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Join T1 and T2
, joined_t2 AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s1.has_error_flag AS s1_has_error,
        s2.has_error_flag AS s2_has_error
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
-- Join with T3 for complete funnel
, joined_t3 AS (
    SELECT
        j2.trace_id,
        j2.t1_time,
        j2.t2_time,
        s3.first_time AS t3_time,
        j2.s1_has_error,
        j2.s2_has_error,
        s3.has_error_flag AS s3_has_error
    FROM joined_t2 j2
    INNER JOIN step3 s3 ON j2.trace_id = s3.trace_id
    WHERE s3.first_time > j2.t2_time
)
-- Error counts for each step
, errors_step1 AS (SELECT countIf(has_error_flag) AS errors FROM step1)
, errors_step2 AS (SELECT countIf(has_error_flag) AS errors FROM step2)
, errors_step3 AS (SELECT countIf(has_error_flag) AS errors FROM step3)
`

	var selectQuery string
	// Dynamically select the correct SELECT statement based on stepStart and stepEnd
	if stepStart == 1 && stepEnd == 2 {
		// Metrics for step1 -> step2 (joined_t2)
		selectQuery = `
SELECT
    round((count(DISTINCT trace_id) * 100.0) / (SELECT count(DISTINCT trace_id) FROM step1), 2) AS conversion_rate,
    count(DISTINCT trace_id) / time_window_sec AS avg_rate,
    greatest((SELECT errors FROM errors_step1), (SELECT errors FROM errors_step2)) AS errors,
    avg(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000) AS avg_duration,
    CASE 
        WHEN '%[18]s' = 'p99' THEN quantile(0.99)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000)
        WHEN '%[18]s' = 'p95' THEN quantile(0.95)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000)
        WHEN '%[18]s' = 'p90' THEN quantile(0.90)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000)
        ELSE quantile(0.99)(abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000)
    END AS latency
FROM joined_t2`
	} else if stepStart == 2 && stepEnd == 3 {
		// Metrics for step2 -> step3 (joined_t3)
		selectQuery = `
SELECT
    round((count(DISTINCT trace_id) * 100.0) / (SELECT count(DISTINCT trace_id) FROM joined_t2), 2) AS conversion_rate,
    count(DISTINCT trace_id) / time_window_sec AS avg_rate,
    greatest((SELECT errors FROM errors_step2), (SELECT errors FROM errors_step3)) AS errors,
    avg(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t2_time AS Decimal(20, 9))) * 1000) AS avg_duration,
    CASE 
        WHEN '%[19]s' = 'p99' THEN quantile(0.99)(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t2_time AS Decimal(20, 9))) * 1000)
        WHEN '%[19]s' = 'p95' THEN quantile(0.95)(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t2_time AS Decimal(20, 9))) * 1000)
        WHEN '%[19]s' = 'p90' THEN quantile(0.90)(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t2_time AS Decimal(20, 9))) * 1000)
        ELSE quantile(0.99)(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t2_time AS Decimal(20, 9))) * 1000)
    END AS latency
FROM joined_t3;`
	} else {
		// Fallback: return empty result
		selectQuery = `SELECT 0 AS conversion_rate, 0 AS avg_rate, 0 AS errors, 0 AS avg_duration, 0 AS latency;`
	}

	query := fmt.Sprintf(baseQuery+selectQuery,
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
		formatClause(clauseStep1),
		formatClause(clauseStep2),
		formatClause(clauseStep3),
		latencyTypeT2,
		latencyTypeT3,
	)

	return query
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
    toDateTime64(%[3]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[4]d / 1000000000, 9) AS end_ts,
    '%[5]s' AS service_name_t1,
    '%[6]s' AS span_name_t1,
    '%[7]s' AS service_name_t2,
    '%[8]s' AS span_name_t2
-- Step 1
, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[9]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 2
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[10]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Join T1 and T2 and apply ordering
, joined AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s1.has_error_flag AS t1_has_error,
        s2.has_error_flag AS t2_has_error
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
-- Final counts
SELECT
    (SELECT count() FROM step1) AS total_s1_spans,
    (SELECT countIf(has_error_flag) FROM step1) AS total_s1_errored_spans,
    count() AS total_s2_spans,
    countIf(t2_has_error) AS total_s2_errored_spans
FROM joined;`

	query := fmt.Sprintf(queryTemplate,
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

	return query
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
    toDateTime64(%[4]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[5]d / 1000000000, 9) AS end_ts,
    '%[6]s' AS service_name_t1,
    '%[7]s' AS span_name_t1,
    '%[8]s' AS service_name_t2,
    '%[9]s' AS span_name_t2,
    '%[10]s' AS service_name_t3,
    '%[11]s' AS span_name_t3
-- Step 1
, step1 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[12]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 2
, step2 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[13]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Step 3
, step3 AS (
    SELECT
        trace_id,
        argMin(timestamp, timestamp) AS first_time,
        argMin(has_error, timestamp) AS has_error_flag
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t3
        AND name = span_name_t3
        AND (contains_error_t3 = 0 OR has_error = true) %[14]s
    GROUP BY trace_id
    LIMIT 100000
)
-- Join T1 and T2
, joined_t2 AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s1.has_error_flag AS t1_has_error,
        s2.has_error_flag AS t2_has_error
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
-- Join T2 and T3
, joined_t3 AS (
    SELECT
        j2.trace_id,
        j2.t1_time,
        j2.t2_time,
        s3.first_time AS t3_time,
        j2.t1_has_error,
        j2.t2_has_error,
        s3.has_error_flag AS t3_has_error
    FROM joined_t2 j2
    INNER JOIN step3 s3 ON j2.trace_id = s3.trace_id
    WHERE s3.first_time > j2.t2_time
)
-- Final counts
SELECT
    (SELECT count() FROM step1) AS total_s1_spans,
    (SELECT countIf(has_error_flag) FROM step1) AS total_s1_errored_spans,
    (SELECT count() FROM joined_t2) AS total_s2_spans,
    (SELECT countIf(t2_has_error) FROM joined_t2) AS total_s2_errored_spans,
    count() AS total_s3_spans,
    countIf(t3_has_error) AS total_s3_errored_spans
FROM joined_t3;`

	query := fmt.Sprintf(queryTemplate,
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

	return query
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
    toDateTime64(%[3]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[4]d / 1000000000, 9) AS end_ts,
    '%[5]s' AS service_name_t1,
    '%[6]s' AS span_name_t1,
    '%[7]s' AS service_name_t2,
    '%[8]s' AS span_name_t2
-- Step 1: first span
, step1_first AS (
    SELECT trace_id, min(timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[9]s
    GROUP BY trace_id
    LIMIT 100000
), step1 AS (
    SELECT s1.trace_id, s1.timestamp AS first_time
    FROM signoz_traces.signoz_index_v3 s1
    INNER JOIN step1_first f1 ON s1.trace_id = f1.trace_id AND s1.timestamp = f1.first_time
)
-- Step 2: first span
, step2_first AS (
    SELECT trace_id, min(timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[10]s
    GROUP BY trace_id
    LIMIT 100000
), step2 AS (
    SELECT s2.trace_id, s2.timestamp AS first_time
    FROM signoz_traces.signoz_index_v3 s2
    INNER JOIN step2_first f2 ON s2.trace_id = f2.trace_id AND s2.timestamp = f2.first_time
)
-- Join T1 and T2
, joined AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
-- Calculate duration in milliseconds
, final AS (
    SELECT
        trace_id,
        abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000 AS duration_ms
    FROM joined
)
-- Count spans per trace
, span_counts AS (
    SELECT trace_id, count() AS span_count
    FROM signoz_traces.signoz_index_v3
    WHERE timestamp BETWEEN start_ts AND end_ts
    GROUP BY trace_id
)
-- Final selection: top 5 slowest traces
SELECT
    f.trace_id,
    f.duration_ms,
    s.span_count
FROM final f
INNER JOIN span_counts s ON f.trace_id = s.trace_id
ORDER BY f.duration_ms DESC
LIMIT 5;`

	query := fmt.Sprintf(queryTemplate,
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

	return query
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
    toDateTime64(%[3]d / 1000000000, 9) AS start_ts,
    toDateTime64(%[4]d / 1000000000, 9) AS end_ts,
    '%[5]s' AS service_name_t1,
    '%[6]s' AS span_name_t1,
    '%[7]s' AS service_name_t2,
    '%[8]s' AS span_name_t2
-- Step 1: first span
, step1_first AS (
    SELECT trace_id, min(timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t1
        AND name = span_name_t1
        AND (contains_error_t1 = 0 OR has_error = true) %[9]s
    GROUP BY trace_id
    LIMIT 100000
), step1 AS (
    SELECT s1.trace_id, s1.timestamp AS first_time, s1.has_error AS has_error_flag
    FROM signoz_traces.signoz_index_v3 s1
    INNER JOIN step1_first f1 ON s1.trace_id = f1.trace_id AND s1.timestamp = f1.first_time
)
-- Step 2: first span
, step2_first AS (
    SELECT trace_id, min(timestamp) AS first_time
    FROM signoz_traces.signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND serviceName = service_name_t2
        AND name = span_name_t2
        AND (contains_error_t2 = 0 OR has_error = true) %[10]s
    GROUP BY trace_id
    LIMIT 100000
), step2 AS (
    SELECT s2.trace_id, s2.timestamp AS first_time, s2.has_error AS has_error_flag
    FROM signoz_traces.signoz_index_v3 s2
    INNER JOIN step2_first f2 ON s2.trace_id = f2.trace_id AND s2.timestamp = f2.first_time
)
-- Join T1 and T2
, joined AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s1.has_error_flag AS t1_has_error,
        s2.has_error_flag AS t2_has_error
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    WHERE s2.first_time > s1.first_time
)
-- Calculate duration in milliseconds and filter error traces
, final AS (
    SELECT
        trace_id,
        abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000 AS duration_ms,
        t1_has_error,
        t2_has_error
    FROM joined
    WHERE t1_has_error OR t2_has_error
)
-- Count spans per trace
, span_counts AS (
    SELECT trace_id, count() AS span_count
    FROM signoz_traces.signoz_index_v3
    WHERE timestamp BETWEEN start_ts AND end_ts
    GROUP BY trace_id
)
-- Final selection: top 5 slowest error traces
SELECT
    f.trace_id,
    f.duration_ms,
    s.span_count
FROM final f
INNER JOIN span_counts s ON f.trace_id = s.trace_id
ORDER BY f.duration_ms DESC
LIMIT 5;`

	query := fmt.Sprintf(queryTemplate,
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

	return query
}
