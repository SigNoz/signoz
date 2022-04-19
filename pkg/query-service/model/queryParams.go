package model

import (
	"fmt"
	"strings"
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

type Query struct {
	Datasource string `json:"datasource"`
	Format     string `json:"format"`
	Expr       string `json:"expr"`
}

type QueryRangeParamsV2 struct {
	Start    time.Time
	End      time.Time
	Step     time.Duration
	StartStr string  `json:"start"`
	EndStr   string  `json:"end"`
	StepStr  string  `json:"step"`
	Queries  []Query `json:"queries"`
}

func (params QueryRangeParamsV2) sanitizeAndValidate() (*QueryRangeParamsV2, error) {

	return nil, nil
}

type metricTags map[string]string

type MetricAutocompleteTagParams struct {
	MetricName string
	MetricTags metricTags
	Match      string
	TagKey     string
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

type FilterItem struct {
	Key       string      `json:"key"`
	Value     interface{} `json:"value"`
	Operation string      `json:"op"`
}

type FilterSet struct {
	Operation string       `json:"op,omitempty"`
	Items     []FilterItem `json:"items"`
}

func formattedValue(v interface{}) string {
	switch x := v.(type) {
	case int:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return fmt.Sprintf("'%s'", x)
	case bool:
		return fmt.Sprintf("%v", x)
	case []interface{}:
		switch x[0].(type) {
		case string:
			str := "["
			for idx, sVal := range x {
				str += fmt.Sprintf("'%s'", sVal)
				if idx != len(x)-1 {
					str += ","
				}
			}
			str += "]"
			return str
		case int, float32, float64, bool:
			return strings.Join(strings.Fields(fmt.Sprint(x)), ",")
		}
		return ""
	default:
		return ""
	}
}

func (fs *FilterSet) BuildMetricsFilterQuery() (string, error) {
	queryString := ""
	for idx, item := range fs.Items {
		fmtVal := formattedValue(item.Value)
		switch op := strings.ToLower(item.Operation); op {
		case "eq":
			queryString += fmt.Sprintf("JSONExtractString(labels,'%s') = %s", item.Key, fmtVal)
		case "neq":
			queryString += fmt.Sprintf("JSONExtractString(labels,'%s') != %s", item.Key, fmtVal)
		case "in":
			queryString += fmt.Sprintf("JSONExtractString(labels,'%s') IN %s", item.Key, fmtVal)
		case "nin":
			queryString += fmt.Sprintf("JSONExtractString(labels,'%s') NOT IN %s", item.Key, fmtVal)
		case "like":
			queryString += fmt.Sprintf("JSONExtractString(labels,'%s') LIKE %s", item.Key, fmtVal)
		default:
			return "", fmt.Errorf("unsupported operation")
		}
		if idx != len(fs.Items)-1 {
			queryString += " " + fs.Operation + " "
		}
	}
	return queryString, nil
}

func (fs *FilterSet) BuildTracesFilterQuery() (string, error) {
	// TODO
	return "", nil
}
