package model

import "fmt"

type GetTopEndpointsParams struct {
	StartTime   string
	EndTime     string
	ServiceName string
}

type GetUsageParams struct {
	StartTime   string
	EndTime     string
	ServiceName string
	Period      string
}

type GetServicesParams struct {
	StartTime string
	EndTime   string
	Period    int
}

type GetServiceOverviewParams struct {
	StartTime   string
	EndTime     string
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

type SpanSearchAggregatesParams struct {
	ServiceName       string
	OperationName     string
	MinDuration       string
	MaxDuration       string
	Tags              []TagQuery
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
	Intervals     string
	MinDuration   string
	MaxDuration   string
	Limit         int64
	Order         string
	Offset        int64
	BatchSize     int64
	Tags          []TagQuery
}
