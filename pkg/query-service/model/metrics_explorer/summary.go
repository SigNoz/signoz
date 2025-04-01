package metrics_explorer

import (
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

type SummaryListMetricsRequest struct {
	Offset  int          `json:"offset"`
	Limit   int          `json:"limit"`
	OrderBy v3.OrderBy   `json:"orderBy"`
	Start   int64        `json:"start"`
	End     int64        `json:"end"`
	Filters v3.FilterSet `json:"filters"`
}

type TreeMapType string

const (
	TimeSeriesTeeMap TreeMapType = "timeseries"
	SamplesTreeMap   TreeMapType = "samples"
)

type TreeMapMetricsRequest struct {
	Limit   int          `json:"limit"`
	Treemap TreeMapType  `json:"treemap"`
	Start   int64        `json:"start"`
	End     int64        `json:"end"`
	Filters v3.FilterSet `json:"filters"`
}

type MetricDetail struct {
	MetricName   string `json:"metric_name"`
	Description  string `json:"description"`
	MetricType   string `json:"type"`
	MetricUnit   string `json:"unit"`
	TimeSeries   uint64 `json:"timeseries"`
	Samples      uint64 `json:"samples"`
	LastReceived int64  `json:"lastReceived"`
}

type TreeMapResponseItem struct {
	Percentage float64 `json:"percentage"`
	TotalValue uint64  `json:"total_value"`
	MetricName string  `json:"metric_name"`
}

type TreeMap struct {
	TimeSeries []TreeMapResponseItem `json:"timeseries"`
	Samples    []TreeMapResponseItem `json:"samples"`
}

type SummaryListMetricsResponse struct {
	Metrics []MetricDetail `json:"metrics"`
	Total   uint64         `json:"total"`
}

type Attribute struct {
	Key        string   `json:"key" db:"key"`
	Value      []string `json:"value" db:"value"`
	ValueCount uint64   `json:"valueCount" db:"valueCount"`
}

// Metadata holds additional information about the metric.
type Metadata struct {
	MetricType  string `json:"metric_type"`
	Description string `json:"description"`
	Unit        string `json:"unit"`
	Temporality string `json:"temporality"`
	Monotonic   bool   `json:"monotonic"`
}

// Alert represents individual alerts associated with the metric.
type Alert struct {
	AlertName string `json:"alert_name"`
	AlertID   string `json:"alert_id"`
}

// Dashboard represents individual dashboards associated with the metric.
type Dashboard struct {
	DashboardName string `json:"dashboard_name"`
	DashboardID   string `json:"dashboard_id"`
	WidgetID      string `json:"widget_id"`
	WidgetName    string `json:"widget_name"`
}

type MetricDetailsDTO struct {
	Name             string      `json:"name"`
	Description      string      `json:"description"`
	Type             string      `json:"type"`
	Unit             string      `json:"unit"`
	Samples          uint64      `json:"samples"`
	TimeSeriesTotal  uint64      `json:"timeSeriesTotal"`
	TimeSeriesActive uint64      `json:"timeSeriesActive"`
	LastReceived     int64       `json:"lastReceived"`
	Attributes       []Attribute `json:"attributes"`
	Metadata         Metadata    `json:"metadata"`
	Alerts           []Alert     `json:"alerts"`
	Dashboards       []Dashboard `json:"dashboards"`
}

type FilterKeyRequest struct {
	SearchText string `json:"searchText"`
	Limit      int    `json:"limit"`
}

type FilterValueRequest struct {
	FilterKey                  string                  `json:"filterKey"`
	FilterAttributeKeyDataType v3.AttributeKeyDataType `json:"filterAttributeKeyDataType"`
	SearchText                 string                  `json:"searchText"`
	Limit                      int                     `json:"limit"`
}

type FilterValueResponse struct {
	FilterValues []string `json:"filterValues"`
}

type FilterKeyResponse struct {
	MetricColumns []string          `json:"metricColumns"`
	AttributeKeys []v3.AttributeKey `json:"attributeKeys"`
}

var AvailableColumnFilterMap = map[string]bool{
	"metric_name": true,
	"metric_unit": true,
	"metric_type": true,
}

type RelatedMetricsScore struct {
	AttributeSimilarity float64
	NameSimilarity      float64
	Filters             [][]string
	MetricType          v3.MetricType
	Temporality         v3.Temporality
	IsMonotonic         bool
}

type RelatedMetricsRequest struct {
	CurrentMetricName string       `json:"currentMetricName"`
	Start             int64        `json:"start"`
	End               int64        `json:"end"`
	Filters           v3.FilterSet `json:"filters"`
}

type RelatedMetricsResponse struct {
	RelatedMetrics []RelatedMetrics `json:"related_metrics"`
}

type RelatedMetrics struct {
	Name       string           `json:"name"`
	Query      *v3.BuilderQuery `json:"query"`
	Dashboards []Dashboard      `json:"dashboards"`
	Alerts     []Alert          `json:"alerts"`
}

type InspectMetricsRequest struct {
	MetricName string       `json:"metricName"`
	Filters    v3.FilterSet `json:"filters"`
	Start      int64        `json:"start"`
	End        int64        `json:"end"`
}

type InspectMetricsResponse struct {
	Series *[]v3.Series `json:"series,omitempty"`
}

type UpdateMetricsMetadataRequest struct {
	MetricName  string         `json:"metricName"`
	MetricType  v3.MetricType  `json:"metricType"`
	Description string         `json:"description"`
	Unit        string         `json:"unit"`
	Temporality v3.Temporality `json:"temporality"`
	IsMonotonic bool           `json:"isMonotonic"`
}
