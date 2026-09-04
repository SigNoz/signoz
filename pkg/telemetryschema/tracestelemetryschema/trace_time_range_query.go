package tracestelemetryschema

import (
	"fmt"
)

func buildTraceTimeRangeQueries(placeholders string, searchFromMS, searchToMS uint64) (boundedQuery string, unboundedQuery string) {
	if searchFromMS > 0 && searchToMS > 0 {
		boundedQuery = fmt.Sprintf(`
		SELECT
			uniqExact(trace_id),
			%s,
			%s
		FROM %s.%s
		WHERE trace_id IN (%s) AND end >= toDateTime64(%d / 1000.0, 3) AND end <= toDateTime64(%d / 1000.0, 3)
	`, UnixNanoExpr("min(start)"), UnixNanoExpr("max(end)"), DBName, TraceSummaryTableName, placeholders, searchFromMS, searchToMS)
	}

	unboundedQuery = fmt.Sprintf(`
		SELECT
			count(),
			%s,
			%s
		FROM %s.%s
		WHERE trace_id IN (%s)
	`, UnixNanoExpr("min(start)"), UnixNanoExpr("max(end)"), DBName, TraceSummaryTableName, placeholders)

	return boundedQuery, unboundedQuery
}
