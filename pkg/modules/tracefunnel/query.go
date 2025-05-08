package tracefunnel

import (
	"fmt"
	tracev4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"strings"
)

func ValidateTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	var query string
	var err error

	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	containsErrorT3 := 0

	if funnelSteps[0].HasErrors {
		containsErrorT1 = 1
	}
	if funnelSteps[1].HasErrors {
		containsErrorT2 = 1
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].HasErrors {
		containsErrorT3 = 1
	}

	// Build filter clauses for each step
	clauseStep1, err := tracev4.BuildTracesFilterQuery(funnelSteps[0].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep2, err := tracev4.BuildTracesFilterQuery(funnelSteps[1].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep3 := ""
	if len(funnel.Steps) > 2 {
		clauseStep3, err = tracev4.BuildTracesFilterQuery(funnelSteps[2].Filters)
		if err != nil {
			return nil, err
		}
	}

	if len(funnel.Steps) > 2 {
		query = BuildThreeStepFunnelValidationQuery(
			containsErrorT1,            // containsErrorT1
			containsErrorT2,            // containsErrorT2
			containsErrorT3,            // containsErrorT3
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			funnelSteps[2].ServiceName, // serviceNameT1
			funnelSteps[2].SpanName,    // spanNameT3
			clauseStep1,
			clauseStep2,
			clauseStep3,
		)
	} else {
		query = BuildTwoStepFunnelValidationQuery(
			containsErrorT1,            // containsErrorT1
			containsErrorT2,            // containsErrorT2
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			clauseStep1,
			clauseStep2,
		)
	}

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func GetFunnelAnalytics(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	var query string
	var err error

	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	containsErrorT3 := 0
	latencyPointerT1 := funnelSteps[0].LatencyPointer
	latencyPointerT2 := funnelSteps[1].LatencyPointer
	latencyPointerT3 := "start"
	if len(funnel.Steps) > 2 {
		latencyPointerT3 = funnelSteps[2].LatencyPointer
	}

	if funnelSteps[0].HasErrors {
		containsErrorT1 = 1
	}
	if funnelSteps[1].HasErrors {
		containsErrorT2 = 1
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].HasErrors {
		containsErrorT3 = 1
	}

	// Build filter clauses for each step
	clauseStep1, err := tracev4.BuildTracesFilterQuery(funnelSteps[0].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep2, err := tracev4.BuildTracesFilterQuery(funnelSteps[1].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep3 := ""
	if len(funnel.Steps) > 2 {
		clauseStep3, err = tracev4.BuildTracesFilterQuery(funnelSteps[2].Filters)
		if err != nil {
			return nil, err
		}
	}

	if len(funnel.Steps) > 2 {
		query = BuildThreeStepFunnelOverviewQuery(
			containsErrorT1, // containsErrorT1
			containsErrorT2, // containsErrorT2
			containsErrorT3, // containsErrorT3
			latencyPointerT1,
			latencyPointerT2,
			latencyPointerT3,
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			funnelSteps[2].ServiceName, // serviceNameT1
			funnelSteps[2].SpanName,    // spanNameT3
			clauseStep1,
			clauseStep2,
			clauseStep3,
		)
	} else {
		query = BuildTwoStepFunnelOverviewQuery(
			containsErrorT1, // containsErrorT1
			containsErrorT2, // containsErrorT2
			latencyPointerT1,
			latencyPointerT2,
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			clauseStep1,
			clauseStep2,
		)
	}
	return &v3.ClickHouseQuery{Query: query}, nil
}

func GetFunnelStepAnalytics(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
	var query string
	var err error

	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	containsErrorT3 := 0
	latencyPointerT1 := funnelSteps[0].LatencyPointer
	latencyPointerT2 := funnelSteps[1].LatencyPointer
	latencyPointerT3 := "start"
	if len(funnel.Steps) > 2 {
		latencyPointerT3 = funnelSteps[2].LatencyPointer
	}
	latencyTypeT2 := "p99"
	latencyTypeT3 := "p99"

	if stepStart == stepEnd {
		return nil, fmt.Errorf("step start and end cannot be the same for /step/overview")
	}

	if funnelSteps[0].HasErrors {
		containsErrorT1 = 1
	}
	if funnelSteps[1].HasErrors {
		containsErrorT2 = 1
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].HasErrors {
		containsErrorT3 = 1
	}

	if funnelSteps[1].LatencyType != "" {
		latencyTypeT2 = strings.ToLower(funnelSteps[1].LatencyType)
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].LatencyType != "" {
		latencyTypeT3 = strings.ToLower(funnelSteps[2].LatencyType)
	}

	// Build filter clauses for each step
	clauseStep1, err := tracev4.BuildTracesFilterQuery(funnelSteps[0].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep2, err := tracev4.BuildTracesFilterQuery(funnelSteps[1].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep3 := ""
	if len(funnel.Steps) > 2 {
		clauseStep3, err = tracev4.BuildTracesFilterQuery(funnelSteps[2].Filters)
		if err != nil {
			return nil, err
		}
	}

	if len(funnel.Steps) > 2 {
		query = BuildThreeStepFunnelStepOverviewQuery(
			containsErrorT1, // containsErrorT1
			containsErrorT2, // containsErrorT2
			containsErrorT3, // containsErrorT3
			latencyPointerT1,
			latencyPointerT2,
			latencyPointerT3,
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			funnelSteps[2].ServiceName, // serviceNameT1
			funnelSteps[2].SpanName,    // spanNameT3
			clauseStep1,
			clauseStep2,
			clauseStep3,
			stepStart,
			stepEnd,
			latencyTypeT2,
			latencyTypeT3,
		)
	} else {
		query = BuildTwoStepFunnelStepOverviewQuery(
			containsErrorT1, // containsErrorT1
			containsErrorT2, // containsErrorT2
			latencyPointerT1,
			latencyPointerT2,
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			clauseStep1,
			clauseStep2,
			latencyTypeT2,
		)
	}
	return &v3.ClickHouseQuery{Query: query}, nil
}

func GetStepAnalytics(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	var query string

	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	containsErrorT3 := 0

	if funnelSteps[0].HasErrors {
		containsErrorT1 = 1
	}
	if funnelSteps[1].HasErrors {
		containsErrorT2 = 1
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].HasErrors {
		containsErrorT3 = 1
	}

	// Build filter clauses for each step
	clauseStep1, err := tracev4.BuildTracesFilterQuery(funnelSteps[0].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep2, err := tracev4.BuildTracesFilterQuery(funnelSteps[1].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep3 := ""
	if len(funnel.Steps) > 2 {
		clauseStep3, err = tracev4.BuildTracesFilterQuery(funnelSteps[2].Filters)
		if err != nil {
			return nil, err
		}
	}

	if len(funnel.Steps) > 2 {
		query = BuildThreeStepFunnelCountQuery(
			containsErrorT1,            // containsErrorT1
			containsErrorT2,            // containsErrorT2
			containsErrorT3,            // containsErrorT3
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			funnelSteps[2].ServiceName, // serviceNameT1
			funnelSteps[2].SpanName,    // spanNameT3
			clauseStep1,
			clauseStep2,
			clauseStep3,
		)
	} else {
		query = BuildTwoStepFunnelCountQuery(
			containsErrorT1,            // containsErrorT1
			containsErrorT2,            // containsErrorT2
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			clauseStep1,
			clauseStep2,
		)
	}

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func GetSlowestTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
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
	clauseStep1, err := tracev4.BuildTracesFilterQuery(funnelSteps[stepStartOrder].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep2, err := tracev4.BuildTracesFilterQuery(funnelSteps[stepEndOrder].Filters)
	if err != nil {
		return nil, err
	}

	query := BuildTwoStepFunnelTopSlowTracesQuery(
		containsErrorT1,                         // containsErrorT1
		containsErrorT2,                         // containsErrorT2
		timeRange.StartTime,                     // startTs
		timeRange.EndTime,                       // endTs
		funnelSteps[stepStartOrder].ServiceName, // serviceNameT1
		funnelSteps[stepStartOrder].SpanName,    // spanNameT1
		funnelSteps[stepEndOrder].ServiceName,   // serviceNameT1
		funnelSteps[stepEndOrder].SpanName,      // spanNameT2
		clauseStep1,
		clauseStep2,
	)
	return &v3.ClickHouseQuery{Query: query}, nil
}

func GetErroredTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
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
	clauseStep1, err := tracev4.BuildTracesFilterQuery(funnelSteps[stepStartOrder].Filters)
	if err != nil {
		return nil, err
	}
	clauseStep2, err := tracev4.BuildTracesFilterQuery(funnelSteps[stepEndOrder].Filters)
	if err != nil {
		return nil, err
	}

	query := BuildTwoStepFunnelTopSlowErrorTracesQuery(
		containsErrorT1,                         // containsErrorT1
		containsErrorT2,                         // containsErrorT2
		timeRange.StartTime,                     // startTs
		timeRange.EndTime,                       // endTs
		funnelSteps[stepStartOrder].ServiceName, // serviceNameT1
		funnelSteps[stepStartOrder].SpanName,    // spanNameT1
		funnelSteps[stepEndOrder].ServiceName,   // serviceNameT1
		funnelSteps[stepEndOrder].SpanName,      // spanNameT2
		clauseStep1,
		clauseStep2,
	)
	return &v3.ClickHouseQuery{Query: query}, nil
}
