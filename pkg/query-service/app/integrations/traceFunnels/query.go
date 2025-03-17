package traceFunnels

import (
	"fmt"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

// TracesTable is the ClickHouse table name for traces
const TracesTable = "signoz_traces.signoz_index_v3"

// StepAnalytics represents analytics data for a single step in a funnel
type StepAnalytics struct {
	StepOrder     int64  `json:"stepOrder"`
	TotalSpans    int64  `json:"totalSpans"`
	ErroredSpans  int64  `json:"erroredSpans"`
	AvgDurationMs string `json:"avgDurationMs"`
}

// FunnelStepFilter represents filters for a single step in the funnel
type FunnelStepFilter struct {
	StepNumber     int
	ServiceName    string
	SpanName       string
	LatencyPointer string // "start" or "end"
	CustomFilters  *v3.FilterSet
}

// SlowTrace represents a trace with its duration and span count
type SlowTrace struct {
	TraceID    string `json:"traceId"`
	DurationMs string `json:"durationMs"`
	SpanCount  int64  `json:"spanCount"`
}

// ValidateTraces parses the Funnel and builds a query to validate traces
func ValidateTraces(funnel *Funnel, timeRange TimeRange) (*v3.ClickHouseQuery, error) {
	filters, err := buildFunnelFilters(funnel)
	if err != nil {
		return nil, fmt.Errorf("error building funnel filters: %w", err)
	}

	query := generateFunnelSQL(timeRange.StartTime, timeRange.EndTime, filters)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

// ValidateTracesWithLatency builds a query that considers the latency pointer for trace calculations
func ValidateTracesWithLatency(funnel *Funnel, timeRange TimeRange) (*v3.ClickHouseQuery, error) {
	filters, err := buildFunnelFiltersWithLatency(funnel)
	if err != nil {
		return nil, fmt.Errorf("error building funnel filters with latency: %w", err)
	}

	query := generateFunnelSQLWithLatency(timeRange.StartTime, timeRange.EndTime, filters)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

// buildFunnelFilters extracts filters from funnel steps (without latency pointer)
func buildFunnelFilters(funnel *Funnel) ([]FunnelStepFilter, error) {
	if funnel == nil {
		return nil, fmt.Errorf("funnel cannot be nil")
	}

	if len(funnel.Steps) == 0 {
		return nil, fmt.Errorf("funnel must have at least one step")
	}

	filters := make([]FunnelStepFilter, len(funnel.Steps))

	for i, step := range funnel.Steps {
		filters[i] = FunnelStepFilter{
			StepNumber:    i + 1,
			ServiceName:   step.ServiceName,
			SpanName:      step.SpanName,
			CustomFilters: step.Filters,
		}
	}

	return filters, nil
}

// buildFunnelFiltersWithLatency extracts filters including the latency pointer
func buildFunnelFiltersWithLatency(funnel *Funnel) ([]FunnelStepFilter, error) {
	if funnel == nil {
		return nil, fmt.Errorf("funnel cannot be nil")
	}

	if len(funnel.Steps) == 0 {
		return nil, fmt.Errorf("funnel must have at least one step")
	}

	filters := make([]FunnelStepFilter, len(funnel.Steps))

	for i, step := range funnel.Steps {
		latencyPointer := "start" // Default value
		if step.LatencyPointer != "" {
			latencyPointer = step.LatencyPointer
		}

		filters[i] = FunnelStepFilter{
			StepNumber:     i + 1,
			ServiceName:    step.ServiceName,
			SpanName:       step.SpanName,
			LatencyPointer: latencyPointer,
			CustomFilters:  step.Filters,
		}
	}

	return filters, nil
}

// escapeString escapes a string for safe use in SQL queries
func escapeString(s string) string {
	// Replace single quotes with double single quotes to escape them in SQL
	return strings.ReplaceAll(s, "'", "''")
}

// generateFunnelSQL builds the ClickHouse SQL query for funnel validation
func generateFunnelSQL(start, end int64, filters []FunnelStepFilter) string {
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

	// Join all expressions with commas and newlines
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

// generateFunnelSQLWithLatency correctly applies latency pointer logic for trace duration
func generateFunnelSQLWithLatency(start, end int64, filters []FunnelStepFilter) string {
	var expressions []string

	// Define the base time variables
	expressions = append(expressions, fmt.Sprintf("toUInt64(%d) AS start_time", start))
	expressions = append(expressions, fmt.Sprintf("toUInt64(%d) AS end_time", end))
	expressions = append(expressions, "toString(intDiv(start_time, 1000000000) - 1800) AS tsBucketStart")
	expressions = append(expressions, "toString(intDiv(end_time, 1000000000)) AS tsBucketEnd")
	expressions = append(expressions, "(end_time - start_time) / 1e9 AS total_time_seconds")

	// Define service, span, and latency pointer mappings
	for _, f := range filters {
		expressions = append(expressions, fmt.Sprintf("('%s', '%s', '%s') AS s%d_config",
			escapeString(f.ServiceName),
			escapeString(f.SpanName),
			escapeString(f.LatencyPointer),
			f.StepNumber))
	}

	// Construct the WITH clause
	withClause := "WITH \n" + strings.Join(expressions, ",\n") + "\n"

	// Latency calculation logic
	var latencyCases []string
	for _, f := range filters {
		if f.LatencyPointer == "end" {
			latencyCases = append(latencyCases, fmt.Sprintf(`
                WHEN (resource_string_service$$name, name) = (s%d_config.1, s%d_config.2) 
                THEN toUnixTimestamp64Nano(timestamp) + duration_nano`, f.StepNumber, f.StepNumber))
		} else {
			latencyCases = append(latencyCases, fmt.Sprintf(`
                WHEN (resource_string_service$$name, name) = (s%d_config.1, s%d_config.2) 
                THEN toUnixTimestamp64Nano(timestamp)`, f.StepNumber, f.StepNumber))
		}
	}

	latencyComputation := fmt.Sprintf(`
        MAX(
            CASE %s
                ELSE toUnixTimestamp64Nano(timestamp)
            END
        ) - 
        MIN(
            CASE %s
                ELSE toUnixTimestamp64Nano(timestamp)
            END
        ) AS trace_duration`, strings.Join(latencyCases, ""), strings.Join(latencyCases, ""))

	query := withClause + `
SELECT 
    COUNT(DISTINCT CASE WHEN in_funnel_s1 = 1 THEN trace_id END) AS total_s1,
    COUNT(DISTINCT CASE WHEN in_funnel_s3 = 1 THEN trace_id END) AS total_s3,
    COUNT(DISTINCT CASE WHEN in_funnel_s3 = 1 THEN trace_id END) / total_time_seconds AS avg_rate,
    COUNT(DISTINCT CASE WHEN in_funnel_s3 = 1 AND has_error = true THEN trace_id END) AS errors,
    avg(trace_duration) AS avg_duration,
    quantile(0.99)(trace_duration) AS p99_latency,
    100 - (
        (COUNT(DISTINCT CASE WHEN in_funnel_s1 = 1 THEN trace_id END) - 
         COUNT(DISTINCT CASE WHEN in_funnel_s3 = 1 THEN trace_id END))
        / NULLIF(COUNT(DISTINCT CASE WHEN in_funnel_s1 = 1 THEN trace_id END), 0) * 100
    ) AS conversion_rate
FROM (
    SELECT 
        trace_id,
        ` + latencyComputation + `,
        MAX(has_error) AS has_error,
        MAX(CASE WHEN (resource_string_service$$name, name) = (s1_config.1, s1_config.2) THEN 1 ELSE 0 END) AS in_funnel_s1,
        MAX(CASE WHEN (resource_string_service$$name, name) = (s3_config.1, s3_config.2) THEN 1 ELSE 0 END) AS in_funnel_s3
    FROM ` + TracesTable + `
    WHERE timestamp BETWEEN toString(start_time) AND toString(end_time)
      AND ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
      AND (resource_string_service$$name, name) IN (` + generateFilterConditions(filters) + `)
    GROUP BY trace_id
) AS trace_metrics;
`
	return query
}

// generateFilterConditions creates the filtering conditions dynamically
func generateFilterConditions(filters []FunnelStepFilter) string {
	var conditions []string
	for _, f := range filters {
		conditions = append(conditions, fmt.Sprintf("(s%d_config.1, s%d_config.2)", f.StepNumber, f.StepNumber))
	}
	return strings.Join(conditions, ", ")
}

// GetStepAnalytics builds a query to get analytics for each step in a funnel
func GetStepAnalytics(funnel *Funnel, timeRange TimeRange) (*v3.ClickHouseQuery, error) {
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
			// This is a placeholder - in a real implementation, you would convert
			// the filter set to a SQL WHERE clause string
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

// buildFilters converts a step's filters to a SQL WHERE clause string
func buildFilters(step FunnelStep) string {
	if step.Filters == nil || len(step.Filters.Items) == 0 {
		return ""
	}

	// This is a placeholder - in a real implementation, you would convert
	// the filter set to a SQL WHERE clause string
	return "/* Custom filters would be applied here */"
}

// GetSlowestTraces builds a query to get the slowest traces for a transition between two steps
func GetSlowestTraces(funnel *Funnel, stepAOrder int64, stepBOrder int64, timeRange TimeRange, withErrors bool) (*v3.ClickHouseQuery, error) {
	// Find steps by order
	var stepA, stepB *FunnelStep
	for i := range funnel.Steps {
		if funnel.Steps[i].StepOrder == stepAOrder {
			stepA = &funnel.Steps[i]
		}
		if funnel.Steps[i].StepOrder == stepBOrder {
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
		// This is a placeholder - in a real implementation, you would convert
		// the filter set to a SQL WHERE clause string
		stepAFilters = "/* Custom filters for step A would be applied here */"
	}

	stepBFilters := ""
	if stepB.Filters != nil && len(stepB.Filters.Items) > 0 {
		// This is a placeholder - in a real implementation, you would convert
		// the filter set to a SQL WHERE clause string
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
