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

type MetricQuery struct {
	MetricName        string     `json:"metricName"`
	TagFilters        *FilterSet `json:"tagFilters,omitempty"`
	GroupingTags      []string   `json:"groupBy,omitempty"`
	AggregateOperator string     `json:"aggregateOperator,omitempty"`
}

type CompositeMetricQuery struct {
	BuildMetricQueries []*MetricQuery `json:"buildMetricQueries"`
	Formulas           []string       `json:"formulas,omitempty"`
	RawQuery           string         `json:"rawQuery,omitempty"`
}

type QueryRangeParamsV2 struct {
	Start                int64                 `json:"start,omitempty"`
	End                  int64                 `json:"end,omitempty"`
	Step                 string                `json:"step,omitempty"`
	Query                string                `json:"query,omitempty"` // legacy
	Stats                string                `json:"stats,omitempty"` // legacy
	CompositeMetricQuery *CompositeMetricQuery `json:"compositeMetricQuery,omitempty"`
}

func (qp *QueryRangeParamsV2) BuildQuery(tableName string) ([]string, error) {

	if qp.CompositeMetricQuery.RawQuery != "" {
		return []string{qp.CompositeMetricQuery.RawQuery}, nil
	}

	var queries []string
	for _, mq := range qp.CompositeMetricQuery.BuildMetricQueries {

		nameFilterItem := FilterItem{Key: "__name__", Value: mq.MetricName, Operation: "EQ"}
		if mq.TagFilters == nil {
			mq.TagFilters = &FilterSet{Operation: "AND", Items: []FilterItem{
				nameFilterItem,
			}}
		} else {
			mq.TagFilters.Items = append(mq.TagFilters.Items, nameFilterItem)
		}

		tagsFilter, err := mq.TagFilters.BuildMetricsFilterQuery(tableName)
		if err != nil {
			return nil, err
		}
		timeSeriesTableTimeFilter := fmt.Sprintf("date >= fromUnixTimestamp64Milli(toInt64(%d)) AND date <= fromUnixTimestamp64Milli(toInt64(%d))", qp.Start, qp.End)

		timeSeriesTableFilterQuery := fmt.Sprintf("%s AND %s", tagsFilter, timeSeriesTableTimeFilter)

		filterSubQuery := fmt.Sprintf("SELECT fingerprint, labels FROM signoz_metrics.time_series WHERE %s", timeSeriesTableFilterQuery)

		samplesTableTimeFilter := fmt.Sprintf("timestamp_ms >= %d AND timestamp_ms < %d", qp.Start, qp.End)
		intermediateResult := `
		SELECT fingerprint, %s ts, runningDifference(value)/runningDifference(ts) as res FROM(
			SELECT fingerprint, %s toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %s) as ts, max(value) as value
			FROM signoz_metrics.samples
			INNER JOIN
			(
				%s
			) as filtered_time_series
			USING fingerprint
			WHERE %s
			GROUP BY %s
			ORDER BY fingerprint, ts
		)`
		groupByFilter := "fingerprint, ts"
		for _, tag := range mq.GroupingTags {
			groupByFilter += fmt.Sprintf(", JSONExtractString(labels,'%s') as %s", tag, tag)
		}
		groupTags := strings.Join(mq.GroupingTags, ",")
		if len(mq.GroupingTags) != 0 {
			groupTags += ","
		}
		switch mq.AggregateOperator {
		case "rate", "sum_rate":
			query := fmt.Sprintf(intermediateResult, groupTags, groupTags, qp.Step, filterSubQuery, samplesTableTimeFilter, groupByFilter)
			if mq.AggregateOperator == "sum_rate" {
				new_query := `
				SELECT ts, %s sum(res) as res
				FROM (%s)
				GROUP BY (ts, %s)
				ORDER BY ts
				`
				query = fmt.Sprintf(new_query, groupTags, query, groupTags)
			}
			queries = append(queries, query)
		default:
			return nil, fmt.Errorf("unsupported aggregator operator")
		}
	}
	return queries, nil
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

func (fs *FilterSet) BuildMetricsFilterQuery(tableName string) (string, error) {
	queryString := ""
	for idx, item := range fs.Items {
		fmtVal := formattedValue(item.Value)
		switch op := strings.ToLower(item.Operation); op {
		case "eq":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') = %s", tableName, item.Key, fmtVal)
		case "neq":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') != %s", tableName, item.Key, fmtVal)
		case "in":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') IN %s", tableName, item.Key, fmtVal)
		case "nin":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') NOT IN %s", tableName, item.Key, fmtVal)
		case "like":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') LIKE %s", tableName, item.Key, fmtVal)
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
