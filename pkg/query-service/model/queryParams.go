package model

import (
	"time"
)

type InstantQueryMetricsParams struct {
	Time  time.Time
	Query string
	Stats string
}

type QueryRangeParams struct {
	Start time.Time
	End   time.Time
	Step  time.Duration
	Query string
	Stats string
}

type MetricQuery struct {
	QueryName         string            `json:"queryName"`
	MetricName        string            `json:"metricName"`
	TagFilters        *FilterSet        `json:"tagFilters,omitempty"`
	GroupingTags      []string          `json:"groupBy,omitempty"`
	AggregateOperator AggregateOperator `json:"aggregateOperator"`
	Expression        string            `json:"expression"`
	Disabled          bool              `json:"disabled"`
	ReduceTo          ReduceToOperator  `json:"reduceTo,omitempty"`
}

type ReduceToOperator int

const (
	_ ReduceToOperator = iota
	RLAST
	RSUM
	RAVG
	RMAX
	RMIN
)

type QueryType int

const (
	_ QueryType = iota
	QUERY_BUILDER
	CLICKHOUSE
	PROM
)

type PromQuery struct {
	Query    string `json:"query"`
	Stats    string `json:"stats,omitempty"`
	Disabled bool   `json:"disabled"`
}

type ClickHouseQuery struct {
	Query    string `json:"query"`
	Disabled bool   `json:"disabled"`
}

type PanelType int

const (
	_ PanelType = iota
	TIME_SERIES
	QUERY_VALUE
)

type CompositeMetricQuery struct {
	BuilderQueries    map[string]*MetricQuery     `json:"builderQueries,omitempty"`
	ClickHouseQueries map[string]*ClickHouseQuery `json:"chQueries,omitempty"`
	PromQueries       map[string]*PromQuery       `json:"promQueries,omitempty"`
	PanelType         PanelType                   `json:"panelType"`
	QueryType         QueryType                   `json:"queryType"`
}

type AggregateOperator int

const (
	_ AggregateOperator = iota
	NOOP
	COUNT
	COUNT_DISTINCT
	SUM
	AVG
	MAX
	MIN
	P05
	P10
	P20
	P25
	P50
	P75
	P90
	P95
	P99
	RATE
	SUM_RATE
	// leave blank space for possily {AVG, X}_RATE
	_
	_
	_
	RATE_SUM
	RATE_AVG
	RATE_MAX
	RATE_MIN
)

type DataSource int

const (
	_ DataSource = iota
	METRICS
	TRACES
	LOGS
)

type QueryRangeParamsV2 struct {
	DataSource           DataSource            `json:"dataSource"`
	Start                int64                 `json:"start"`
	End                  int64                 `json:"end"`
	Step                 int64                 `json:"step"`
	CompositeMetricQuery *CompositeMetricQuery `json:"compositeMetricQuery"`
}

// Metric auto complete types
type metricTags map[string]string

type MetricAutocompleteTagParams struct {
	MetricName string
	MetricTags metricTags
	Match      string
	TagKey     string
}

type GetTopEndpointsParams struct {
	StartTime   string `json:"start"`
	EndTime     string `json:"end"`
	ServiceName string `json:"service"`
	Start       *time.Time
	End         *time.Time
	Tags        []TagQuery `json:"tags"`
}

type GetUsageParams struct {
	StartTime   string
	EndTime     string
	ServiceName string
	Period      string
	StepHour    int
	Start       *time.Time
	End         *time.Time
}

type GetServicesParams struct {
	StartTime string `json:"start"`
	EndTime   string `json:"end"`
	Period    int
	Start     *time.Time
	End       *time.Time
	Tags      []TagQuery `json:"tags"`
}

type GetServiceOverviewParams struct {
	StartTime   string `json:"start"`
	EndTime     string `json:"end"`
	Period      string
	Start       *time.Time
	End         *time.Time
	Tags        []TagQuery `json:"tags"`
	ServiceName string     `json:"service"`
	StepSeconds int        `json:"step"`
}

type TagQuery struct {
	Key      string
	Values   []string
	Operator string
}

