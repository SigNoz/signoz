package tracefunnel

import (
	"fmt"
	"strings"
)

// BuildFunnelValidationQuery builds a validation query for n-step funnels
func BuildFunnelValidationQuery(
	steps []struct {
		ServiceName   string
		SpanName      string
		ContainsError int
		Clause        string
	},
	startTs int64,
	endTs int64,
) string {
	numSteps := len(steps)

	// Build WITH clause
	withParts := []string{
		fmt.Sprintf("toDateTime64(%d/1e9, 9) AS start_ts", startTs),
		fmt.Sprintf("toDateTime64(%d/1e9, 9) AS end_ts", endTs),
	}

	// Add contains_error and step definitions
	for i, step := range steps {
		withParts = append(withParts, fmt.Sprintf("%d AS contains_error_t%d", step.ContainsError, i+1))
		withParts = append(withParts, fmt.Sprintf("('%s','%s') AS step%d", step.ServiceName, step.SpanName, i+1))
	}

	// Build SELECT fields for each step time
	selectFields := []string{"trace_id"}
	for i := 0; i < numSteps; i++ {
		selectFields = append(selectFields, fmt.Sprintf("minIf(timestamp, resource_string_service$$name = step%d.1 AND name = step%d.2) AS t%d_time", i+1, i+1, i+1))
	}

	// Build WHERE conditions
	whereConditions := []string{"timestamp BETWEEN start_ts AND end_ts"}
	orConditions := []string{}
	for i, step := range steps {
		condition := fmt.Sprintf("(resource_string_service$$name = step%d.1 AND name = step%d.2 AND (contains_error_t%d = 0 OR has_error = true) %s)",
			i+1, i+1, i+1, step.Clause)
		orConditions = append(orConditions, condition)
	}
	if len(orConditions) > 0 {
		whereConditions = append(whereConditions, fmt.Sprintf("(%s)", strings.Join(orConditions, " OR ")))
	}

	queryTemplate := `
WITH
    %s

SELECT
    trace_id
FROM (
    SELECT
        %s
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE
        %s
    GROUP BY trace_id
    HAVING t1_time > 0
)
ORDER BY t1_time
LIMIT 5;`

	return fmt.Sprintf(queryTemplate,
		strings.Join(withParts, ",\n    "),
		strings.Join(selectFields, ",\n        "),
		strings.Join(whereConditions, "\n        AND "),
	)
}

