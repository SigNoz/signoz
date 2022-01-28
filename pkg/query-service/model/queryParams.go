package model

import (
	"fmt"
	"time"
)

type User struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

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

type GetTopEndpointsParams struct {
	StartTime   string
	EndTime     string
	ServiceName string
	Start       *time.Time
	End         *time.Time
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
	StartTime string
	EndTime   string
	Period    int
	Start     *time.Time
	End       *time.Time
}

type GetServiceOverviewParams struct {
	StartTime   string
	EndTime     string
	Start       *time.Time
	End         *time.Time
	ServiceName string
	Period      string
	StepSeconds int
}

type ApplicationPercentileParams struct {
	ServiceName string
	GranOrigin  string
	GranPeriod  string
	Intervals   string
}

func (query *ApplicationPercentileParams) SetGranPeriod(step int) {
	minutes := step / 60
	query.GranPeriod = fmt.Sprintf("PT%dM", minutes)
}

type TagQuery struct {
	Key      string
	Value    string
	Operator string
}

type TagQueryV2 struct {
	Key      string
	Values   []string
	Operator string
}
type SpanSearchAggregatesParams struct {
	ServiceName       string
	OperationName     string
	Kind              string
	MinDuration       string
	MaxDuration       string
	Tags              []TagQuery
	Start             *time.Time
	End               *time.Time
	GranOrigin        string
	GranPeriod        string
	Intervals         string
	StepSeconds       int
	Dimension         string
	AggregationOption string
}

type SpanSearchParams struct {
	ServiceName   string
	OperationName string
	Kind          string
	Intervals     string
	Start         *time.Time
	End           *time.Time
	MinDuration   string
	MaxDuration   string
	Limit         int64
	Order         string
	Offset        int64
	BatchSize     int64
	Tags          []TagQuery
}

type GetFilteredSpansParams struct {
	ServiceName []string
	Operation   []string
	Kind        string
	Status      []string
	HttpRoute   []string
	HttpCode    []string
	HttpUrl     []string
	HttpHost    []string
	HttpMethod  []string
	Component   []string
	Start       *time.Time
	End         *time.Time
	MinDuration string
	MaxDuration string
	Limit       int64
	Order       string
	Offset      int64
	Tags        []TagQueryV2
	Exclude     []string
}

type GetFilteredSpanAggregatesParams struct {
	ServiceName       []string
	Operation         []string
	Kind              string
	Status            []string
	HttpRoute         []string
	HttpCode          []string
	HttpUrl           []string
	HttpHost          []string
	HttpMethod        []string
	Component         []string
	MinDuration       string
	MaxDuration       string
	Tags              []TagQueryV2
	Start             *time.Time
	End               *time.Time
	StepSeconds       int
	Dimension         string
	AggregationOption string
	GroupBy           string
	Function          string
	Exclude           []string
}

type SpanFilterParams struct {
	Status      []string
	ServiceName []string
	HttpRoute   []string
	HttpCode    []string
	HttpUrl     []string
	HttpHost    []string
	HttpMethod  []string
	Component   []string
	Operation   []string
	GetFilters  []string
	Exclude     []string
	MinDuration string
	MaxDuration string
	Start       *time.Time
	End         *time.Time
}

type TagFilterParams struct {
	Status      []string
	ServiceName []string
	HttpRoute   []string
	HttpCode    []string
	HttpUrl     []string
	HttpHost    []string
	HttpMethod  []string
	Component   []string
	Operation   []string
	Exclude     []string
	MinDuration string
	MaxDuration string
	Start       *time.Time
	End         *time.Time
}
type TTLParams struct {
	Type     string
	Duration string
}

type GetTTLParams struct {
	Type      string
	GetAllTTL bool
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
