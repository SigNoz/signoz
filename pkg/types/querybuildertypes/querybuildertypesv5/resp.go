package querybuildertypesv5

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type QueryRangeResponse struct {
	Type RequestType `json:"type"`
	Data any         `json:"data"`
	Meta ExecStats   `json:"meta"`
}

type TimeSeriesData struct {
	QueryName    string              `json:"queryName"`
	Aggregations []AggregationBucket `json:"aggregations"`
}

type AggregationBucket struct {
	Index  int          `json:"index"` // or string Alias
	Alias  string       `json:"alias"`
	Series []TimeSeries `json:"series"` // no extra nesting
}

type TimeSeries struct {
	Labels []Label           `json:"labels,omitempty"`
	Values []TimeSeriesValue `json:"values"`
}

type Label struct {
	Key   telemetrytypes.TelemetryFieldKey `json:"key"`
	Value any                              `json:"value"`
}

type TimeSeriesValue struct {
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value,omitempty"`
	// for the heatmap type chart
	Values []float64 `json:"values,omitempty"`
	Bucket Bucket    `json:"bucket,omitempty"`
}

type Bucket struct {
	Step float64 `json:"step"`
}

type TableColumnType struct {
	valuer.String
}

var (
	// for the group by part of the query
	TableColumnTypeGroup = TableColumnType{valuer.NewString("group")}
	// for the aggregation part of the query
	TableColumnTypeAggregation = TableColumnType{valuer.NewString("aggregation")}
)

type TableColumn struct {
	telemetrytypes.TelemetryFieldKey
	AggregationIndex int64           `json:"aggregationIndex"`
	Type             TableColumnType `json:"columnType"`
}

type TableRow struct {
	Data      map[string]any `json:"data"`
	QueryName string         `json:"queryName"`
}

type TableData struct {
	Columns []TableColumn `json:"columns"`
	Rows    []TableRow    `json:"rows"`
}

type NumberData struct {
	QueryName string  `json:"queryName"`
	Value     float64 `json:"value"`
}

type ListData struct {
	QueryName string    `json:"queryName"`
	Rows      []ListRow `json:"rows"`
}

type ListRow struct {
	Timestamp time.Time      `json:"timestamp"`
	Data      map[string]any `json:"data"`
}
