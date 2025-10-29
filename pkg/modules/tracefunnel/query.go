package tracefunnel

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	tracev4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
)

// sanitizeClause adds AND prefix to non-empty clauses if not already present
func sanitizeClause(clause string) string {
	if clause == "" {
		return ""
	}
	// Check if clause already starts with AND
	if strings.HasPrefix(strings.TrimSpace(clause), "AND") {
		return clause
	}
	return "AND " + clause
}

func ValidateTraces(funnel *tracefunneltypes.StorableFunnel, timeRange tracefunneltypes.TimeRange) (*v3.ClickHouseQuery, error) {
	funnelSteps := funnel.Steps

	// Build step data for the dynamic query builder
	steps := make([]struct {
		ServiceName   string
		SpanName      string
		ContainsError int
		Clause        string
	}, len(funnelSteps))

	for i, step := range funnelSteps {
		// Build filter clause
		clause, err := tracev4.BuildTracesFilterQuery(step.Filters, false)
		if err != nil {
			return nil, err
		}

		steps[i] = struct {
			ServiceName   string
			SpanName      string
			ContainsError int
			Clause        string
		}{
			ServiceName:   step.ServiceName,
			SpanName:      step.SpanName,
			ContainsError: 0,
			Clause:        sanitizeClause(clause),
		}

		if step.HasErrors {
			steps[i].ContainsError = 1
		}
	}

	query := BuildFunnelValidationQuery(steps, timeRange.StartTime, timeRange.EndTime)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func GetFunnelAnalytics(funnel *tracefunneltypes.StorableFunnel, timeRange tracefunneltypes.TimeRange) (*v3.ClickHouseQuery, error) {
	funnelSteps := funnel.Steps

	// Build step data for the dynamic query builder
	steps := make([]struct {
		ServiceName    string
		SpanName       string
		ContainsError  int
		LatencyPointer string
		Clause         string
	}, len(funnelSteps))

	for i, step := range funnelSteps {
		// Build filter clause
		clause, err := tracev4.BuildTracesFilterQuery(step.Filters, false)
		if err != nil {
			return nil, err
		}

		latencyPointer := step.LatencyPointer
		if latencyPointer == "" {
			latencyPointer = "start"
		}

		steps[i] = struct {
			ServiceName    string
			SpanName       string
			ContainsError  int
			LatencyPointer string
			Clause         string
		}{
			ServiceName:    step.ServiceName,
			SpanName:       step.SpanName,
			ContainsError:  0,
			LatencyPointer: latencyPointer,
			Clause:         sanitizeClause(clause),
		}

		if step.HasErrors {
			steps[i].ContainsError = 1
		}
	}

	query := BuildFunnelOverviewQuery(steps, timeRange.StartTime, timeRange.EndTime)

	return &v3.ClickHouseQuery{Query: query}, nil
}

func GetFunnelStepAnalytics(funnel *tracefunneltypes.StorableFunnel, timeRange tracefunneltypes.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
	if stepStart == stepEnd {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "step start and end cannot be the same for /step/overview")
	}

	funnelSteps := funnel.Steps

	// Build step data for the dynamic query builder
	steps := make([]struct {
		ServiceName    string
		SpanName       string
		ContainsError  int
		LatencyPointer string
		LatencyType    string
		Clause         string
	}, len(funnelSteps))

	for i, step := range funnelSteps {
		// Build filter clause
		clause, err := tracev4.BuildTracesFilterQuery(step.Filters, false)
		if err != nil {
			return nil, err
		}

		latencyPointer := step.LatencyPointer
		if latencyPointer == "" {
			latencyPointer = "start"
		}

		steps[i] = struct {
			ServiceName    string
			SpanName       string
			ContainsError  int
			LatencyPointer string
			LatencyType    string
			Clause         string
		}{
			ServiceName:    step.ServiceName,
			SpanName:       step.SpanName,
			ContainsError:  0,
			LatencyPointer: latencyPointer,
			LatencyType:    step.LatencyType,
			Clause:         sanitizeClause(clause),
		}

		if step.HasErrors {
			steps[i].ContainsError = 1
		}
	}

	query := BuildFunnelStepOverviewQuery(steps, timeRange.StartTime, timeRange.EndTime, stepStart, stepEnd)

	return &v3.ClickHouseQuery{Query: query}, nil
}

