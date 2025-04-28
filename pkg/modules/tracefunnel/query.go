package tracefunnel

import (
	"fmt"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	tracefunnel "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"strings"
)

// GetSlowestTraces builds a ClickHouse query to get the slowest traces between two steps
func GetSlowestTraces(funnel *tracefunnel.Funnel, stepAOrder, stepBOrder int64, timeRange tracefunnel.TimeRange, withErrors bool) (*v3.ClickHouseQuery, error) {
	// Find steps by order
	var stepA, stepB *tracefunnel.FunnelStep
	for i := range funnel.Steps {
		if funnel.Steps[i].Order == stepAOrder {
			stepA = &funnel.Steps[i]
		}
		if funnel.Steps[i].Order == stepBOrder {
			stepB = &funnel.Steps[i]
		}
	}

	if stepA == nil || stepB == nil {
		return nil, fmt.Errorf("step not found")
	}

	// Build having clause based on withErrors flag
	havingClause := ""
	if withErrors {
		havingClause = "HAVING has_error = 1"
	}

	// Build filter strings for each step
	stepAFilters := ""
	if stepA.Filters != nil && len(stepA.Filters.Items) > 0 {
		// ToDO: need to implement where clause filtering with minimal code duplication
		stepAFilters = "/* Custom filters for step A would be applied here */"
	}

	stepBFilters := ""
	if stepB.Filters != nil && len(stepB.Filters.Items) > 0 {
		// ToDO: need to implement where clause filtering with minimal code duplication
		stepBFilters = "/* Custom filters for step B would be applied here */"
	}

	query := fmt.Sprintf(`
	WITH
		toUInt64(%d) AS start_time,
		toUInt64(%d) AS end_time,
		toString(intDiv(start_time, 1000000000) - 1800) AS tsBucketStart,
		toString(intDiv(end_time, 1000000000)) AS tsBucketEnd
	SELECT
		trace_id,
		concat(toString((max_end_time_ns - min_start_time_ns) / 1e6), ' ms') AS duration_ms,
		COUNT(*) AS span_count
	FROM (
		SELECT
			s1.trace_id,
			MIN(toUnixTimestamp64Nano(s1.timestamp)) AS min_start_time_ns,
			MAX(toUnixTimestamp64Nano(s2.timestamp) + s2.duration_nano) AS max_end_time_ns,
			MAX(s1.has_error OR s2.has_error) AS has_error
		FROM %s AS s1
		JOIN %s AS s2
			ON s1.trace_id = s2.trace_id
		WHERE s1.resource_string_service$$name = '%s'
		  AND s1.name = '%s'
		  AND s2.resource_string_service$$name = '%s'
		  AND s2.name = '%s'
		  AND s1.timestamp BETWEEN toString(start_time) AND toString(end_time)
		  AND s1.ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
		  AND s2.timestamp BETWEEN toString(start_time) AND toString(end_time)
		  AND s2.ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
		  %s
		  %s
		GROUP BY s1.trace_id
		%s
	) AS trace_durations
	JOIN %s AS spans
		ON spans.trace_id = trace_durations.trace_id
	WHERE spans.timestamp BETWEEN toString(start_time) AND toString(end_time)
	  AND spans.ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
	GROUP BY trace_id, duration_ms
	ORDER BY CAST(replaceRegexpAll(duration_ms, ' ms$', '') AS Float64) DESC
	LIMIT 5`,
		timeRange.StartTime,
		timeRange.EndTime,
		TracesTable,
		TracesTable,
		escapeString(stepA.ServiceName),
		escapeString(stepA.SpanName),
		escapeString(stepB.ServiceName),
		escapeString(stepB.SpanName),
		stepAFilters,
		stepBFilters,
		havingClause,
		TracesTable,
	)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

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
