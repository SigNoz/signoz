package druidQuery

import (
	"encoding/json"
	"fmt"
	"time"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/godruid"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

type DurationItem struct {
	Value       float32 `json:"value"`
	QuantileAgg int     `json:"quantile_agg"`
}

type SpanSearchAggregatesDuratonReceivedItem struct {
	Timestamp string       `json:"timestamp"`
	Result    DurationItem `json:"result"`
}

func buildFilters(queryParams *model.SpanSearchParams) (*godruid.Filter, error) {

	var filter *godruid.Filter

	if len(queryParams.ServiceName) != 0 {
		filter = godruid.FilterSelector("ServiceName", queryParams.ServiceName)
	}

	if len(queryParams.OperationName) != 0 {

		newFilter := godruid.FilterSelector("Name", queryParams.OperationName)
		filter = godruid.FilterAnd(filter, newFilter)

	}
	if len(queryParams.Kind) != 0 {

		newFilter := godruid.FilterSelector("Kind", queryParams.Kind)
		filter = godruid.FilterAnd(filter, newFilter)

	}

	// zap.S().Debug("MinDuration: ", queryParams.MinDuration)
	var lower string
	var upper string

	if len(queryParams.MinDuration) != 0 {
		lower = queryParams.MinDuration
	}
	if len(queryParams.MaxDuration) != 0 {
		upper = queryParams.MaxDuration
	}

	if len(lower) != 0 || len(upper) != 0 {

		newFilter := godruid.FilterBound("DurationNano", lower, upper, false, false, "numeric")
		filter = godruid.FilterAnd(filter, newFilter)

	}

	for _, item := range queryParams.Tags {

		var newFilter *godruid.Filter

		if item.Operator == "equals" {
			newFilter = godruid.FilterSelector("Tags", fmt.Sprintf("%s:%s", item.Key, item.Value))
		} else if item.Operator == "contains" {
			valuesFilter := godruid.FilterSearch("TagsValues", fmt.Sprintf("%s", item.Value))
			keysFilter := godruid.FilterSelector("TagsKeys", fmt.Sprintf("%s", item.Key))
			newFilter = godruid.FilterAnd(valuesFilter, keysFilter)
		} else if item.Operator == "isnotnull" {
			newFilter = godruid.FilterSelector("TagsKeys", fmt.Sprintf("%s", item.Key))
		} else {
			return nil, fmt.Errorf("Tag Operator %s not supported", item.Operator)
		}

		if item.Key == "error" && item.Value == "true" {
			statusCodeFilter := godruid.FilterBound("StatusCode", "500", "600", false, true, "numeric")
			filterError := godruid.FilterOr(statusCodeFilter, newFilter)
			filter = godruid.FilterAnd(filter, filterError)
			continue
		}

		filter = godruid.FilterAnd(filter, newFilter)

	}

	// if filter == nil {
	// 	return nil, fmt.Errorf("No search criteria for spans was specified")
	// }
	return filter, nil

}

func buildFiltersForSpansAggregates(queryParams *model.SpanSearchAggregatesParams) (*godruid.Filter, error) {

	var filter *godruid.Filter

	if len(queryParams.ServiceName) != 0 {
		filter = godruid.FilterSelector("ServiceName", queryParams.ServiceName)
	}

	if len(queryParams.OperationName) != 0 {

		newFilter := godruid.FilterSelector("Name", queryParams.OperationName)
		filter = godruid.FilterAnd(filter, newFilter)

	}
	if len(queryParams.Kind) != 0 {

		newFilter := godruid.FilterSelector("Kind", queryParams.Kind)
		filter = godruid.FilterAnd(filter, newFilter)

	}

	// zap.S().Debug("MinDuration: ", queryParams.MinDuration)
	var lower string
	var upper string

	if len(queryParams.MinDuration) != 0 {
		lower = queryParams.MinDuration
	}
	if len(queryParams.MaxDuration) != 0 {
		upper = queryParams.MaxDuration
	}

	if len(lower) != 0 || len(upper) != 0 {

		newFilter := godruid.FilterBound("DurationNano", lower, upper, false, false, "numeric")
		filter = godruid.FilterAnd(filter, newFilter)

	}

	for _, item := range queryParams.Tags {

		var newFilter *godruid.Filter

		if item.Operator == "equals" {
			newFilter = godruid.FilterSelector("Tags", fmt.Sprintf("%s:%s", item.Key, item.Value))
		} else if item.Operator == "contains" {
			valuesFilter := godruid.FilterSearch("TagsValues", fmt.Sprintf("%s", item.Value))
			keysFilter := godruid.FilterSelector("TagsKeys", fmt.Sprintf("%s", item.Key))
			newFilter = godruid.FilterAnd(valuesFilter, keysFilter)
		} else if item.Operator == "isnotnull" {
			newFilter = godruid.FilterSelector("TagsKeys", fmt.Sprintf("%s", item.Key))
		} else {
			return nil, fmt.Errorf("Tag Operator %s not supported", item.Operator)
		}

		if item.Key == "error" && item.Value == "true" {
			statusCodeFilter := godruid.FilterBound("StatusCode", "500", "600", false, true, "numeric")
			filterError := godruid.FilterOr(statusCodeFilter, newFilter)
			filter = godruid.FilterAnd(filter, filterError)
			continue
		}

		filter = godruid.FilterAnd(filter, newFilter)

	}

	// newFilter := godruid.FilterSelector("Kind", "2")
	// filter = godruid.FilterAnd(filter, newFilter)

	// if filter == nil {
	// 	return nil, fmt.Errorf("No search criteria for spans was specified")
	// }
	return filter, nil

}

func SearchTraces(client *godruid.Client, traceId string) (*[]model.SearchSpansResult, error) {

	filter := godruid.FilterSelector("TraceId", traceId)

	query := &godruid.QueryScan{
		DataSource: constants.DruidDatasource,
		Intervals:  []string{"-146136543-09-08T08:23:32.096Z/146140482-04-24T15:36:27.903Z"},
		Filter:     filter,
		Columns:    []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References"},
		Order:      "none",
		BatchSize:  20480,
	}

	clientErr := client.Query(query)
	// fmt.Println("requst", client.LastRequest)
	if clientErr != nil {
		// fmt.Println("Error: ", err)
		zap.S().Error(zap.Error(clientErr))
		return nil, clientErr
	}

	// fmt.Println("response", client.LastResponse)

	// fmt.Printf("query.QueryResult:\n%v", query.QueryResult)

	var searchSpansResult []model.SearchSpansResult
	searchSpansResult = make([]model.SearchSpansResult, len(query.QueryResult))

	searchSpansResult[0].Columns = make([]string, len(query.QueryResult[0].Columns))
	copy(searchSpansResult[0].Columns, query.QueryResult[0].Columns)

	searchSpansResult[0].Events = make([][]interface{}, len(query.QueryResult[0].Events))
	copy(searchSpansResult[0].Events, query.QueryResult[0].Events)

	return &searchSpansResult, nil

}

func SearchSpansAggregate(client *godruid.Client, queryParams *model.SpanSearchAggregatesParams) ([]model.SpanSearchAggregatesResponseItem, error) {

	filter, err := buildFiltersForSpansAggregates(queryParams)
	var needsPostAggregation bool = true

	if err != nil {
		return nil, err
	}

	granularity := godruid.GranPeriod{
		Type:   "period",
		Period: queryParams.GranPeriod,
		// Origin: queryParams.GranOrigin,
	}

	var aggregation godruid.Aggregation
	var postAggregation godruid.PostAggregation

	if queryParams.Dimension == "duration" {
		switch queryParams.AggregationOption {
		case "p50":
			aggregationString := `{ "type": "quantilesDoublesSketch", "fieldName": "QuantileDuration", "name": "quantile_agg", "k": 128}`
			aggregation = godruid.AggRawJson(aggregationString)
			postAggregationString := `{"type":"quantilesDoublesSketchToQuantile","name":"value","field":{"type":"fieldAccess","fieldName":"quantile_agg"},"fraction":0.5}`
			postAggregation = godruid.PostAggRawJson(postAggregationString)
			break
		case "p90":
			aggregationString := `{ "type": "quantilesDoublesSketch", "fieldName": "QuantileDuration", "name": "quantile_agg", "k": 128}`
			aggregation = godruid.AggRawJson(aggregationString)
			postAggregationString := `{"type":"quantilesDoublesSketchToQuantile","name":"value","field":{"type":"fieldAccess","fieldName":"quantile_agg"},"fraction":0.9}`
			postAggregation = godruid.PostAggRawJson(postAggregationString)
			break

		case "p99":
			aggregationString := `{ "type": "quantilesDoublesSketch", "fieldName": "QuantileDuration", "name": "quantile_agg", "k": 128}`
			aggregation = godruid.AggRawJson(aggregationString)
			postAggregationString := `{"type":"quantilesDoublesSketchToQuantile","name":"value","field":{"type":"fieldAccess","fieldName":"quantile_agg"},"fraction":0.99}`
			postAggregation = godruid.PostAggRawJson(postAggregationString)
			break
		}

	} else if queryParams.Dimension == "calls" {

		aggregation = godruid.AggCount("value")
		needsPostAggregation = false
	}
	var query *godruid.QueryTimeseries
	if needsPostAggregation {
		query = &godruid.QueryTimeseries{
			DataSource:       constants.DruidDatasource,
			Intervals:        []string{queryParams.Intervals},
			Granularity:      granularity,
			Filter:           filter,
			Aggregations:     []godruid.Aggregation{aggregation},
			PostAggregations: []godruid.PostAggregation{postAggregation},
		}
	} else {
		query = &godruid.QueryTimeseries{
			DataSource:   constants.DruidDatasource,
			Intervals:    []string{queryParams.Intervals},
			Granularity:  granularity,
			Filter:       filter,
			Aggregations: []godruid.Aggregation{aggregation},
			// PostAggregations: []godruid.PostAggregation{postAggregation},
		}
	}

	clientErr := client.Query(query)
	// fmt.Println("requst", client.LastRequest)
	if clientErr != nil {
		// fmt.Println("Error: ", err)
		zap.S().Error(zap.Error(clientErr))
		return nil, clientErr
	}

	// fmt.Println("response", client.LastResponse)

	receivedResponse := new([]SpanSearchAggregatesDuratonReceivedItem)
	err = json.Unmarshal([]byte(client.LastResponse), receivedResponse)
	if err != nil && len(*receivedResponse) == 0 {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	var response []model.SpanSearchAggregatesResponseItem

	for _, elem := range *receivedResponse {

		value := elem.Result.Value
		timeObj, _ := time.Parse(time.RFC3339Nano, elem.Timestamp)
		timestamp := timeObj.UnixNano()

		if queryParams.AggregationOption == "rate_per_sec" {
			value = elem.Result.Value * 1.0 / float32(queryParams.StepSeconds)
		}
		response = append(response, model.SpanSearchAggregatesResponseItem{
			Timestamp: timestamp,
			Value:     value,
		})
	}
	return response, nil

	// fmt.Printf("query.QueryResult:\n%v", query.QueryResult)

	return nil, nil
}

func SearchSpans(client *godruid.Client, queryParams *model.SpanSearchParams) (*[]model.SearchSpansResult, error) {

	filter, err := buildFilters(queryParams)

	if err != nil {
		return nil, err
	}

	query := &godruid.QueryScan{
		DataSource: constants.DruidDatasource,
		Intervals:  []string{queryParams.Intervals},
		Filter:     filter,
		Columns:    []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues"},
		Limit:      queryParams.Limit,
		Offset:     queryParams.Offset,
		Order:      "descending",
		BatchSize:  20480,
	}

	clientErr := client.Query(query)
	// fmt.Println("requst", client.LastRequest)
	if clientErr != nil {
		// fmt.Println("Error: ", err)
		zap.S().Error(zap.Error(clientErr))
		return nil, clientErr
	}

	// fmt.Println("response", client.LastResponse)

	// fmt.Printf("query.QueryResult:\n%v", query.QueryResult)

	var searchSpansResult []model.SearchSpansResult
	searchSpansResult = make([]model.SearchSpansResult, len(query.QueryResult))

	searchSpansResult[0].Columns = make([]string, len(query.QueryResult[0].Columns))
	copy(searchSpansResult[0].Columns, query.QueryResult[0].Columns)

	searchSpansResult[0].Events = make([][]interface{}, len(query.QueryResult[0].Events))
	copy(searchSpansResult[0].Events, query.QueryResult[0].Events)

	return &searchSpansResult, nil
}

func GetApplicationPercentiles(client *godruid.Client, queryParams *model.ApplicationPercentileParams) ([]godruid.Timeseries, error) {

	// query := &godruid.QueryGroupBy{
	// 	DataSource:   constants.DruidDatasource,
	// 	Intervals:    []string{"2020-12-11T05:23:00.000Z/2020-12-11T05:24:00.000Z"},
	// 	Granularity:  godruid.GranMinute,
	// 	Filter:       godruid.FilterSelector("Kind", "2"),
	// 	Dimensions:   []godruid.DimSpec{"ServiceName"},
	// 	Aggregations: []godruid.Aggregation{godruid.AggRawJson(`{ "type" : "count", "name" : "count" }`)},
	// }

	granularity := godruid.GranPeriod{
		Type:   "period",
		Period: queryParams.GranPeriod,
		Origin: queryParams.GranOrigin,
	}

	filterKind := godruid.FilterSelector("Kind", "2")
	filterService := godruid.FilterSelector("ServiceName", queryParams.ServiceName)
	filter := godruid.FilterAnd(filterKind, filterService)

	aggregationString := `{ "type": "quantilesDoublesSketch", "fieldName": "QuantileDuration", "name": "quantile_agg", "k": 128}`
	aggregation := godruid.AggRawJson(aggregationString)

	postAggregationString := `{"type":"quantilesDoublesSketchToQuantiles","name":"final_quantile","field":{"type":"fieldAccess","fieldName":"quantile_agg"},"fractions":[0.5,0.99]}`
	postAggregation := godruid.PostAggRawJson(postAggregationString)

	query := &godruid.QueryTimeseries{
		DataSource:       constants.DruidDatasource,
		Intervals:        []string{queryParams.Intervals},
		Granularity:      granularity,
		Filter:           filter,
		Aggregations:     []godruid.Aggregation{aggregation},
		PostAggregations: []godruid.PostAggregation{postAggregation},
	}

	err := client.Query(query)
	// fmt.Println("requst", client.LastRequest)
	if err != nil {
		// fmt.Println("Error: ", err)
		zap.S().Error(zap.Error(err))
		return nil, err
	}

	// fmt.Println("response", client.LastResponse)

	// fmt.Printf("query.QueryResult:\n%v", query.QueryResult)

	return query.QueryResult, nil

}
