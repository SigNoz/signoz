package tracefunnel

import (
	"fmt"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	tracefunnel "github.com/SigNoz/signoz/pkg/types/tracefunnel"
)

// GetStepAnalytics builds a ClickHouse query to get analytics for each step
func GetStepAnalytics(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	if len(funnel.Steps) == 0 {
		return nil, fmt.Errorf("funnel has no steps")
	}

	// Build funnel steps array
	var steps []string
	for _, step := range funnel.Steps {
		steps = append(steps, fmt.Sprintf("('%s', '%s')",
			escapeString(step.ServiceName), escapeString(step.SpanName)))
	}
	stepsArray := fmt.Sprintf("array(%s)", strings.Join(steps, ","))

	// Build step CTEs
	var stepCTEs []string
	for i, step := range funnel.Steps {
		filterStr := ""
		if step.Filters != nil && len(step.Filters.Items) > 0 {
			// ToDO: need to implement where clause filtering with minimal code duplication
			filterStr = "/* Custom filters would be applied here */"
		}

		cte := fmt.Sprintf(`
		step%d_traces AS (
			SELECT DISTINCT trace_id
			FROM %s
			WHERE resource_string_service$$name = '%s'
			  AND name = '%s'
			  AND timestamp BETWEEN toString(start_time) AND toString(end_time)
			  AND ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
			  %s
		)`,
			i+1,
			TracesTable,
			escapeString(step.ServiceName),
			escapeString(step.SpanName),
			filterStr,
		)
		stepCTEs = append(stepCTEs, cte)
	}

	// Build intersecting traces CTE
	var intersections []string
	for i := 1; i <= len(funnel.Steps); i++ {
		intersections = append(intersections, fmt.Sprintf("SELECT trace_id FROM step%d_traces", i))
	}
	intersectingTracesCTE := fmt.Sprintf(`
	intersecting_traces AS (
		%s
	)`,
		strings.Join(intersections, "\nINTERSECT\n"),
	)

	// Build CASE expressions for each step
	var caseExpressions []string
	for i, step := range funnel.Steps {
		totalSpansExpr := fmt.Sprintf(`
		COUNT(CASE WHEN resource_string_service$$name = '%s'
					   AND name = '%s'
				   THEN trace_id END) AS total_s%d_spans`,
			escapeString(step.ServiceName), escapeString(step.SpanName), i+1)

		erroredSpansExpr := fmt.Sprintf(`
		COUNT(CASE WHEN resource_string_service$$name = '%s'
					   AND name = '%s'
					   AND has_error = true
				   THEN trace_id END) AS total_s%d_errored_spans`,
			escapeString(step.ServiceName), escapeString(step.SpanName), i+1)

		caseExpressions = append(caseExpressions, totalSpansExpr, erroredSpansExpr)
	}

	query := fmt.Sprintf(`
	WITH
		toUInt64(%d) AS start_time,
		toUInt64(%d) AS end_time,
		toString(intDiv(start_time, 1000000000) - 1800) AS tsBucketStart,
		toString(intDiv(end_time, 1000000000)) AS tsBucketEnd,
		%s AS funnel_steps,
		%s,
		%s
	SELECT
		%s
	FROM %s
	WHERE trace_id IN (SELECT trace_id FROM intersecting_traces)
	  AND timestamp BETWEEN toString(start_time) AND toString(end_time)
	  AND ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd`,
		timeRange.StartTime,
		timeRange.EndTime,
		stepsArray,
		strings.Join(stepCTEs, ",\n"),
		intersectingTracesCTE,
		strings.Join(caseExpressions, ",\n    "),
		TracesTable,
	)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

// ValidateTracesWithLatency builds a ClickHouse query to validate traces with latency information
func ValidateTracesWithLatency(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	filters, err := buildFunnelFiltersWithLatency(funnel)
	if err != nil {
		return nil, fmt.Errorf("error building funnel filters with latency: %w", err)
	}

	query := generateFunnelSQLWithLatency(timeRange.StartTime, timeRange.EndTime, filters)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func generateFunnelSQLWithLatency(start, end int64, filters []tracefunnel.FunnelStepFilter) string {
	var expressions []string

	// Convert timestamps to nanoseconds
	startTime := fmt.Sprintf("toUInt64(%d)", start)
	endTime := fmt.Sprintf("toUInt64(%d)", end)

	expressions = append(expressions, fmt.Sprintf("%s AS start_time", startTime))
	expressions = append(expressions, fmt.Sprintf("%s AS end_time", endTime))
	expressions = append(expressions, "toString(intDiv(start_time, 1000000000) - 1800) AS tsBucketStart")
	expressions = append(expressions, "toString(intDiv(end_time, 1000000000)) AS tsBucketEnd")
	expressions = append(expressions, "(end_time - start_time) / 1e9 AS total_time_seconds")

	// Define step configurations dynamically
	for _, f := range filters {
		expressions = append(expressions, fmt.Sprintf("('%s', '%s') AS s%d_config",
			escapeString(f.ServiceName),
			escapeString(f.SpanName),
			f.StepNumber))
	}

	withClause := "WITH \n" + strings.Join(expressions, ",\n") + "\n"

	// Build step raw expressions and cumulative logic
	var stepRaws []string
	var cumulativeLogic []string
	var filterConditions []string

	stepCount := len(filters)

	// Build raw step detection
	for i := 1; i <= stepCount; i++ {
		stepRaws = append(stepRaws, fmt.Sprintf(
			"MAX(CASE WHEN (resource_string_service$$name, name) = s%d_config THEN 1 ELSE 0 END) AS has_s%d_raw", i, i))
		filterConditions = append(filterConditions, fmt.Sprintf("s%d_config", i))
	}

	// Build cumulative IF logic
	for i := 1; i <= stepCount; i++ {
		if i == 1 {
			cumulativeLogic = append(cumulativeLogic, fmt.Sprintf(`
        IF(MAX(CASE WHEN (resource_string_service$$name, name) = s1_config THEN 1 ELSE 0 END) = 1, 1, 0) AS has_s1`))
		} else {
			innerIf := "IF(MAX(CASE WHEN (resource_string_service$$name, name) = s1_config THEN 1 ELSE 0 END) = 1, 1, 0)"
			for j := 2; j < i; j++ {
				innerIf = fmt.Sprintf(`IF(%s = 1 AND MAX(CASE WHEN (resource_string_service$$name, name) = s%d_config THEN 1 ELSE 0 END) = 1, 1, 0)`, innerIf, j)
			}
			cumulativeLogic = append(cumulativeLogic, fmt.Sprintf(`
        IF(
            %s = 1 AND MAX(CASE WHEN (resource_string_service$$name, name) = s%d_config THEN 1 ELSE 0 END) = 1,
            1, 0
        ) AS has_s%d`, innerIf, i, i))
		}
	}

	// Final SELECT counts using FILTER clauses
	var stepCounts []string
	for i := 1; i <= stepCount; i++ {
		stepCounts = append(stepCounts, fmt.Sprintf("COUNT(DISTINCT trace_id) FILTER (WHERE has_s%d = 1) AS step%d_count", i, i))
	}

	// Final query assembly
	lastStep := fmt.Sprint(stepCount)
	query := withClause + `
SELECT 
    ` + strings.Join(stepCounts, ",\n    ") + `,
    IF(total_time_seconds = 0 OR COUNT(DISTINCT trace_id) FILTER (WHERE has_s` + lastStep + ` = 1) = 0, 0,
        COUNT(DISTINCT trace_id) FILTER (WHERE has_s` + lastStep + ` = 1) / total_time_seconds
    ) AS avg_rate,
    COUNT(DISTINCT trace_id) FILTER (WHERE has_s` + lastStep + ` = 1 AND has_error = true) AS errors,
    IF(COUNT(*) = 0, 0, avg(trace_duration)) AS avg_duration,
    IF(COUNT(*) = 0, 0, quantile(0.99)(trace_duration)) AS p99_latency,
    IF(COUNT(DISTINCT trace_id) FILTER (WHERE has_s1 = 1) = 0, 0,
        100.0 * COUNT(DISTINCT trace_id) FILTER (WHERE has_s` + lastStep + ` = 1) /
        COUNT(DISTINCT trace_id) FILTER (WHERE has_s1 = 1)
    ) AS conversion_rate
FROM (
    SELECT 
        trace_id,
        MAX(has_error) AS has_error,
        ` + strings.Join(stepRaws, ",\n        ") + `,
        MAX(toUnixTimestamp64Nano(timestamp) + duration_nano) - MIN(toUnixTimestamp64Nano(timestamp)) AS trace_duration,
        ` + strings.Join(cumulativeLogic, ",\n        ") + `
    FROM ` + TracesTable + `
    WHERE 
        timestamp BETWEEN toString(start_time) AND toString(end_time)
        AND ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
        AND (resource_string_service$$name, name) IN (` + strings.Join(filterConditions, ", ") + `)
    GROUP BY trace_id
) AS funnel_data;`

	return query
}

func buildFunnelFiltersWithLatency(funnel *tracefunnel.Funnel) ([]tracefunnel.FunnelStepFilter, error) {
	if funnel == nil {
		return nil, fmt.Errorf("funnel cannot be nil")
	}

	if len(funnel.Steps) == 0 {
		return nil, fmt.Errorf("funnel must have at least one step")
	}

	filters := make([]tracefunnel.FunnelStepFilter, len(funnel.Steps))

	for i, step := range funnel.Steps {
		latencyPointer := "start" // Default value
		if step.LatencyPointer != "" {
			latencyPointer = step.LatencyPointer
		}

		filters[i] = tracefunnel.FunnelStepFilter{
			StepNumber:     i + 1,
			ServiceName:    step.ServiceName,
			SpanName:       step.SpanName,
			LatencyPointer: latencyPointer,
			CustomFilters:  step.Filters,
		}
	}

	return filters, nil
}

func buildFunnelFilters(funnel *tracefunnel.Funnel) ([]tracefunnel.FunnelStepFilter, error) {
	if funnel == nil {
		return nil, fmt.Errorf("funnel cannot be nil")
	}

	if len(funnel.Steps) == 0 {
		return nil, fmt.Errorf("funnel must have at least one step")
	}

	filters := make([]tracefunnel.FunnelStepFilter, len(funnel.Steps))

	for i, step := range funnel.Steps {
		filters[i] = tracefunnel.FunnelStepFilter{
			StepNumber:    i + 1,
			ServiceName:   step.ServiceName,
			SpanName:      step.SpanName,
			CustomFilters: step.Filters,
		}
	}

	return filters, nil
}

func escapeString(s string) string {
	// Replace single quotes with double single quotes to escape them in SQL
	return strings.ReplaceAll(s, "'", "''")
}

const TracesTable = "signoz_traces.signoz_index_v3"

func generateFunnelSQL(start, end int64, filters []tracefunnel.FunnelStepFilter) string {
	var expressions []string

	// Basic time expressions.
	expressions = append(expressions, fmt.Sprintf("toUInt64(%d) AS start_time", start))
	expressions = append(expressions, fmt.Sprintf("toUInt64(%d) AS end_time", end))
	expressions = append(expressions, "toString(intDiv(start_time, 1000000000) - 1800) AS tsBucketStart")
	expressions = append(expressions, "toString(intDiv(end_time, 1000000000)) AS tsBucketEnd")

	// Add service and span alias definitions from each filter.
	for _, f := range filters {
		expressions = append(expressions, fmt.Sprintf("'%s' AS service_%d", escapeString(f.ServiceName), f.StepNumber))
		expressions = append(expressions, fmt.Sprintf("'%s' AS span_%d", escapeString(f.SpanName), f.StepNumber))
	}

	// Add the CTE for each step.
	for _, f := range filters {
		cte := fmt.Sprintf(`step%d_traces AS (
    SELECT DISTINCT trace_id
    FROM %s
    WHERE serviceName = service_%d
      AND name = span_%d
      AND timestamp BETWEEN toString(start_time) AND toString(end_time)
      AND ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
)`, f.StepNumber, TracesTable, f.StepNumber, f.StepNumber)
		expressions = append(expressions, cte)
	}

	withClause := "WITH \n" + strings.Join(expressions, ",\n") + "\n"

	// Build the intersect clause for each step.
	var intersectQueries []string
	for _, f := range filters {
		intersectQueries = append(intersectQueries, fmt.Sprintf("SELECT trace_id FROM step%d_traces", f.StepNumber))
	}
	intersectClause := strings.Join(intersectQueries, "\nINTERSECT\n")

	query := withClause + `
SELECT trace_id
FROM ` + TracesTable + `
WHERE trace_id IN (
    ` + intersectClause + `
)
  AND timestamp BETWEEN toString(start_time) AND toString(end_time)
  AND ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
GROUP BY trace_id
LIMIT 5
`
	return query
}

// ValidateTraces builds a ClickHouse query to validate traces in a funnel
func ValidateTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	filters, err := buildFunnelFilters(funnel)
	if err != nil {
		return nil, fmt.Errorf("error building funnel filters: %w", err)
	}

	query := generateFunnelSQL(timeRange.StartTime, timeRange.EndTime, filters)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

// Helper to build WHERE clause for a funnel step
func buildStepFilterSQL(step *tracefunnel.FunnelStep) string {
	if step == nil {
		return ""
	}
	var filters []string
	filters = append(filters, fmt.Sprintf("serviceName = '%s'", escapeString(step.ServiceName)))
	filters = append(filters, fmt.Sprintf("name = '%s'", escapeString(step.SpanName)))
	if step.Filters != nil && len(step.Filters.Items) > 0 {
		for _, filter := range step.Filters.Items {
			val := fmt.Sprintf("%v", filter.Value)
			switch filter.Operator {
			case "=":
				filters = append(filters, fmt.Sprintf("%s = '%s'", filter.Key.Key, escapeString(val)))
			case "!=":
				filters = append(filters, fmt.Sprintf("%s != '%s'", filter.Key.Key, escapeString(val)))
			case ">":
				filters = append(filters, fmt.Sprintf("%s > '%s'", filter.Key.Key, escapeString(val)))
			case "<":
				filters = append(filters, fmt.Sprintf("%s < '%s'", filter.Key.Key, escapeString(val)))
			case ">=":
				filters = append(filters, fmt.Sprintf("%s >= '%s'", filter.Key.Key, escapeString(val)))
			case "<=":
				filters = append(filters, fmt.Sprintf("%s <= '%s'", filter.Key.Key, escapeString(val)))
			case "contains":
				filters = append(filters, fmt.Sprintf("%s LIKE '%%%s%%'", filter.Key.Key, escapeString(val)))
			case "not_contains":
				filters = append(filters, fmt.Sprintf("%s NOT LIKE '%%%s%%'", filter.Key.Key, escapeString(val)))
			}
		}
	}
	if step.HasErrors {
		filters = append(filters, "has_error = 1")
	}
	return strings.Join(filters, " AND ")
}

// Helper to build CTE for a step
func buildStepCTE(step *tracefunnel.FunnelStep, idx int, timeRange tracefunnel.TimeRange) string {
	var timeExpr string
	if step.LatencyPointer == "end" {
		timeExpr = fmt.Sprintf("min(timestamp + duration_nano) AS step%d_time", idx)
	} else {
		timeExpr = fmt.Sprintf("min(timestamp) AS step%d_time", idx)
	}
	return fmt.Sprintf(`
step%d AS (
  SELECT
    trace_id,
    %s,
    max(has_error) AS step%d_error
  FROM %s
  WHERE
    timestamp BETWEEN toDateTime64(%d, 9) AND toDateTime64(%d, 9)
    AND %s
  GROUP BY trace_id
)`,
		idx, timeExpr, idx, TracesTable, timeRange.StartTime, timeRange.EndTime, buildStepFilterSQL(step))
}

// Main funnel analytics query builder (2 or 3 steps)
func buildFunnelQuery(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) string {
	steps := funnel.Steps
	if len(steps) < 2 || len(steps) > 3 {
		return "-- Only 2 or 3 step funnels are supported"
	}

	ctes := []string{
		buildStepCTE(&steps[0], 1, timeRange),
		buildStepCTE(&steps[1], 2, timeRange),
	}
	joinClause := "s1.trace_id = s2.trace_id"
	selectFields := "s1.trace_id, s1.step1_time, s2.step2_time, s1.step1_error, s2.step2_error, (s2.step2_time - s1.step1_time) AS duration"
	whereClause := "s2.step2_time > s1.step1_time"
	if len(steps) == 3 {
		ctes = append(ctes, buildStepCTE(&steps[2], 3, timeRange))
		joinClause += " AND s1.trace_id = s3.trace_id AND s2.trace_id = s3.trace_id"
		selectFields = "s1.trace_id, s1.step1_time, s2.step2_time, s3.step3_time, s1.step1_error, s2.step2_error, s3.step3_error, (s3.step3_time - s1.step1_time) AS duration"
		whereClause = "s2.step2_time > s1.step1_time AND s3.step3_time > s2.step2_time"
	}

	return fmt.Sprintf(`
WITH
%s
SELECT
  %s
FROM step1 s1
INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
%s
WHERE %s
`,
		strings.Join(ctes, ",\n"),
		selectFields,
		func() string {
			if len(steps) == 3 {
				return "INNER JOIN step3 s3 ON s1.trace_id = s3.trace_id"
			}
			return ""
		}(),
		whereClause,
	)
}

// GetFunnelAnalytics generates a SQL query for funnel analytics.
// Example SQL generated for a 2-step funnel:
// WITH
// step1 AS (
//
//	SELECT trace_id, min(timestamp) AS step1_time, max(has_error) AS step1_error
//	FROM signoz_traces.signoz_index_v3
//	WHERE timestamp BETWEEN toDateTime64(START, 9) AND toDateTime64(END, 9)
//	  AND serviceName = 'svc1' AND name = 'span1'
//	GROUP BY trace_id
//
// ),
// step2 AS (
//
//	SELECT trace_id, min(timestamp) AS step2_time, max(has_error) AS step2_error
//	FROM signoz_traces.signoz_index_v3
//	WHERE timestamp BETWEEN toDateTime64(START, 9) AND toDateTime64(END, 9)
//	  AND serviceName = 'svc2' AND name = 'span2'
//	GROUP BY trace_id
//
// )
// SELECT
//
//	s1.trace_id, s1.step1_time, s2.step2_time, s1.step1_error, s2.step2_error, (s2.step2_time - s1.step1_time) AS duration
//
// FROM step1 s1
// INNER JOIN step2 s2 ON s1.trace_id = s2.trace_id
// WHERE s2.step2_time > s1.step1_time
func GetFunnelAnalytics(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	query := buildFunnelQuery(funnel, timeRange)
	return &v3.ClickHouseQuery{Query: query}, nil
}

// GetSlowestTraces returns the slowest N traces for a funnel.
// Example SQL for slowest traces in a 2-step funnel:
// WITH funnel_data AS (
//
//	... (see GetFunnelAnalytics sample above) ...
//
// )
// SELECT trace_id, duration
// FROM funnel_data
// ORDER BY duration DESC
// LIMIT N
func GetSlowestTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange, limit int) (*v3.ClickHouseQuery, error) {
	baseQuery := buildFunnelQuery(funnel, timeRange)
	query := fmt.Sprintf(`
WITH funnel_data AS (%s)
SELECT trace_id, duration
FROM funnel_data
ORDER BY duration DESC
LIMIT %d
`, baseQuery, limit)
	return &v3.ClickHouseQuery{Query: query}, nil
}

// GetErroredTraces returns the slowest N errored traces for a funnel.
// Example SQL for errored traces in a 2-step funnel:
// WITH funnel_data AS (
//
//	... (see GetFunnelAnalytics sample above) ...
//
// )
// SELECT trace_id, duration
// FROM funnel_data
// WHERE step1_error = 1 OR step2_error = 1
// ORDER BY duration DESC
// LIMIT N
func GetErroredTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange, limit int) (*v3.ClickHouseQuery, error) {
	baseQuery := buildFunnelQuery(funnel, timeRange)
	query := fmt.Sprintf(`
WITH funnel_data AS (%s)
SELECT trace_id, duration
FROM funnel_data
WHERE step1_error = 1 OR step2_error = 1%s
ORDER BY duration DESC
LIMIT %d
`,
		baseQuery,
		func() string {
			if len(funnel.Steps) == 3 {
				return " OR step3_error = 1"
			}
			return ""
		}(),
		limit,
	)
	return &v3.ClickHouseQuery{Query: query}, nil
}
