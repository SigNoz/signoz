package spantypes

import (
	"regexp"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var validAggregationFieldName = regexp.MustCompile(`^[a-zA-Z0-9._\-]+$`)

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
	Field       telemetrytypes.TelemetryFieldKey `json:"field" required:"true" nullable:"false"`
	Aggregation SpanAggregationType              `json:"aggregation" required:"true" nullable:"false"`
}

// SpanAggregationResult is the computed result for one aggregation request item.
// Duration values are in milliseconds.
type SpanAggregationResult struct {
	Field       telemetrytypes.TelemetryFieldKey `json:"field" required:"true" nullable:"false"`
	Aggregation SpanAggregationType              `json:"aggregation" required:"true" nullable:"false"`
	Value       map[string]uint64                `json:"value" required:"true" nullable:"true"`
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

// PostableTraceAggregations is the request body for the V4 aggregations endpoint.
type PostableTraceAggregations struct {
	Aggregations []SpanAggregation `json:"aggregations" required:"true" nullable:"false"`
}

func (p *PostableTraceAggregations) Validate() error {
	if len(p.Aggregations) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "aggregations is required and must not be empty")
	}
	if len(p.Aggregations) > maxAggregationItems {
		return ErrTooManyAggregationItems
	}
	for _, a := range p.Aggregations {
		if !a.Aggregation.isValid() {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown aggregation type: %q", a.Aggregation)
		}
		if a.Field.FieldContext != telemetrytypes.FieldContextResource {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "aggregation field context must be %q, got %q",
				telemetrytypes.FieldContextResource, a.Field.FieldContext)
		}
		if !validAggregationFieldName.MatchString(a.Field.Name) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid field name: %q", a.Field.Name)
		}
	}
	return nil
}

// GettableTraceAggregations is the response for the V4 aggregations endpoint.
type GettableTraceAggregations struct {
	Aggregations []SpanAggregationResult `json:"aggregations" required:"true" nullable:"false"`
}
