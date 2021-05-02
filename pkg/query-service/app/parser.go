package app

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

var allowedDimesions = []string{"calls", "duration"}

var allowedAggregations = map[string][]string{
	"calls":    []string{"count", "rate_per_sec"},
	"duration": []string{"avg", "p50", "p90", "p99"},
}

func parseGetTopEndpointsRequest(r *http.Request) (*model.GetTopEndpointsParams, error) {
	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTime("end", r)
	if err != nil {
		return nil, err
	}

	serviceName := r.URL.Query().Get("service")
	if len(serviceName) == 0 {
		return nil, errors.New("serviceName param missing in query")
	}

	getTopEndpointsParams := model.GetTopEndpointsParams{
		StartTime:   startTime.Format(time.RFC3339Nano),
		EndTime:     endTime.Format(time.RFC3339Nano),
		ServiceName: serviceName,
	}

	return &getTopEndpointsParams, nil

}

func parseGetUsageRequest(r *http.Request) (*model.GetUsageParams, error) {
	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTime("end", r)
	if err != nil {
		return nil, err
	}

	stepStr := r.URL.Query().Get("step")
	if len(stepStr) == 0 {
		return nil, errors.New("step param missing in query")
	}
	stepInt, err := strconv.Atoi(stepStr)
	if err != nil {
		return nil, errors.New("step param is not in correct format")
	}

	serviceName := r.URL.Query().Get("service")

	getUsageParams := model.GetUsageParams{
		StartTime:   startTime.Format(time.RFC3339Nano),
		EndTime:     endTime.Format(time.RFC3339Nano),
		ServiceName: serviceName,
		Period:      fmt.Sprintf("PT%dH", stepInt/3600),
	}

	return &getUsageParams, nil

}

func parseGetServiceExternalRequest(r *http.Request) (*model.GetServiceOverviewParams, error) {
	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTime("end", r)
	if err != nil {
		return nil, err
	}

	stepStr := r.URL.Query().Get("step")
	if len(stepStr) == 0 {
		return nil, errors.New("step param missing in query")
	}
	stepInt, err := strconv.Atoi(stepStr)
	if err != nil {
		return nil, errors.New("step param is not in correct format")
	}

	serviceName := r.URL.Query().Get("service")
	if len(serviceName) == 0 {
		return nil, errors.New("serviceName param missing in query")
	}

	getServiceOverviewParams := model.GetServiceOverviewParams{
		StartTime:   startTime.Format(time.RFC3339Nano),
		EndTime:     endTime.Format(time.RFC3339Nano),
		ServiceName: serviceName,
		Period:      fmt.Sprintf("PT%dM", stepInt/60),
		StepSeconds: stepInt,
	}

	return &getServiceOverviewParams, nil

}

func parseGetServiceOverviewRequest(r *http.Request) (*model.GetServiceOverviewParams, error) {
	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTime("end", r)
	if err != nil {
		return nil, err
	}

	stepStr := r.URL.Query().Get("step")
	if len(stepStr) == 0 {
		return nil, errors.New("step param missing in query")
	}
	stepInt, err := strconv.Atoi(stepStr)
	if err != nil {
		return nil, errors.New("step param is not in correct format")
	}

	serviceName := r.URL.Query().Get("service")
	if len(serviceName) == 0 {
		return nil, errors.New("serviceName param missing in query")
	}

	getServiceOverviewParams := model.GetServiceOverviewParams{
		StartTime:   startTime.Format(time.RFC3339Nano),
		EndTime:     endTime.Format(time.RFC3339Nano),
		ServiceName: serviceName,
		Period:      fmt.Sprintf("PT%dM", stepInt/60),
		StepSeconds: stepInt,
	}

	return &getServiceOverviewParams, nil

}

func parseGetServicesRequest(r *http.Request) (*model.GetServicesParams, error) {

	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTime("end", r)
	if err != nil {
		return nil, err
	}

	getServicesParams := model.GetServicesParams{
		StartTime: startTime.Format(time.RFC3339Nano),
		EndTime:   endTime.Format(time.RFC3339Nano),
		Period:    int(endTime.Unix() - startTime.Unix()),
	}
	return &getServicesParams, nil

}

