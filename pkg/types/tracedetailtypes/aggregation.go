package tracedetailtypes

import (
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const maxAggregationItems = 10

var ErrTooManyAggregationItems = errors.NewInvalidInputf(errors.CodeInvalidInput, "aggregations request exceeds maximum of %d items", maxAggregationItems)

// SpanAggregationType defines the aggregation to compute over spans grouped by a field.
type SpanAggregationType struct {
	valuer.String
}

var (
	SpanAggregationSpanCount               = SpanAggregationType{valuer.NewString("span_count")}
	SpanAggregationExecutionTimePercentage = SpanAggregationType{valuer.NewString("execution_time_percentage")}
	SpanAggregationDuration                = SpanAggregationType{valuer.NewString("duration")}
)

// SpanAggregation is a single aggregation request item: which field to group by and how.
type SpanAggregation struct {
	Field       telemetrytypes.TelemetryFieldKey `json:"field"`
	Aggregation SpanAggregationType              `json:"aggregation"`
}

// SpanAggregationResult is the computed result for one aggregation request item.
// Duration values are in milliseconds.
type SpanAggregationResult struct {
	Field       telemetrytypes.TelemetryFieldKey `json:"field"`
	Aggregation SpanAggregationType              `json:"aggregation"`
	Value       map[string]uint64                `json:"value" nullable:"true"`
}

func (SpanAggregationType) Enum() []any {
	return []any{
		SpanAggregationSpanCount,
		SpanAggregationExecutionTimePercentage,
		SpanAggregationDuration,
	}
}

func (s SpanAggregationType) isValid() bool {
	return slices.ContainsFunc(s.Enum(), func(v any) bool { return v == s })
}