func GetStepAnalytics(funnel *tracefunneltypes.StorableFunnel, timeRange tracefunneltypes.TimeRange) (*v3.ClickHouseQuery, error) {
	funnelSteps := funnel.Steps

	// Build step data for the dynamic query builder
	steps := make([]struct {
		ServiceName   string
		SpanName      string
		ContainsError int
		Clause        string
	}, len(funnelSteps))

	for i, step := range funnelSteps {
		// Build filter clause
		clause, err := tracev4.BuildTracesFilterQuery(step.Filters, false)
		if err != nil {
			return nil, err
		}

		steps[i] = struct {
			ServiceName   string
			SpanName      string
			ContainsError int
			Clause        string
		}{
			ServiceName:   step.ServiceName,
			SpanName:      step.SpanName,
			ContainsError: 0,
			Clause:        sanitizeClause(clause),
		}

		if step.HasErrors {
			steps[i].ContainsError = 1
		}
	}

	query := BuildFunnelCountQuery(steps, timeRange.StartTime, timeRange.EndTime)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func GetSlowestTraces(funnel *tracefunneltypes.StorableFunnel, timeRange tracefunneltypes.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	stepStartOrder := 0
	stepEndOrder := 1

	if stepStart != stepEnd {
		stepStartOrder = int(stepStart) - 1
		stepEndOrder = int(stepEnd) - 1
		if funnelSteps[stepStartOrder].HasErrors {
			containsErrorT1 = 1
		}
		if funnelSteps[stepEndOrder].HasErrors {
			containsErrorT2 = 1
		}
	}

	// Build filter clauses for the steps
	clauseStep1, err := tracev4.BuildTracesFilterQuery(funnelSteps[stepStartOrder].Filters, false)
	if err != nil {
		return nil, err
	}
	clauseStep2, err := tracev4.BuildTracesFilterQuery(funnelSteps[stepEndOrder].Filters, false)
	if err != nil {
		return nil, err
	}

	// Sanitize clauses
	clauseStep1 = sanitizeClause(clauseStep1)
	clauseStep2 = sanitizeClause(clauseStep2)

	// Get latency pointers with defaults
	latencyPointerT1 := funnelSteps[stepStartOrder].LatencyPointer
	if latencyPointerT1 == "" {
		latencyPointerT1 = "start"
	}
	latencyPointerT2 := funnelSteps[stepEndOrder].LatencyPointer
	if latencyPointerT2 == "" {
		latencyPointerT2 = "start"
	}

	query := BuildFunnelTopSlowTracesQuery(
		containsErrorT1,
		containsErrorT2,
		timeRange.StartTime,
		timeRange.EndTime,
		funnelSteps[stepStartOrder].ServiceName,
		funnelSteps[stepStartOrder].SpanName,
		funnelSteps[stepEndOrder].ServiceName,
		funnelSteps[stepEndOrder].SpanName,
		clauseStep1,
		clauseStep2,
		latencyPointerT1,
		latencyPointerT2,
	)
	return &v3.ClickHouseQuery{Query: query}, nil
}

// TODO: Showing traces with error which are slow makes little sense as a product. We should show the error spans directly in the funnel chart. Rather showing traces which has drop between steps will be more relevant
func GetErroredTraces(funnel *tracefunneltypes.StorableFunnel, timeRange tracefunneltypes.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	stepStartOrder := 0
	stepEndOrder := 1

	if stepStart != stepEnd {
		stepStartOrder = int(stepStart) - 1
		stepEndOrder = int(stepEnd) - 1
		if funnelSteps[stepStartOrder].HasErrors {
			containsErrorT1 = 1
		}
		if funnelSteps[stepEndOrder].HasErrors {
			containsErrorT2 = 1
		}
	}

	// Build filter clauses for the steps
	clauseStep1, err := tracev4.BuildTracesFilterQuery(funnelSteps[stepStartOrder].Filters, false)
	if err != nil {
		return nil, err
	}
	clauseStep2, err := tracev4.BuildTracesFilterQuery(funnelSteps[stepEndOrder].Filters, false)
	if err != nil {
		return nil, err
	}

	// Sanitize clauses
	clauseStep1 = sanitizeClause(clauseStep1)
	clauseStep2 = sanitizeClause(clauseStep2)

	// Get latency pointers with defaults
	latencyPointerT1 := funnelSteps[stepStartOrder].LatencyPointer
	if latencyPointerT1 == "" {
		latencyPointerT1 = "start"
	}
	latencyPointerT2 := funnelSteps[stepEndOrder].LatencyPointer
	if latencyPointerT2 == "" {
		latencyPointerT2 = "start"
	}

	query := BuildFunnelTopSlowErrorTracesQuery(
		containsErrorT1,
		containsErrorT2,
		timeRange.StartTime,
		timeRange.EndTime,
		funnelSteps[stepStartOrder].ServiceName,
		funnelSteps[stepStartOrder].SpanName,
		funnelSteps[stepEndOrder].ServiceName,
		funnelSteps[stepEndOrder].SpanName,
		clauseStep1,
		clauseStep2,
		latencyPointerT1,
		latencyPointerT2,
	)
	return &v3.ClickHouseQuery{Query: query}, nil
}