func DoesExistInSlice(item string, list []string) bool {
	for _, element := range list {
		if item == element {
			return true
		}
	}
	return false
}

func parseSearchSpanAggregatesRequest(r *http.Request) (*model.SpanSearchAggregatesParams, error) {

	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTime("end", r)
	if err != nil {
		return nil, err
	}

	startTimeStr := startTime.Format(time.RFC3339Nano)
	endTimeStr := endTime.Format(time.RFC3339Nano)
	// fmt.Println(startTimeStr)

	stepStr := r.URL.Query().Get("step")
	if len(stepStr) == 0 {
		return nil, errors.New("step param missing in query")
	}

	stepInt, err := strconv.Atoi(stepStr)
	if err != nil {
		return nil, errors.New("step param is not in correct format")
	}

	granPeriod := fmt.Sprintf("PT%dM", stepInt/60)
	dimension := r.URL.Query().Get("dimension")
	if len(dimension) == 0 {
		return nil, errors.New("dimension param missing in query")
	} else {
		if !DoesExistInSlice(dimension, allowedDimesions) {
			return nil, errors.New(fmt.Sprintf("given dimension: %s is not allowed in query", dimension))
		}
	}

	aggregationOption := r.URL.Query().Get("aggregation_option")
	if len(aggregationOption) == 0 {
		return nil, errors.New("Aggregation Option missing in query params")
	} else {
		if !DoesExistInSlice(aggregationOption, allowedAggregations[dimension]) {
			return nil, errors.New(fmt.Sprintf("given aggregation option: %s is not allowed with dimension: %s", aggregationOption, dimension))
		}
	}

	params := &model.SpanSearchAggregatesParams{
		Intervals:         fmt.Sprintf("%s/%s", startTimeStr, endTimeStr),
		GranOrigin:        startTimeStr,
		GranPeriod:        granPeriod,
		StepSeconds:       stepInt,
		Dimension:         dimension,
		AggregationOption: aggregationOption,
	}

	serviceName := r.URL.Query().Get("service")
	if len(serviceName) != 0 {
		// return nil, errors.New("serviceName param missing in query")
		params.ServiceName = serviceName
	}
	operationName := r.URL.Query().Get("operation")
	if len(operationName) != 0 {
		params.OperationName = operationName
		zap.S().Debug("Operation Name: ", operationName)
	}

	minDuration, err := parseTimestamp("minDuration", r)
	if err == nil {
		params.MinDuration = *minDuration
	}
	maxDuration, err := parseTimestamp("maxDuration", r)
	if err == nil {
		params.MaxDuration = *maxDuration
	}

	tags, err := parseTags("tags", r)
	if err != nil {
		return nil, err
	}
	if len(*tags) != 0 {
		params.Tags = *tags
	}

	return params, nil
}

func parseSpanSearchRequest(r *http.Request) (*model.SpanSearchParams, error) {

	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTimeMinusBuffer("end", r)
	if err != nil {
		return nil, err
	}

	startTimeStr := startTime.Format(time.RFC3339Nano)
	endTimeStr := endTime.Format(time.RFC3339Nano)
	// fmt.Println(startTimeStr)
	params := &model.SpanSearchParams{
		Intervals: fmt.Sprintf("%s/%s", startTimeStr, endTimeStr),
		Limit:     100,
		Order:     "descending",
	}

	serviceName := r.URL.Query().Get("service")
	if len(serviceName) != 0 {
		// return nil, errors.New("serviceName param missing in query")
		params.ServiceName = serviceName
	}
	operationName := r.URL.Query().Get("operation")
	if len(operationName) != 0 {
		params.OperationName = operationName
		zap.S().Debug("Operation Name: ", operationName)
	}

	minDuration, err := parseTimestamp("minDuration", r)
	if err == nil {
		params.MinDuration = *minDuration
	}
	maxDuration, err := parseTimestamp("maxDuration", r)
	if err == nil {
		params.MaxDuration = *maxDuration
	}

	limitStr := r.URL.Query().Get("limit")
	if len(limitStr) != 0 {
		limit, err := strconv.ParseInt(limitStr, 10, 64)
		if err != nil {
			return nil, errors.New("Limit param is not in correct format")
		}
		params.Limit = limit
	} else {
		params.Limit = 100
	}

	offsetStr := r.URL.Query().Get("offset")
	if len(offsetStr) != 0 {
		offset, err := strconv.ParseInt(offsetStr, 10, 64)
		if err != nil {
			return nil, errors.New("Offset param is not in correct format")
		}
		params.Offset = offset
	}

	tags, err := parseTags("tags", r)
	if err != nil {
		return nil, err
	}
	if len(*tags) != 0 {
		params.Tags = *tags
	}

	return params, nil
}

