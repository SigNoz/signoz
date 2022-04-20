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

type MetricSpaceAggregation struct {
	GroupingTags []string `json:"groupingTags,omitempty"`
	Aggregator   string   `json:"aggregator,omitempty"`
}

type MetricTimeAggregation struct {
	Aggregator string `json:"aggregator,omitempty"`
	Interval   int    `json:"interval,omitempty"`
}

type MetricTagFilter struct {
	TagKey    string `json:"tagKey,omitempty"`
	Operation string `json:"operation,omitempty"`
	TagValue  string `json:"tagValue,omitempty"`
}

type MetricTagFilters struct {
	Left  *MetricTagFilters `json:"left,omitempty"`
	Right *MetricTagFilters `json:"right,omitempty"`
	MetricTagFilter
}

type MetricQuery struct {
	MetricName       string                  `json:"metricName"`
	TagFilters       *MetricTagFilters       `json:"tagFilters,omitempty"`
	SpaceAggregation *MetricSpaceAggregation `json:"spaceAggregation,omitempty"`
	TimeAggregation  *MetricTimeAggregation  `json:"timeAggregation,omitempty"`
}

type CompositeMetricQuery struct {
	BuildMetricQueries []*MetricQuery `json:"buildMetricQueries"`
	Formulas           []string       `json:"formulas,omitempty"`
	RawQuery           string         `json:"rawQuery,omitempty"`
}

func (m *MetricTagFilters) BuildQuery() (string, error) {
	if m.Left == nil && m.Right == nil {
		switch op := strings.ToLower(m.Operation); op {
		case "eq":
			return fmt.Sprintf("JSONExtractString(labels,'%s') = '%s'", m.TagKey, m.TagValue), nil
		case "neq":
			return fmt.Sprintf("JSONExtractString(labels,'%s') != '%s'", m.TagKey, m.TagValue), nil
		case "in":
			return fmt.Sprintf("JSONExtractString(labels,'%s') IN '%s'", m.TagKey, m.TagValue), nil
		case "nin":
			return fmt.Sprintf("JSONExtractString(labels,'%s') NOT IN '%s'", m.TagKey, m.TagValue), nil
		case "like":
			return fmt.Sprintf("JSONExtractString(labels,'%s') LIKE '%s'", m.TagKey, m.TagValue), nil
		default:
			return "", fmt.Errorf("unsupported operation")
		}
	}
	leftStatement, err := m.Left.BuildQuery()
	if err != nil {
		return "", err
	}
	rightStatement, err := m.Right.BuildQuery()
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("(%s) %s (%s)", leftStatement, m.Operation, rightStatement), nil
}

//select fingerprint, time_series.labels, time, runningDifference(max_value)/300 as rate from (
//	select fingerprint, toStartOfInterval(toDateTime(intDiv(samples_name.timestamp_ms, 1000)), INTERVAL 5 MINUTE) as time, max(value) as max_value from samples_name where metric_name='signoz_latency_count' and fingerprint in (
//		select fingerprint from time_series where JSONExtractString(labels,'service_name')='frontend'
//		) group by (fingerprint, time) order by (fingerprint, time)
//	) as new_samples INNER JOIN time_series using fingerprint;

// TIME QUERY

// SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 1 hour) as t, sum(value) as time_agg_value
// FROM samples
// INNER JOIN time_series using fingerprint
// WHERE JSONExtractString(labels, '__name__') = 'otelcol_receiver_accepted_metric_points'
// GROUP BY t, fingerprint
// ORDER BY t

// //
// SELECT * FROM(
// 	SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 1 hour) as t, sum(value) as time_agg_value
// 	FROM samples
// 	INNER JOIN time_series using fingerprint
// 	WHERE JSONExtractString(labels, '__name__') = 'otelcol_receiver_accepted_metric_points'
// 	GROUP BY t, fingerprint
// 	ORDER BY t) as new_table
// INNER JOIN time_series using fingerprint

// func (mq *MetricQuery) BuildQuery() (string, error) {
// 	filterSubQuery, err := mq.TagFilters.BuildQuery()
// 	if err != nil {
// 		return "", err
// 	}
// 	nameQuery := fmt.Sprintf("JSONExtractString(labels, '__name__') = '%s'", m.TagValue)

// 	timeQuery := fmt.Sprintf("toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %d MINUTE) as time, %s(value)", mq.TimeAggregation.Interval, mq.TimeAggregation.Aggregator)

// 	spaceQuerySubQuery := ""
// 	for _, groupTag := range mq.SpaceAggregation.GroupingTags {
// 		spaceQuerySubQuery += fmt.Sprintf("JSONExtractString(labels, '%s') as %s,", groupTag, groupTag)
// 	}
// 	spaceQuerySubQuery += fmt.Sprintf("%s(value)", mq.SpaceAggregation.Aggregator)

// 	return "", nil
// }

// func (c *CompositeMetricQuery) GetQuery() (string, error) {
// 	return "", nil
// 	if c.RawQuery != "" {
// 		return c.RawQuery, nil
// 	}
// 	var queries []string
// 	for _, metricQuery := range c.BuildMetricQueries {
// 		q, err := metricQuery.BuildQuery()
// 		if err != nil {
// 			return "", err
// 		}
// 		queries = append(queries, q)
// 	}
// }

type QueryRangeParamsV2 struct {
	Start                time.Time
	End                  time.Time
	Step                 time.Duration
	Query                string
	Stats                string
	CompositeMetricQuery *CompositeMetricQuery
}

func (params QueryRangeParamsV2) sanitizeAndValidate() (*QueryRangeParamsV2, error) {

	return nil, nil
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
