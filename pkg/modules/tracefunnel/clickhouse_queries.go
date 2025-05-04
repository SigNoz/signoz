package tracefunnel

import (
	"fmt"
	"strings"
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
        AND (contains_error_t1 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t2 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
	)

	// Inject clauseStep1
	if clauseStep1 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "AND "+clauseStep1, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "", 1)
	}

	// Inject clauseStep2
	if clauseStep2 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "AND "+clauseStep2, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "", 1)
	}

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
        AND (contains_error_t1 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t2 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t3 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
	)

	if clauseStep1 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "AND "+clauseStep1, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep2 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "AND "+clauseStep2, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep3 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>", "AND "+clauseStep3, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>", "", 1)
	}

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
        AND (contains_error_t1 = 0 OR has_error = true)
        -- <<< INJECT clause_step1 HERE IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t2 = 0 OR has_error = true)
        -- <<< INJECT clause_step2 HERE IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
)

-- Join steps
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

-- Final metrics
, final AS (
    SELECT
        trace_id,
        abs(CAST(t2_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) AS duration_nanos,
        t1_has_error,
        t2_has_error
    FROM joined
)
SELECT
    round(count() / (SELECT count() FROM step1) * 100, 2) AS conversion_rate,
    count() / time_window_sec AS avg_rate,
    countIf(t1_has_error OR t2_has_error) AS errors,
    avg(duration_nanos * 1000) AS avg_duration,
    quantile(0.99)(duration_nanos * 1000) AS p99_latency
FROM final;`

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
	)

	if clauseStep1 != "" {
		query = strings.Replace(query, "-- <<< INJECT clause_step1 HERE IN GO IF NOT EMPTY >>>", "AND "+clauseStep1, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT clause_step1 HERE IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep2 != "" {
		query = strings.Replace(query, "-- <<< INJECT clause_step2 HERE IN GO IF NOT EMPTY >>>", "AND "+clauseStep2, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT clause_step2 HERE IN GO IF NOT EMPTY >>>", "", 1)
	}

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
        AND (contains_error_t1 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t2 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t3 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
)

-- Join steps and apply ordering
, joined AS (
    SELECT
        s1.trace_id,
        s1.first_time AS t1_time,
        s2.first_time AS t2_time,
        s3.first_time AS t3_time,
        s1.has_error_flag AS t1_has_error,
        s2.has_error_flag AS t2_has_error,
        s3.has_error_flag AS t3_has_error
    FROM step1 s1
    INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
    INNER JOIN step3 s3 ON s1.trace_id = s3.trace_id
    WHERE s2.first_time > s1.first_time AND s3.first_time > s2.first_time
)

-- Final metrics
SELECT
    round(count() / (SELECT count() FROM step1) * 100, 2) AS conversion_rate,
    count() / time_window_sec AS avg_rate,
    countIf(t1_has_error OR t2_has_error OR t3_has_error) AS errors,
    avg(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000) AS avg_duration,
    quantile(0.99)(abs(CAST(t3_time AS Decimal(20, 9)) - CAST(t1_time AS Decimal(20, 9))) * 1000) AS p99_latency
FROM joined;`

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
	)

	if clauseStep1 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "AND "+clauseStep1, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep2 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "AND "+clauseStep2, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep3 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>", "AND "+clauseStep3, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>", "", 1)
	}

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
        AND (contains_error_t1 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t2 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
	)

	if clauseStep1 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "AND "+clauseStep1, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep2 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "AND "+clauseStep2, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "", 1)
	}

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
        AND (contains_error_t1 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t2 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t3 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
	)

	if clauseStep1 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "AND "+clauseStep1, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep2 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "AND "+clauseStep2, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep3 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>", "AND "+clauseStep3, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step3 IN GO IF NOT EMPTY >>>", "", 1)
	}

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
        AND (contains_error_t1 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t2 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
	)

	if clauseStep1 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "AND "+clauseStep1, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep2 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "AND "+clauseStep2, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "", 1)
	}

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
        AND (contains_error_t1 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
        AND (contains_error_t2 = 0 OR has_error = true)
        -- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>
    GROUP BY trace_id
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
	)

	if clauseStep1 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "AND "+clauseStep1, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step1 IN GO IF NOT EMPTY >>>", "", 1)
	}

	if clauseStep2 != "" {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "AND "+clauseStep2, 1)
	} else {
		query = strings.Replace(query, "-- <<< INJECT AND clause_step2 IN GO IF NOT EMPTY >>>", "", 1)
	}

	return query
}