func parseTags(param string, r *http.Request) (*[]model.TagQuery, error) {

	tags := new([]model.TagQuery)
	tagsStr := r.URL.Query().Get(param)

	if len(tagsStr) == 0 {
		return tags, nil
	}
	err := json.Unmarshal([]byte(tagsStr), tags)
	if err != nil {
		zap.S().Error("Error in parsig tags", zap.Error(err))
		return nil, fmt.Errorf("error in parsing %s ", param)
	}
	// zap.S().Info("Tags: ", *tags)

	return tags, nil
}

func parseApplicationPercentileRequest(r *http.Request) (*model.ApplicationPercentileParams, error) {

	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTime("end", r)
	if err != nil {
		return nil, err
	}

	stepStr := r.URL.Query().Get("step")
	if len(stepStr) == 0 {
		return nil, errors.New("step param missing in query")
	}

	serviceName := r.URL.Query().Get("service")
	if len(serviceName) == 0 {
		return nil, errors.New("serviceName param missing in query")
	}

	startTimeStr := startTime.Format(time.RFC3339Nano)
	endTimeStr := endTime.Format(time.RFC3339Nano)

	params := &model.ApplicationPercentileParams{
		ServiceName: serviceName,
		GranOrigin:  startTimeStr,
		Intervals:   fmt.Sprintf("%s/%s", startTimeStr, endTimeStr),
	}

	stepInt, err := strconv.Atoi(stepStr)
	if err != nil {
		return nil, errors.New("step param is not in correct format")
	}

	params.SetGranPeriod(stepInt)

	return params, nil

}

func parseTime(param string, r *http.Request) (*time.Time, error) {

	timeStr := r.URL.Query().Get(param)
	if len(timeStr) == 0 {
		return nil, fmt.Errorf("%s param missing in query", param)
	}

	timeUnix, err := strconv.ParseInt(timeStr, 10, 64)
	if err != nil || len(timeStr) == 0 {
		return nil, fmt.Errorf("%s param is not in correct timestamp format", param)
	}

	timeFmt := time.Unix(0, timeUnix)

	return &timeFmt, nil

}

func parseTimeMinusBuffer(param string, r *http.Request) (*time.Time, error) {

	timeStr := r.URL.Query().Get(param)
	if len(timeStr) == 0 {
		return nil, fmt.Errorf("%s param missing in query", param)
	}

	timeUnix, err := strconv.ParseInt(timeStr, 10, 64)
	if err != nil || len(timeStr) == 0 {
		return nil, fmt.Errorf("%s param is not in correct timestamp format", param)
	}

	timeUnixNow := time.Now().UnixNano()
	if timeUnix > timeUnixNow-30000000000 {
		timeUnix = timeUnix - 30000000000
	}

	timeFmt := time.Unix(0, timeUnix)

	return &timeFmt, nil

}

func parseTimestamp(param string, r *http.Request) (*string, error) {
	timeStr := r.URL.Query().Get(param)
	if len(timeStr) == 0 {
		return nil, fmt.Errorf("%s param missing in query", param)
	}

	// timeUnix, err := strconv.ParseInt(timeStr, 10, 64)
	// if err != nil || len(timeStr) == 0 {
	// 	return nil, fmt.Errorf("%s param is not in correct timestamp format", param)
	// }

	return &timeStr, nil

}
