package metrics_explorer

import (
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

type SummaryListMetricsRequest struct {
	Offset    int              `json:"offset"`
	Limit     int              `json:"limit"`
	OrderBy   []v3.OrderBy     `json:"orderBy"`
	StartDate int64            `json:"startDate"`
	EndDate   int64            `json:"endDate"`
	Filters   SummaryFilterSet `json:"filters"`
}

type SummaryFilterItems struct {
	v3.FilterItem
	FilterTypeKey FilterTypeKey `json:"filterTypeKey"`
}

type SummaryFilterSet struct {
	v3.FilterSet
	Items []SummaryFilterItems `json:"items"`
}

type TreeMapType string

const (
	CardinalityTreeMap TreeMapType = "cardinality"
	DataPointsTreeMap  TreeMapType = "datapoints"
)

type TreeMapMetricsRequest struct {
	Limit     int              `json:"limit"`
	Treemap   TreeMapType      `json:"treemap"`
	StartDate int64            `json:"startDate"`
	EndDate   int64            `json:"endDate"`
	Filters   SummaryFilterSet `json:"filters"`
}

type MetricDetail struct {
	MetricName   string `json:"metric_name"`
	Description  string `json:"description"`
	Type         string `json:"type"`
	Unit         string `json:"unit"`
	Cardinality  uint64 `json:"cardinality"`
	DataPoints   uint64 `json:"dataPoints"`
	LastReceived int64  `json:"lastReceived"`
}

type TreeMapResponseItem struct {
	RelativePercentage float64 `json:"percentage"`
	TotalValue         uint64  `json:"total_value"`
	MetricName         string  `json:"metric_name"`
}

type TreeMap struct {
	Cardinality []TreeMapResponseItem `json:"cardinality"`
	DataPoints  []TreeMapResponseItem `json:"dataPoints"`
}

type SummaryListMetricsResponse struct {
	Metrics []MetricDetail `json:"metrics"`
	Total   uint64         `json:"total"`
}

type Attribute struct {
	Key          string   `json:"key" db:"key"`
	Value        []string `json:"value" db:"value"`
	Contribution float64  `json:"contribution" db:"contribution"`
}

// Metadata holds additional information about the metric.
type Metadata struct {
	MetricType  string `json:"metric_type"`
	Description string `json:"description"`
	Unit        string `json:"unit"`
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
	Cardinality      uint64      `json:"cardinality"`
	DataPoints       uint64      `json:"dataPoints"`
	TimeSeriesTotal  uint64      `json:"timeSeriesTotal"`
	TimeSeriesActive uint64      `json:"timeSeriesActive"`
	LastReceived     uint64      `json:"lastReceived"`
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

type FilterTypeKey string

const (
	FilterKeyMetricName FilterTypeKey = "metric_name"
	FilterKeyType       FilterTypeKey = "type"
	FilterKeyAttributes FilterTypeKey = "attributes"
	FilterKeyUnit       FilterTypeKey = "unit"
)

var AvailableColumnFilter = []string{
	string(FilterKeyMetricName),
	string(FilterKeyUnit),
}

var AvailableColumnFilterMap = map[string]bool{
	"metric_name": true,
	"unit":        true,
}
