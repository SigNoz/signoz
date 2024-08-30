package common

import (
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"time"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func AdjustedMetricTimeRange(start, end, step int64, mq v3.BuilderQuery) (int64, int64) {
	// align the start to the step interval
	start = start - (start % (step * 1000))
	// if the query is a rate query, we adjust the start time by one more step
	// so that we can calculate the rate for the first data point
	hasRunningDiff := false
	for _, fn := range mq.Functions {
		if fn.Name == v3.FunctionNameRunningDiff {
			hasRunningDiff = true
			break
		}
	}
	if (mq.AggregateOperator.IsRateOperator() || mq.TimeAggregation.IsRateOperator()) &&
		mq.Temporality != v3.Delta {
		start -= step * 1000
	}
	if hasRunningDiff {
		start -= step * 1000
	}
	// align the end to the nearest minute
	adjustStep := int64(math.Min(float64(step), 60))
	end = end - (end % (adjustStep * 1000))
	return start, end
}

func PastDayRoundOff() int64 {
	now := time.Now().UnixMilli()
	return int64(math.Floor(float64(now)/float64(time.Hour.Milliseconds()*24))) * time.Hour.Milliseconds() * 24
}

// start and end are in milliseconds
func MinAllowedStepInterval(start, end int64) int64 {
	step := (end - start) / constants.MaxAllowedPointsInTimeSeries / 1000
	if step < 60 {
		return step
	}
	// return the nearest lower multiple of 60
	return step - step%60
}

func GCD(a, b int64) int64 {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}

func LCM(a, b int64) int64 {
	return (a * b) / GCD(a, b)
}

// LCMList computes the LCM of a list of int64 numbers.
func LCMList(nums []int64) int64 {
	if len(nums) == 0 {
		return 1
	}
	result := nums[0]
	for _, num := range nums[1:] {
		result = LCM(result, num)
	}
	return result
}

// TODO(srikanthccv): move the custom function in threshold_rule.go to here
func PrepareLinksToTraces(ts time.Time, filterItems []v3.FilterItem) string {

	start := ts.Add(-time.Minute * 15)
	end := ts.Add(time.Minute * 15)

	// Traces list view expects time in nanoseconds
	tr := v3.URLShareableTimeRange{
		Start:    start.UnixNano(),
		End:      end.UnixNano(),
		PageSize: 100,
	}

	options := v3.URLShareableOptions{
		MaxLines:      2,
		Format:        "list",
		SelectColumns: constants.TracesListViewDefaultSelectedColumns,
	}

	period, _ := json.Marshal(tr)
	urlEncodedTimeRange := url.QueryEscape(string(period))

	urlData := v3.URLShareableCompositeQuery{
		QueryType: string(v3.QueryTypeBuilder),
		Builder: v3.URLShareableBuilderQuery{
			QueryData: []v3.BuilderQuery{
				{
					DataSource:         v3.DataSourceTraces,
					QueryName:          "A",
					AggregateOperator:  v3.AggregateOperatorNoOp,
					AggregateAttribute: v3.AttributeKey{},
					Filters: &v3.FilterSet{
						Items:    filterItems,
						Operator: "AND",
					},
					Expression:   "A",
					Disabled:     false,
					Having:       []v3.Having{},
					StepInterval: 60,
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							Order:      "desc",
						},
					},
				},
			},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)
	compositeQuery := url.QueryEscape(url.QueryEscape(string(data)))

	optionsData, _ := json.Marshal(options)
	urlEncodedOptions := url.QueryEscape(string(optionsData))

	return fmt.Sprintf("compositeQuery=%s&timeRange=%s&startTime=%d&endTime=%d&options=%s", compositeQuery, urlEncodedTimeRange, tr.Start, tr.End, urlEncodedOptions)
}

func PrepareLinksToLogs(ts time.Time, filterItems []v3.FilterItem) string {
	start := ts.Add(-time.Minute * 15)
	end := ts.Add(time.Minute * 15)

	// Logs list view expects time in milliseconds
	// Logs list view expects time in milliseconds
	tr := v3.URLShareableTimeRange{
		Start:    start.UnixMilli(),
		End:      end.UnixMilli(),
		PageSize: 100,
	}

	options := v3.URLShareableOptions{
		MaxLines:      2,
		Format:        "list",
		SelectColumns: []v3.AttributeKey{},
	}

	period, _ := json.Marshal(tr)
	urlEncodedTimeRange := url.QueryEscape(string(period))

	urlData := v3.URLShareableCompositeQuery{
		QueryType: string(v3.QueryTypeBuilder),
		Builder: v3.URLShareableBuilderQuery{
			QueryData: []v3.BuilderQuery{
				{
					DataSource:         v3.DataSourceLogs,
					QueryName:          "A",
					AggregateOperator:  v3.AggregateOperatorNoOp,
					AggregateAttribute: v3.AttributeKey{},
					Filters: &v3.FilterSet{
						Items:    filterItems,
						Operator: "AND",
					},
					Expression:   "A",
					Disabled:     false,
					Having:       []v3.Having{},
					StepInterval: 60,
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							Order:      "desc",
						},
					},
				},
			},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)
	compositeQuery := url.QueryEscape(url.QueryEscape(string(data)))

	optionsData, _ := json.Marshal(options)
	urlEncodedOptions := url.QueryEscape(string(optionsData))

	return fmt.Sprintf("compositeQuery=%s&timeRange=%s&startTime=%d&endTime=%d&options=%s", compositeQuery, urlEncodedTimeRange, tr.Start, tr.End, urlEncodedOptions)
}

// The following function is used to prepare the where clause for the query
// `lbls` contains the key value pairs of the labels from the result of the query
// We iterate over the where clause and replace the labels with the actual values
// There are two cases:
// 1. The label is present in the where clause
// 2. The label is not present in the where clause
//
// Example for case 2:
// Latency by serviceName without any filter
// In this case, for each service with latency > threshold we send a notification
// The expectation will be that clicking on the related traces for service A, will
// take us to the traces page with the filter serviceName=A
// So for all the missing labels in the where clause, we add them as key = value
//
// Example for case 1:
// Severity text IN (WARN, ERROR)
// In this case, the Severity text will appear in the `lbls` if it were part of the group
// by clause, in which case we replace it with the actual value for the notification
// i.e Severity text = WARN
// If the Severity text is not part of the group by clause, then we add it as it is
func PrepareFilters(labels map[string]string, filters []v3.FilterItem) []v3.FilterItem {
	var filterItems []v3.FilterItem

	added := make(map[string]struct{})

	for _, item := range filters {
		exists := false
		for key, value := range labels {
			if item.Key.Key == key {
				// if the label is present in the where clause, replace it with key = value
				filterItems = append(filterItems, v3.FilterItem{
					Key:      item.Key,
					Operator: v3.FilterOperatorEqual,
					Value:    value,
				})
				exists = true
				added[key] = struct{}{}
				break
			}
		}

		if !exists {
			// if the label is not present in the where clause, add it as it is
			filterItems = append(filterItems, item)
		}
	}

	// add the labels which are not present in the where clause
	for key, value := range labels {
		if _, ok := added[key]; !ok {
			filterItems = append(filterItems, v3.FilterItem{
				Key:      v3.AttributeKey{Key: key},
				Operator: v3.FilterOperatorEqual,
				Value:    value,
			})
		}
	}

	return filterItems
}