// BuildFunnelOverviewQuery builds an overview query for n-step funnels
func BuildFunnelOverviewQuery(
	steps []struct {
		ServiceName    string
		SpanName       string
		ContainsError  int
		LatencyPointer string
		Clause         string
	},
	startTs int64,
	endTs int64,
) string {
	numSteps := len(steps)

	// Build WITH clause
	withParts := []string{
		fmt.Sprintf("toDateTime64(%d/1e9, 9) AS start_ts", startTs),
		fmt.Sprintf("toDateTime64(%d/1e9, 9) AS end_ts", endTs),
		fmt.Sprintf("(%d - %d)/1e9 AS time_window_sec", endTs, startTs),
	}

	// Add contains_error, latency_pointer and step definitions
	for i, step := range steps {
		withParts = append(withParts, fmt.Sprintf("%d AS contains_error_t%d", step.ContainsError, i+1))
		withParts = append(withParts, fmt.Sprintf("'%s' AS latency_pointer_t%d", step.LatencyPointer, i+1))
		withParts = append(withParts, fmt.Sprintf("('%s','%s') AS step%d", step.ServiceName, step.SpanName, i+1))
	}

	// Build funnel CTE select fields
	funnelSelectFields := []string{"trace_id"}
	for i := 0; i < numSteps; i++ {
		// Check if latency_pointer is 'end' for this step
		if strings.ToLower(steps[i].LatencyPointer) == "end" {
			funnelSelectFields = append(funnelSelectFields,
				fmt.Sprintf("minIf(timestamp, resource_string_service$$name = step%d.1 AND name = step%d.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step%d.1 AND name = step%d.2)) AS t%d_time", i+1, i+1, i+1, i+1, i+1))
		} else {
			funnelSelectFields = append(funnelSelectFields,
				fmt.Sprintf("minIf(timestamp, resource_string_service$$name = step%d.1 AND name = step%d.2) AS t%d_time", i+1, i+1, i+1))
		}
		funnelSelectFields = append(funnelSelectFields,
			fmt.Sprintf("toUInt8(anyIf(has_error, resource_string_service$$name = step%d.1 AND name = step%d.2)) AS s%d_error", i+1, i+1, i+1))
	}

	// Build WHERE conditions
	whereConditions := []string{"timestamp BETWEEN start_ts AND end_ts"}
	orConditions := []string{}
	for i, step := range steps {
		condition := fmt.Sprintf("(resource_string_service$$name = step%d.1 AND name = step%d.2 AND (contains_error_t%d = 0 OR has_error = true) %s)",
			i+1, i+1, i+1, step.Clause)
		orConditions = append(orConditions, condition)
	}
	if len(orConditions) > 0 {
		whereConditions = append(whereConditions, fmt.Sprintf("(%s)", strings.Join(orConditions, " OR ")))
	}

	// Build HAVING conditions for temporal ordering
	havingConditions := []string{"t1_time > 0"}

	// Build conversion count fields
	conversionFields := []string{"count(DISTINCT trace_id) AS total_s1_spans"}

	// For each subsequent step, add conversion counts with proper temporal conditions
	for i := 1; i < numSteps; i++ {
		// Build condition for this step (all previous steps must be in order)
		conditions := []string{}
		for j := 1; j <= i; j++ {
			conditions = append(conditions, fmt.Sprintf("t%d_time > t%d_time", j+1, j))
		}
		conversionFields = append(conversionFields,
			fmt.Sprintf("count(DISTINCT CASE WHEN %s THEN trace_id END) AS total_s%d_spans",
				strings.Join(conditions, " AND "), i+1))
	}

	// Add error counts
	for i := 0; i < numSteps; i++ {
		conversionFields = append(conversionFields,
			fmt.Sprintf("count(DISTINCT CASE WHEN s%d_error = 1 THEN trace_id END) AS sum_s%d_error", i+1, i+1))
	}

	// Build duration and latency calculations for the full funnel
	if numSteps > 1 {
		// Build temporal conditions for full funnel completion
		fullConditions := []string{}
		for i := 1; i < numSteps; i++ {
			fullConditions = append(fullConditions, fmt.Sprintf("t%d_time > t%d_time", i+1, i))
		}
		fullCondition := strings.Join(append([]string{"t1_time > 0"}, fullConditions...), " AND ")

		conversionFields = append(conversionFields,
			fmt.Sprintf("avgIf((toUnixTimestamp64Nano(t%d_time) - toUnixTimestamp64Nano(t1_time))/1e6, %s) AS avg_duration",
				numSteps, fullCondition))
		conversionFields = append(conversionFields,
			fmt.Sprintf("quantileIf(0.99)((toUnixTimestamp64Nano(t%d_time) - toUnixTimestamp64Nano(t1_time))/1e6, %s) AS latency",
				numSteps, fullCondition))
	}

	// Build error aggregation
	errorAgg := []string{}
	for i := 0; i < numSteps; i++ {
		errorAgg = append(errorAgg, fmt.Sprintf("sum_s%d_error", i+1))
	}

	queryTemplate := `
WITH
    %s

, funnel AS (
    SELECT
        %s
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE
        %s
    GROUP BY trace_id
    HAVING %s
)

, totals AS (
    SELECT
        %s
    FROM funnel
)

SELECT
    round(if(total_s1_spans > 0, total_s%d_spans * 100.0 / total_s1_spans, 0), 2) AS conversion_rate,
    total_s%d_spans / time_window_sec AS avg_rate,
    greatest(%s) AS errors,
    avg_duration,
    latency
FROM totals;
`

	return fmt.Sprintf(queryTemplate,
		strings.Join(withParts, ",\n    "),
		strings.Join(funnelSelectFields, ",\n        "),
		strings.Join(whereConditions, "\n        AND "),
		strings.Join(havingConditions, " AND "),
		strings.Join(conversionFields, ",\n        "),
		numSteps,
		numSteps,
		strings.Join(errorAgg, ", "),
	)
}

