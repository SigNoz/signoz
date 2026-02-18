package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/valuer"

type RequestType struct {
	valuer.String
}

var (
	RequestTypeUnknown = RequestType{valuer.NewString("")}
	// Scalar result(s), example: number panel, and table panel
	RequestTypeScalar = RequestType{valuer.NewString("scalar")}
	// []Point (struct{TS int64; Val float64}), example: line/area/bar chart
	RequestTypeTimeSeries = RequestType{valuer.NewString("time_series")}
	// [][]any, SQL result set, but paginated, example: list view
	RequestTypeRaw = RequestType{valuer.NewString("raw")}
	// [][]any, SQL result set, but live, example: live list view
	RequestTypeRawStream = RequestType{valuer.NewString("raw_stream")}
	// [][]any, Specialized SQL result set, paginated
	RequestTypeTrace = RequestType{valuer.NewString("trace")}
	// []Bucket (struct{Lower,Upper,Count float64}), example: histogram
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
