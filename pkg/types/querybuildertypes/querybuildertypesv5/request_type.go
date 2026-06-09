package querybuildertypesv5

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type RequestType struct {
	valuer.String
}

// UnmarshalJSON rejects values that are not a known request type.
func (r *RequestType) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid request type: must be a string")
	}
	v := RequestType{valuer.NewString(s)}
	switch v {
	case RequestTypeScalar, RequestTypeTimeSeries, RequestTypeRaw, RequestTypeRawStream, RequestTypeTrace, RequestTypeDistribution:
		*r = v
		return nil
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown request type %q; allowed values: %s", s, "`scalar`, `time_series`, `raw`, `raw_stream`, `trace`, `distribution`")
	}
}

var (
	RequestTypeUnknown = RequestType{valuer.NewString("")}
	// Scalar result(s), example: number panel, and table panel.
	RequestTypeScalar = RequestType{valuer.NewString("scalar")}
	// []Point (struct{TS int64; Val float64}), example: line/area/bar chart.
	RequestTypeTimeSeries = RequestType{valuer.NewString("time_series")}
	// [][]any, SQL result set, but paginated, example: list view.
	RequestTypeRaw = RequestType{valuer.NewString("raw")}
	// [][]any, SQL result set, but live, example: live list view.
	RequestTypeRawStream = RequestType{valuer.NewString("raw_stream")}
	// [][]any, Specialized SQL result set, paginated.
	RequestTypeTrace = RequestType{valuer.NewString("trace")}
	// []Bucket (struct{Lower,Upper,Count float64}), example: histogram.
	RequestTypeDistribution = RequestType{valuer.NewString("distribution")}
)

// IsAggregation returns true for request types that produce aggregated results
// (time_series, scalar, distribution). For these types, fields like groupBy,
// having, aggregations, and orderBy (with aggregation key validation) are meaningful.
// For non-aggregation types (raw, raw_stream, trace), those fields are ignored
// and don't need to be validated.
func (r RequestType) IsAggregation() bool {
	return r == RequestTypeTimeSeries || r == RequestTypeScalar || r == RequestTypeDistribution
}

// Enum implements jsonschema.Enum; returns the acceptable values for RequestType.
func (RequestType) Enum() []any {
	return []any{
		RequestTypeScalar,
		RequestTypeTimeSeries,
		RequestTypeRaw,
		RequestTypeRawStream,
		RequestTypeTrace,
		// RequestTypeDistribution,
	}
}
