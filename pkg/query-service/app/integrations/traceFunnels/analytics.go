package traceFunnels

//
//import (
//	"fmt"
//)
//
//// GetSlowestTraces gets the slowest traces for a transition between two steps
//func (c *ClickHouseClient) GetSlowestTraces(funnel *Funnel, stepAOrder int64, stepBOrder int64, timeRange TimeRange, withErrors bool) ([]SlowTrace, error) {
//	// Find steps by order
//	var stepA, stepB *FunnelStep
//	for i := range funnel.Steps {
//		if funnel.Steps[i].StepOrder == stepAOrder {
//			stepA = &funnel.Steps[i]
//		}
//		if funnel.Steps[i].StepOrder == stepBOrder {
//			stepB = &funnel.Steps[i]
//		}
//	}
//
//	if stepA == nil || stepB == nil {
//		return nil, fmt.Errorf("step not found")
//	}
//
//	// Build having clause based on withErrors flag
//	havingClause := ""
//	if withErrors {
//		havingClause = "HAVING has_error = 1"
//	}
//
//	query := fmt.Sprintf(`
//	WITH
//		toUInt64('%d') AS start_time,
//		toUInt64('%d') AS end_time,
//		toString(intDiv(start_time, 1000000000) - 1800) AS tsBucketStart,
//		toString(intDiv(end_time, 1000000000)) AS tsBucketEnd
//	SELECT
//		trace_id,
//		concat(toString((max_end_time_ns - min_start_time_ns) / 1e6), ' ms') AS duration_ms,
//		COUNT(*) AS span_count
//	FROM (
//		SELECT
//			s1.trace_id,
//			MIN(toUnixTimestamp64Nano(s1.timestamp)) AS min_start_time_ns,
//			MAX(toUnixTimestamp64Nano(s2.timestamp) + s2.duration_nano) AS max_end_time_ns,
//			MAX(s1.has_error OR s2.has_error) AS has_error
//		FROM signoz_traces.signoz_index_v3 AS s1
//		JOIN signoz_traces.signoz_index_v3 AS s2
//			ON s1.trace_id = s2.trace_id
//		WHERE s1.resource_string_service$$name = '%s'
//		  AND s1.name = '%s'
//		  AND s2.resource_string_service$$name = '%s'
//		  AND s2.name = '%s'
//		  AND s1.timestamp BETWEEN toString(start_time) AND toString(end_time)
//		  AND s1.ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
//		  AND s2.timestamp BETWEEN toString(start_time) AND toString(end_time)
//		  AND s2.ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
//		  %s
//		  %s
//		GROUP BY s1.trace_id
//		%s
//	) AS trace_durations
//	JOIN signoz_traces.signoz_index_v3 AS spans
//		ON spans.trace_id = trace_durations.trace_id
//	WHERE spans.timestamp BETWEEN toString(start_time) AND toString(end_time)
//	  AND spans.ts_bucket_start BETWEEN tsBucketStart AND tsBucketEnd
//	GROUP BY trace_id, duration_ms
//	ORDER BY CAST(replaceRegexpAll(duration_ms, ' ms$', '') AS Float64) DESC
//	LIMIT 5`,
//		timeRange.StartTime,
//		timeRange.EndTime,
//		stepA.ServiceName,
//		stepA.SpanName,
//		stepB.ServiceName,
//		stepB.SpanName,
//		buildFilters(*stepA),
//		buildFilters(*stepB),
//		havingClause,
//	)
//
//	// Execute the query
//	rows, err := c.db.Query(query)
//	if err != nil {
//		return nil, fmt.Errorf("failed to execute query: %v", err)
//	}
//	defer rows.Close()
//
//	var traces []SlowTrace
//	for rows.Next() {
//		var trace SlowTrace
//		if err := rows.Scan(&trace.TraceID, &trace.DurationMs, &trace.SpanCount); err != nil {
//			return nil, fmt.Errorf("failed to scan row: %v", err)
//		}
//		traces = append(traces, trace)
//	}
//
//	if err := rows.Err(); err != nil {
//		return nil, fmt.Errorf("error iterating rows: %v", err)
//	}
//
//	return traces, nil
//}