// BuildFunnelCountQuery builds a count query for n-step funnels
func BuildFunnelCountQuery(
	steps []struct {
		ServiceName   string
		SpanName      string
		ContainsError int
		Clause        string
	},
	startTs int64,
	endTs int64,
) string {
	numSteps := len(steps)

	// Build WITH clause
	withParts := []string{
		fmt.Sprintf("toDateTime64(%d/1e9,9) AS start_ts", startTs),
		fmt.Sprintf("toDateTime64(%d/1e9,9) AS end_ts", endTs),
	}

	// Add contains_error and step definitions
	for i, step := range steps {
		withParts = append(withParts, fmt.Sprintf("%d AS contains_error_t%d", step.ContainsError, i+1))
		withParts = append(withParts, fmt.Sprintf("('%s','%s') AS step%d", step.ServiceName, step.SpanName, i+1))
	}

	// Build funnel subquery select fields
	funnelSelectFields := []string{"trace_id"}
	for i := 0; i < numSteps; i++ {
		// No LatencyPointer for this function, keeping original behavior
		funnelSelectFields = append(funnelSelectFields,
			fmt.Sprintf("minIf(timestamp, resource_string_service$$name = step%d.1 AND name = step%d.2) AS t%d_time", i+1, i+1, i+1))
		funnelSelectFields = append(funnelSelectFields,
			fmt.Sprintf("toUInt8(anyIf(has_error, resource_string_service$$name = step%d.1 AND name = step%d.2)) AS t%d_error", i+1, i+1, i+1))
	}

	// Build WHERE conditions
	whereConditions := []string{"timestamp BETWEEN start_ts AND end_ts"}
	orConditions := []string{}
	for i, step := range steps {
		condition := fmt.Sprintf("(resource_string_service$$name = step%d.1 AND name = step%d.2 AND (contains_error_t%d = 0 OR has_error = true) %s)",
			i+1, i+1, i+1, step.Clause)
		orConditions = append(orConditions, condition)
	}
	if len(orConditions) > 0 {
		whereConditions = append(whereConditions, fmt.Sprintf("(%s)", strings.Join(orConditions, " OR ")))
	}

	// Build SELECT fields for counts
	selectFields := []string{}

	// Add total and errored counts for each step
	for i := 0; i < numSteps; i++ {
		if i == 0 {
			// First step - just count traces
			selectFields = append(selectFields, "count(DISTINCT trace_id) AS total_s1_spans")
			selectFields = append(selectFields, "count(DISTINCT CASE WHEN t1_error = 1 THEN trace_id END) AS total_s1_errored_spans")
		} else {
			// Subsequent steps - check temporal ordering
			conditions := []string{}
			for j := 0; j < i; j++ {
				conditions = append(conditions, fmt.Sprintf("t%d_time > t%d_time", j+2, j+1))
			}
			condition := strings.Join(conditions, " AND ")

			selectFields = append(selectFields,
				fmt.Sprintf("count(DISTINCT CASE WHEN %s THEN trace_id END) AS total_s%d_spans", condition, i+1))
			selectFields = append(selectFields,
				fmt.Sprintf("count(DISTINCT CASE WHEN %s AND t%d_error = 1 THEN trace_id END) AS total_s%d_errored_spans",
					condition, i+1, i+1))
		}
	}

	queryTemplate := `
WITH
    %s

SELECT
    %s
FROM (
    SELECT
        %s
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE
        %s
    GROUP BY trace_id
    HAVING t1_time > 0
) AS funnel;
`

	return fmt.Sprintf(queryTemplate,
		strings.Join(withParts, ",\n    "),
		strings.Join(selectFields, ",\n    "),
		strings.Join(funnelSelectFields, ",\n        "),
		strings.Join(whereConditions, "\n        AND "),
	)
}

