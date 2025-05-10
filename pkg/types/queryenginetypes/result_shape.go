package queryenginetypes

import "github.com/SigNoz/signoz/pkg/valuer"

type ResultShape struct {
	valuer.String
}

var (
	ShapeUnknown = ResultShape{valuer.NewString("")}
	// Scalar result, number/string/boolean, example: number panel
	ShapeScalar = ResultShape{valuer.NewString("scalar")}
	// []Point (struct{TS int64; Val float64}), example: line chart
	ShapeSeries = ResultShape{valuer.NewString("series")}
	// [][]any, SQL result set, example: table
	ShapeTable = ResultShape{valuer.NewString("table")}
	// [][]any, SQL result set, but paginated, example: list view
	ShapeEvents = ResultShape{valuer.NewString("events")}
	// [][]float64 + axis meta, example: heatmap
	ShapeMatrix = ResultShape{valuer.NewString("matrix")}
	// []Bucket (struct{Lower,Upper,Count float64}), example: histogram
	ShapeDistribution = ResultShape{valuer.NewString("distribution")}
)
