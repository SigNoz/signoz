package model

import (
	"fmt"
	"time"
)

type User struct {
	Name             string `json:"name"`
	Email            string `json:"email"`
	OrganizationName string `json:"organizationName"`
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
	ServiceName []string     `json:"serviceName"`
	Operation   []string     `json:"operation"`
	Kind        string       `json:"kind"`
	Status      []string     `json:"status"`
	HttpRoute   []string     `json:"httpRoute"`
	HttpCode    []string     `json:"httpCode"`
	HttpUrl     []string     `json:"httpUrl"`
	HttpHost    []string     `json:"httpHost"`
	HttpMethod  []string     `json:"httpMethod"`
	Component   []string     `json:"component"`
	StartStr    string       `json:"start"`
	EndStr      string       `json:"end"`
	MinDuration string       `json:"minDuration"`
	MaxDuration string       `json:"maxDuration"`
	Limit       int64        `json:"limit"`
	Order       string       `json:"order"`
	Offset      int64        `json:"offset"`
	Tags        []TagQueryV2 `json:"tags"`
	Exclude     []string     `json:"exclude"`
	Start       *time.Time
	End         *time.Time
}

type GetFilteredSpanAggregatesParams struct {
	ServiceName       []string     `json:"serviceName"`
	Operation         []string     `json:"operation"`
	Kind              string       `json:"kind"`
	Status            []string     `json:"status"`
	HttpRoute         []string     `json:"httpRoute"`
	HttpCode          []string     `json:"httpCode"`
	HttpUrl           []string     `json:"httpUrl"`
	HttpHost          []string     `json:"httpHost"`
	HttpMethod        []string     `json:"httpMethod"`
	Component         []string     `json:"component"`
	MinDuration       string       `json:"minDuration"`
	MaxDuration       string       `json:"maxDuration"`
	Tags              []TagQueryV2 `json:"tags"`
	StartStr          string       `json:"start"`
	EndStr            string       `json:"end"`
	StepSeconds       int          `json:"step"`
	Dimension         string       `json:"dimension"`
	AggregationOption string       `json:"aggregationOption"`
	GroupBy           string       `json:"groupBy"`
	Function          string       `json:"function"`
	Exclude           []string     `json:"exclude"`
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