// BuildFunnelStepOverviewQuery builds a step overview query for transitions between any specified steps
func BuildFunnelStepOverviewQuery(
	steps []struct {
		ServiceName    string
		SpanName       string
		ContainsError  int
		LatencyPointer string
		LatencyType    string
		Clause         string
	},
	startTs int64,
	endTs int64,
	stepStart int64,
	stepEnd int64,
) string {
	numSteps := len(steps)

	// Validate step indices
	if stepStart < 1 || stepEnd < 1 || stepStart > int64(numSteps) || stepEnd > int64(numSteps) || stepStart >= stepEnd {
		// Return a fallback query for invalid step ranges
		return `SELECT 0 AS conversion_rate, 0 AS avg_rate, 0 AS errors, 0 AS avg_duration, 0 AS latency;`
	}

	// Convert to 0-based indices
	startIdx := int(stepStart - 1)
	endIdx := int(stepEnd - 1)

	// Build WITH clause
	withParts := []string{
		fmt.Sprintf("toDateTime64(%d / 1e9, 9) AS start_ts", startTs),
		fmt.Sprintf("toDateTime64(%d / 1e9, 9) AS end_ts", endTs),
		fmt.Sprintf("(%d - %d) / 1e9 AS time_window_sec", endTs, startTs),
	}

	// Add contains_error and step definitions for all steps
	for i, step := range steps {
		withParts = append(withParts, fmt.Sprintf("%d AS contains_error_t%d", step.ContainsError, i+1))
		withParts = append(withParts, fmt.Sprintf("('%s','%s') AS step%d", step.ServiceName, step.SpanName, i+1))
	}

	// Build funnel CTE select fields
	funnelSelectFields := []string{"trace_id"}
	for i := 0; i < numSteps; i++ {
		// Check if latency_pointer is 'end' for this step
		if steps[i].LatencyPointer == "end" {
			funnelSelectFields = append(funnelSelectFields,
				fmt.Sprintf("minIf(timestamp, resource_string_service$$name = step%d.1 AND name = step%d.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step%d.1 AND name = step%d.2)) AS t%d_time", i+1, i+1, i+1, i+1, i+1))
		} else {
			funnelSelectFields = append(funnelSelectFields,
				fmt.Sprintf("minIf(timestamp, resource_string_service$$name = step%d.1 AND name = step%d.2) AS t%d_time", i+1, i+1, i+1))
		}
		funnelSelectFields = append(funnelSelectFields,
			fmt.Sprintf("toUInt8(anyIf(has_error, resource_string_service$$name = step%d.1 AND name = step%d.2)) AS s%d_error", i+1, i+1, i+1))
	}

	// Build WHERE conditions
	whereConditions := []string{"timestamp BETWEEN start_ts AND end_ts"}
	orConditions := []string{}
	for i, step := range steps {
		condition := fmt.Sprintf("(resource_string_service$$name = step%d.1 AND name = step%d.2 AND (contains_error_t%d = 0 OR has_error = true) %s)",
			i+1, i+1, i+1, step.Clause)
		orConditions = append(orConditions, condition)
	}
	if len(orConditions) > 0 {
		whereConditions = append(whereConditions, fmt.Sprintf("(%s)", strings.Join(orConditions, " OR ")))
	}

	// Determine latency quantile for the end step
	latencyQuantile := "0.99"
	if steps[endIdx].LatencyType != "" {
		latency := strings.ToLower(steps[endIdx].LatencyType)
		switch latency {
		case "p90":
			latencyQuantile = "0.90"
		case "p95":
			latencyQuantile = "0.95"
		default:
			latencyQuantile = "0.99"
		}
	}

	// Build conversion condition - all steps from start to end must be in order
	conversionConditions := []string{}
	for i := startIdx; i < endIdx; i++ {
		conversionConditions = append(conversionConditions, fmt.Sprintf("t%d_time > t%d_time", i+2, i+1))
	}
	conversionCondition := strings.Join(conversionConditions, " AND ")

	// Build the query for step transition
	queryTemplate := `
WITH
    %s

SELECT
    round(total_s%d_spans * 100.0 / total_s%d_spans, 2) AS conversion_rate,
    total_s%d_spans / time_window_sec AS avg_rate,
    greatest(sum_s%d_error, sum_s%d_error) AS errors,
    avg_duration,
    latency
FROM (
    SELECT
        count(DISTINCT trace_id) AS total_s%d_spans,
        count(DISTINCT CASE WHEN %s THEN trace_id END) AS total_s%d_spans,
        count(DISTINCT CASE WHEN s%d_error = 1 THEN trace_id END) AS sum_s%d_error,
        count(DISTINCT CASE WHEN s%d_error = 1 THEN trace_id END) AS sum_s%d_error,

        avgIf(
            (toUnixTimestamp64Nano(t%d_time) - toUnixTimestamp64Nano(t%d_time)) / 1e6,
            t%d_time > 0 AND %s
        ) AS avg_duration,

        quantileIf(%s)(
            (toUnixTimestamp64Nano(t%d_time) - toUnixTimestamp64Nano(t%d_time)) / 1e6,
            t%d_time > 0 AND %s
        ) AS latency
    FROM (
        SELECT
            %s
        FROM signoz_traces.distributed_signoz_index_v3
        WHERE
            %s
        GROUP BY trace_id
        HAVING t%d_time > 0
    ) AS funnel
) AS totals;
`

	return fmt.Sprintf(queryTemplate,
		strings.Join(withParts, ",\n    "),
		stepEnd, stepStart, // conversion_rate calculation
		stepEnd,            // avg_rate
		stepStart, stepEnd, // errors
		stepStart,                    // total start spans
		conversionCondition, stepEnd, // total end spans with condition
		stepStart, stepStart, // error counts
		stepEnd, stepEnd,
		stepEnd, stepStart, // avg_duration calculation
		stepStart, conversionCondition,
		latencyQuantile,    // quantile value
		stepEnd, stepStart, // latency calculation
		stepStart, conversionCondition,
		strings.Join(funnelSelectFields, ",\n            "),
		strings.Join(whereConditions, "\n            AND "),
		stepStart,
	)
}

