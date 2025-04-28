package tracefunnels

import (
	"fmt"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
)

// QueryBuilder helps build ClickHouse queries for funnel analysis
type QueryBuilder struct {
	steps     []traceFunnels.FunnelStep
	timeRange traceFunnels.TimeRange
	limit     int
}

// NewQueryBuilder creates a new query builder
func NewQueryBuilder(funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) *QueryBuilder {
	return &QueryBuilder{
		steps:     funnel.Steps,
		timeRange: timeRange,
		limit:     100,
	}
}

// WithLimit sets the limit for the query
func (qb *QueryBuilder) WithLimit(limit int) *QueryBuilder {
	qb.limit = limit
	return qb
}

// buildStepCTE builds a CTE for a single step
func (qb *QueryBuilder) buildStepCTE(step traceFunnels.FunnelStep, stepNum int) string {
	return fmt.Sprintf(`
		step%d AS (
			SELECT 
				trace_id,
				service_name,
				name as span_name,
				timestamp,
				duration_ns,
				status_code
			FROM signoz_traces.signoz_index_v2
			WHERE service_name = '%s'
			AND name = '%s'
			AND timestamp >= %d
			AND timestamp <= %d
		)`,
		stepNum,
		step.ServiceName,
		step.SpanName,
		qb.timeRange.StartTime,
		qb.timeRange.EndTime,
	)
}

// buildStepCTEs builds all step CTEs
func (qb *QueryBuilder) buildStepCTEs() string {
	var ctes []string
	for i, step := range qb.steps {
		ctes = append(ctes, qb.buildStepCTE(step, i+1))
	}
	return strings.Join(ctes, ",\n")
}

// buildStepJoins builds the JOIN clauses between steps
func (qb *QueryBuilder) buildStepJoins() string {
	var joins []string
	for i := 1; i < len(qb.steps); i++ {
		joins = append(joins, fmt.Sprintf("JOIN step%d s%d ON s%d.trace_id = s%d.trace_id AND s%d.timestamp > s%d.timestamp",
			i+1, i+1, i, i+1, i+1, i))
	}
	return strings.Join(joins, "\n")
}

// buildStepSelects builds the SELECT clauses for each step
func (qb *QueryBuilder) buildStepSelects() string {
	var selects []string
	for i := range qb.steps {
		selects = append(selects, fmt.Sprintf("s%d.timestamp as step%d_timestamp", i+1, i+1))
		selects = append(selects, fmt.Sprintf("s%d.duration_ns / 1000000 as step%d_duration_ms", i+1, i+1))
	}
	return strings.Join(selects, ",\n")
}

// ValidateTraces builds a ClickHouse query to validate traces in a funnel
func ValidateTraces(funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*v3.ClickHouseQuery, error) {
	if err := ValidateFunnel(funnel); err != nil {
		return nil, fmt.Errorf("invalid funnel: %v", err)
	}

	if err := ValidateTimeRange(timeRange); err != nil {
		return nil, fmt.Errorf("invalid time range: %v", err)
	}

	qb := NewQueryBuilder(funnel, timeRange)
	query := fmt.Sprintf(`
		WITH %s
		SELECT 
			s1.trace_id,
			%s,
			s%d.timestamp - s1.timestamp as total_duration_ms
		FROM step1 s1
		%s
		ORDER BY total_duration_ms DESC
		LIMIT %d
	`,
		qb.buildStepCTEs(),
		qb.buildStepSelects(),
		len(funnel.Steps),
		qb.buildStepJoins(),
		qb.limit,
	)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

// ValidateTracesWithLatency builds a ClickHouse query to validate traces with latency information
func ValidateTracesWithLatency(funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*v3.ClickHouseQuery, error) {
	if err := ValidateFunnel(funnel); err != nil {
		return nil, fmt.Errorf("invalid funnel: %v", err)
	}

	if err := ValidateTimeRange(timeRange); err != nil {
		return nil, fmt.Errorf("invalid time range: %v", err)
	}

	qb := NewQueryBuilder(funnel, timeRange)
	query := fmt.Sprintf(`
		WITH %s
		SELECT 
			s1.trace_id,
			%s,
			s%d.timestamp - s1.timestamp as transition_duration_ms
		FROM step1 s1
		%s
		ORDER BY transition_duration_ms DESC
		LIMIT %d
	`,
		qb.buildStepCTEs(),
		qb.buildStepSelects(),
		len(funnel.Steps),
		qb.buildStepJoins(),
		qb.limit,
	)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

// GetStepAnalytics builds a ClickHouse query to get analytics for each step
func GetStepAnalytics(funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*v3.ClickHouseQuery, error) {
	if err := ValidateFunnel(funnel); err != nil {
		return nil, fmt.Errorf("invalid funnel: %v", err)
	}

	if err := ValidateTimeRange(timeRange); err != nil {
		return nil, fmt.Errorf("invalid time range: %v", err)
	}

	qb := NewQueryBuilder(funnel, timeRange)
	query := fmt.Sprintf(`
		WITH %s
		SELECT 
			COUNT(DISTINCT s1.trace_id) as total_start,
			COUNT(DISTINCT s%d.trace_id) as total_complete,
			COUNT(DISTINCT CASE WHEN s%d.status_code >= 400 THEN s%d.trace_id END) as error_count,
			AVG(s%d.timestamp - s1.timestamp) as avg_duration_ms,
			quantile(0.99)(s%d.timestamp - s1.timestamp) as p99_latency_ms,
			COUNT(DISTINCT s%d.trace_id) * 100.0 / COUNT(DISTINCT s1.trace_id) as conversion_rate
		FROM step1 s1
		%s
	`,
		qb.buildStepCTEs(),
		len(funnel.Steps),
		len(funnel.Steps),
		len(funnel.Steps),
		len(funnel.Steps),
		len(funnel.Steps),
		len(funnel.Steps),
		qb.buildStepJoins(),
	)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

// GetSlowestTraces builds a ClickHouse query to get the slowest traces between two steps
func GetSlowestTraces(funnel *traceFunnels.Funnel, stepAOrder, stepBOrder int64, timeRange traceFunnels.TimeRange, isError bool) (*v3.ClickHouseQuery, error) {
	if err := ValidateFunnel(funnel); err != nil {
		return nil, fmt.Errorf("invalid funnel: %v", err)
	}

	if err := ValidateTimeRange(timeRange); err != nil {
		return nil, fmt.Errorf("invalid time range: %v", err)
	}

	// Find the steps by order
	var stepA, stepB *traceFunnels.FunnelStep
	for _, step := range funnel.Steps {
		if step.Order == stepAOrder {
			stepA = &step
		}
		if step.Order == stepBOrder {
			stepB = &step
		}
	}

	if stepA == nil || stepB == nil {
		return nil, fmt.Errorf("steps not found")
	}

	// Create a new funnel with just the two steps we want to analyze
	analysisFunnel := &traceFunnels.Funnel{
		Steps: []traceFunnels.FunnelStep{*stepA, *stepB},
	}

	qb := NewQueryBuilder(analysisFunnel, timeRange)
	query := fmt.Sprintf(`
		WITH %s
		SELECT 
			s1.trace_id,
			%s,
			s2.timestamp - s1.timestamp as transition_duration_ms,
			s2.status_code
		FROM step1 s1
		%s
		WHERE CASE WHEN %t THEN s2.status_code >= 400 ELSE 1=1 END
		ORDER BY transition_duration_ms DESC
		LIMIT %d
	`,
		qb.buildStepCTEs(),
		qb.buildStepSelects(),
		qb.buildStepJoins(),
		isError,
		qb.limit,
	)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}
