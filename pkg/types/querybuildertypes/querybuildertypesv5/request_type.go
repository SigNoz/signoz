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
	// []Bucket (struct{Lower,Upper,Count float64}), example: histogram
	RequestTypeDistribution = RequestType{valuer.NewString("distribution")}
)
