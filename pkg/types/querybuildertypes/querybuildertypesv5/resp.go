package querybuildertypesv5

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type QueryRangeResponse struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

type TimeSeriesData struct {
	QueryName  string          `json:"queryName"`
	TimeSeries [][]*TimeSeries `json:"timeSeries"`
}

type Label struct {
	Key   telemetrytypes.TelemetryFieldKey `json:"key"`
	Value any                              `json:"value"`
}

type TimeSeries struct {
	AggregationIndex int64              `json:"aggregationIndex"`
	Labels           []*Label           `json:"labels,omitempty"`
	Values           []*TimeSeriesValue `json:"values"`
}

type TimeSeriesValue struct {
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value"`
}

type TableColumnType struct {
	valuer.String
}

var (
	TableColumnTypeGroup       = TableColumnType{valuer.NewString("group")}
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
	Columns []*TableColumn `json:"columns"`
	Rows    []*TableRow    `json:"rows"`
}

type NumberData struct {
	QueryName string  `json:"queryName"`
	Value     float64 `json:"value"`
}

type ListData struct {
	QueryName string     `json:"queryName"`
	Rows      []*ListRow `json:"rows"`
}

type ListRow struct {
	Timestamp time.Time      `json:"timestamp"`
	Data      map[string]any `json:"data"`
}
