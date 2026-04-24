package tracedetailtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const maxAggregationItems = 10

var ErrTooManyAggregationItems = errors.NewInvalidInputf(errors.CodeInvalidInput, "aggregations request exceeds maximum of %d items", maxAggregationItems)

// SpanAggregationType defines the aggregation to compute over spans grouped by a field.
type SpanAggregationType string

const (
	SpanAggregationSpanCount               SpanAggregationType = "spanCount"
	SpanAggregationExecutionTimePercentage SpanAggregationType = "executionTimePercentage"
	SpanAggregationDuration                SpanAggregationType = "duration"
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

func (s SpanAggregationType) Enum() []any {
	return []any{
		SpanAggregationSpanCount,
		SpanAggregationExecutionTimePercentage,
		SpanAggregationDuration,
	}
}

func (s SpanAggregationType) isValid() bool {
	for _, v := range s.Enum() {
		if v == s {
			return true
		}
	}
	return false
}