type GetFilteredSpansParams struct {
	ServiceName []string   `json:"serviceName"`
	Operation   []string   `json:"operation"`
	Kind        string     `json:"kind"`
	Status      []string   `json:"status"`
	HttpRoute   []string   `json:"httpRoute"`
	HttpCode    []string   `json:"httpCode"`
	HttpUrl     []string   `json:"httpUrl"`
	HttpHost    []string   `json:"httpHost"`
	HttpMethod  []string   `json:"httpMethod"`
	Component   []string   `json:"component"`
	StartStr    string     `json:"start"`
	EndStr      string     `json:"end"`
	MinDuration string     `json:"minDuration"`
	MaxDuration string     `json:"maxDuration"`
	Limit       int64      `json:"limit"`
	OrderParam  string     `json:"orderParam"`
	Order       string     `json:"order"`
	Offset      int64      `json:"offset"`
	Tags        []TagQuery `json:"tags"`
	Exclude     []string   `json:"exclude"`
	Start       *time.Time
	End         *time.Time
}

type GetFilteredSpanAggregatesParams struct {
	ServiceName       []string   `json:"serviceName"`
	Operation         []string   `json:"operation"`
	Kind              string     `json:"kind"`
	Status            []string   `json:"status"`
	HttpRoute         []string   `json:"httpRoute"`
	HttpCode          []string   `json:"httpCode"`
	HttpUrl           []string   `json:"httpUrl"`
	HttpHost          []string   `json:"httpHost"`
	HttpMethod        []string   `json:"httpMethod"`
	Component         []string   `json:"component"`
	MinDuration       string     `json:"minDuration"`
	MaxDuration       string     `json:"maxDuration"`
	Tags              []TagQuery `json:"tags"`
	StartStr          string     `json:"start"`
	EndStr            string     `json:"end"`
	StepSeconds       int        `json:"step"`
	Dimension         string     `json:"dimension"`
	AggregationOption string     `json:"aggregationOption"`
	GroupBy           string     `json:"groupBy"`
	Function          string     `json:"function"`
	Exclude           []string   `json:"exclude"`
	Start             *time.Time
	End               *time.Time
}

type SpanFilterParams struct {
	Status      []string `json:"status"`
	ServiceName []string `json:"serviceName"`
	HttpRoute   []string `json:"httpRoute"`
	HttpCode    []string `json:"httpCode"`
	HttpUrl     []string `json:"httpUrl"`
	HttpHost    []string `json:"httpHost"`
	HttpMethod  []string `json:"httpMethod"`
	Component   []string `json:"component"`
	Operation   []string `json:"operation"`
	GetFilters  []string `json:"getFilters"`
	Exclude     []string `json:"exclude"`
	MinDuration string   `json:"minDuration"`
	MaxDuration string   `json:"maxDuration"`
	StartStr    string   `json:"start"`
	EndStr      string   `json:"end"`
	Start       *time.Time
	End         *time.Time
}

type TagFilterParams struct {
	Status      []string `json:"status"`
	ServiceName []string `json:"serviceName"`
	HttpRoute   []string `json:"httpRoute"`
	HttpCode    []string `json:"httpCode"`
	HttpUrl     []string `json:"httpUrl"`
	HttpHost    []string `json:"httpHost"`
	HttpMethod  []string `json:"httpMethod"`
	Component   []string `json:"component"`
	Operation   []string `json:"operation"`
	Exclude     []string `json:"exclude"`
	MinDuration string   `json:"minDuration"`
	MaxDuration string   `json:"maxDuration"`
	StartStr    string   `json:"start"`
	EndStr      string   `json:"end"`
	TagKey      string   `json:"tagKey"`
	Start       *time.Time
	End         *time.Time
}

type TTLParams struct {
	Type                  string // It can be one of {traces, metrics}.
	ColdStorageVolume     string // Name of the cold storage volume.
	ToColdStorageDuration int64  // Seconds after which data will be moved to cold storage.
	DelDuration           int64  // Seconds after which data will be deleted.
}

type GetTTLParams struct {
	Type string
}

type GetErrorsParams struct {
	Start *time.Time
	End   *time.Time
}

type GetErrorParams struct {
	ErrorType   string
	ErrorID     string
	ServiceName string
}

type FilterItem struct {
	Key       string      `json:"key"`
	Value     interface{} `json:"value"`
	Operation string      `json:"op"`
}

type FilterSet struct {
	Operation string       `json:"op,omitempty"`
	Items     []FilterItem `json:"items"`
}

type RemoveTTLParams struct {
	Type         string
	RemoveAllTTL bool
}
