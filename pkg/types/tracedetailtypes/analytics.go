package tracedetailtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const maxAnalyticsItems = 10

// SpanAggregationType defines the aggregation to compute over spans grouped by a field.
type SpanAggregationType string

const (
	SpanAggregationSpanCount               SpanAggregationType = "spanCount"
	SpanAggregationExecutionTimePercentage SpanAggregationType = "executionTimePercentage"
	SpanAggregationDuration                SpanAggregationType = "duration"
)

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

// SpanAggregation is a single analytics request item: which field to group by and how.
type SpanAggregation struct {
	Field       telemetrytypes.TelemetryFieldKey `json:"field"`
	Aggregation SpanAggregationType              `json:"aggregation"`
}

// SpanAggregationResult is the computed result for one analytics request item.
// Duration-type values (duration, executionTimePercentage) are in milliseconds.
type SpanAggregationResult struct {
	Field       telemetrytypes.TelemetryFieldKey `json:"field"`
	Aggregation SpanAggregationType              `json:"aggregation"`
	Value       map[string]uint64                `json:"value" nullable:"true"`
}

// ErrTooManyAnalyticsItems is returned when the analytics slice exceeds maxAnalyticsItems.
var ErrTooManyAnalyticsItems = errors.NewInvalidInputf(errors.CodeInvalidInput, "analytics request exceeds maximum of %d items", maxAnalyticsItems)