// BuildFunnelTopSlowTracesQuery builds a query to find the slowest traces between two funnel steps
func BuildFunnelTopSlowTracesQuery(
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
	latencyPointerT1 string,
	latencyPointerT2 string,
) string {
	// Build time expressions based on latency pointers
	t1TimeExpr := "minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2)"
	if latencyPointerT1 == "end" {
		t1TimeExpr = "minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step1.1 AND name = step1.2))"
	}

	t2TimeExpr := "minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2)"
	if latencyPointerT2 == "end" {
		t2TimeExpr = "minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step2.1 AND name = step2.2))"
	}

	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    toDateTime64(%[3]d/1e9, 9) AS start_ts,
    toDateTime64(%[4]d/1e9, 9) AS end_ts,

    ('%[5]s','%[6]s') AS step1,
    ('%[7]s','%[8]s') AS step2

SELECT
    trace_id,
    (toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6 AS duration_ms,
    span_count
FROM (
    SELECT
        trace_id,
        %[11]s AS t1_time,
        %[12]s AS t2_time,
        count() AS span_count
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (resource_string_service$$name = step1.1 AND name = step1.2 AND (contains_error_t1 = 0 OR has_error = true) %[9]s)
         OR
            (resource_string_service$$name = step2.1 AND name = step2.2 AND (contains_error_t2 = 0 OR has_error = true) %[10]s)
        )
    GROUP BY trace_id
    HAVING t1_time > 0 AND t2_time > t1_time
) AS funnel
ORDER BY duration_ms DESC
LIMIT 5;
`
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
		t1TimeExpr,
		t2TimeExpr,
	)
}

// BuildFunnelTopSlowErrorTracesQuery builds a query to find the slowest error traces between two funnel steps
func BuildFunnelTopSlowErrorTracesQuery(
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
	latencyPointerT1 string,
	latencyPointerT2 string,
) string {
	// Build time expressions based on latency pointers
	t1TimeExpr := "minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2)"
	if latencyPointerT1 == "end" {
		t1TimeExpr = "minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step1.1 AND name = step1.2))"
	}

	t2TimeExpr := "minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2)"
	if latencyPointerT2 == "end" {
		t2TimeExpr = "minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step2.1 AND name = step2.2))"
	}

	queryTemplate := `
WITH
    %[1]d AS contains_error_t1,
    %[2]d AS contains_error_t2,
    toDateTime64(%[3]d/1e9, 9) AS start_ts,
    toDateTime64(%[4]d/1e9, 9) AS end_ts,

    ('%[5]s','%[6]s') AS step1,
    ('%[7]s','%[8]s') AS step2

SELECT
    trace_id,
    (toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time)) / 1e6 AS duration_ms,
    span_count
FROM (
    SELECT
        trace_id,
        %[11]s AS t1_time,
        %[12]s AS t2_time,
        toUInt8(anyIf(has_error, resource_string_service$$name = step1.1 AND name = step1.2)) AS t1_error,
        toUInt8(anyIf(has_error, resource_string_service$$name = step2.1 AND name = step2.2)) AS t2_error,
        count() AS span_count
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE
        timestamp BETWEEN start_ts AND end_ts
        AND (
            (resource_string_service$$name = step1.1 AND name = step1.2 AND (contains_error_t1 = 0 OR has_error = true) %[9]s)
         OR
            (resource_string_service$$name = step2.1 AND name = step2.2 AND (contains_error_t2 = 0 OR has_error = true) %[10]s)
        )
    GROUP BY trace_id
    HAVING t1_time > 0 AND t2_time > t1_time
) AS funnel
WHERE
    (t1_error = 1 OR t2_error = 1)
ORDER BY duration_ms DESC
LIMIT 5;
`
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
		t1TimeExpr,
		t2TimeExpr,
	)
}
