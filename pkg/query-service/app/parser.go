package app

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	promModel "github.com/prometheus/common/model"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

var allowedDimesions = []string{"calls", "duration"}

var allowedFunctions = []string{"count", "ratePerSec", "sum", "avg", "min", "max", "p50", "p90", "p95", "p99"}

var allowedAggregations = map[string][]string{
	"calls":    {"count", "rate_per_sec"},
	"duration": {"avg", "p50", "p95", "p90", "p99", "min", "max", "sum"},
}

func parseUser(r *http.Request) (*model.User, error) {

	var user model.User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		return nil, err
	}
	if len(user.Email) == 0 {
		return nil, fmt.Errorf("email field not found")
	}

	return &user, nil
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
		Start:       startTime,
		End:         endTime,
	}

	return &getTopEndpointsParams, nil

}

func parseMetricsTime(s string) (time.Time, error) {
	if t, err := strconv.ParseFloat(s, 64); err == nil {
		s, ns := math.Modf(t)
		return time.Unix(int64(s), int64(ns*float64(time.Second))), nil
		// return time.Unix(0, t), nil
	}
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("cannot parse %q to a valid timestamp", s)
}

func parseMetricsDuration(s string) (time.Duration, error) {
	if d, err := strconv.ParseFloat(s, 64); err == nil {
		ts := d * float64(time.Second)
		if ts > float64(math.MaxInt64) || ts < float64(math.MinInt64) {
			return 0, fmt.Errorf("cannot parse %q to a valid duration. It overflows int64", s)
		}
		return time.Duration(ts), nil
	}
	if d, err := promModel.ParseDuration(s); err == nil {
		return time.Duration(d), nil
	}
	return 0, fmt.Errorf("cannot parse %q to a valid duration", s)
}

func parseInstantQueryMetricsRequest(r *http.Request) (*model.InstantQueryMetricsParams, *model.ApiError) {
	var ts time.Time
	if t := r.FormValue("time"); t != "" {
		var err error
		ts, err = parseMetricsTime(t)
		if err != nil {
			return nil, &model.ApiError{model.ErrorBadData, err}
		}
	} else {
		ts = time.Now()
	}

	return &model.InstantQueryMetricsParams{
		Time:  ts,
		Query: r.FormValue("query"),
		Stats: r.FormValue("stats"),
	}, nil

}

func parseQueryRangeRequest(r *http.Request) (*model.QueryRangeParams, *model.ApiError) {

	start, err := parseMetricsTime(r.FormValue("start"))
	if err != nil {
		return nil, &model.ApiError{model.ErrorBadData, err}
	}
	end, err := parseMetricsTime(r.FormValue("end"))
	if err != nil {
		return nil, &model.ApiError{model.ErrorBadData, err}
	}
	if end.Before(start) {
		err := errors.New("end timestamp must not be before start time")
		return nil, &model.ApiError{model.ErrorBadData, err}
	}

	step, err := parseMetricsDuration(r.FormValue("step"))
	if err != nil {
		return nil, &model.ApiError{model.ErrorBadData, err}
	}

	if step <= 0 {
		err := errors.New("zero or negative query resolution step widths are not accepted. Try a positive integer")
		return nil, &model.ApiError{model.ErrorBadData, err}
	}

	// For safety, limit the number of returned points per timeseries.
	// This is sufficient for 60s resolution for a week or 1h resolution for a year.
	if end.Sub(start)/step > 11000 {
		err := errors.New("exceeded maximum resolution of 11,000 points per timeseries. Try decreasing the query resolution (?step=XX)")
		return nil, &model.ApiError{model.ErrorBadData, err}
	}

	queryRangeParams := model.QueryRangeParams{
		Start: start,
		End:   end,
		Step:  step,
		Query: r.FormValue("query"),
		Stats: r.FormValue("stats"),
	}

	return &queryRangeParams, nil
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
	stepHour := stepInt / 3600

	getUsageParams := model.GetUsageParams{
		StartTime:   startTime.Format(time.RFC3339Nano),
		EndTime:     endTime.Format(time.RFC3339Nano),
		Start:       startTime,
		End:         endTime,
		ServiceName: serviceName,
		Period:      fmt.Sprintf("PT%dH", stepHour),
		StepHour:    stepHour,
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
		Start:       startTime,
		StartTime:   startTime.Format(time.RFC3339Nano),
		End:         endTime,
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
		Start:       startTime,
		StartTime:   startTime.Format(time.RFC3339Nano),
		End:         endTime,
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
		Start:     startTime,
		StartTime: startTime.Format(time.RFC3339Nano),
		End:       endTime,
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
		Start:             startTime,
		End:               endTime,
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
		// Escaping new line chars to avoid CWE-117
		operationName = strings.Replace(operationName, "\n", "", -1)
		operationName = strings.Replace(operationName, "\r", "", -1)
		zap.S().Debug("Operation Name: ", operationName)
	}

	kind := r.URL.Query().Get("kind")
	if len(kind) != 0 {
		params.Kind = kind
		// Escaping new line chars to avoid CWE-117
		kind = strings.Replace(kind, "\n", "", -1)
		kind = strings.Replace(kind, "\r", "", -1)
		zap.S().Debug("Kind: ", kind)
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
		Start:     startTime,
		End:       endTime,
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
		// Escaping new line chars to avoid CWE-117
		operationName = strings.Replace(operationName, "\n", "", -1)
		operationName = strings.Replace(operationName, "\r", "", -1)
		zap.S().Debug("Operation Name: ", operationName)
	}

	kind := r.URL.Query().Get("kind")
	if len(kind) != 0 {
		params.Kind = kind
		// Escaping new line chars to avoid CWE-117
		kind = strings.Replace(kind, "\n", "", -1)
		kind = strings.Replace(kind, "\r", "", -1)
		zap.S().Debug("Kind: ", kind)
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

func parseSpanFilterRequestBody(r *http.Request) (*model.SpanFilterParams, error) {

	var postData *model.SpanFilterParams
	err := json.NewDecoder(r.Body).Decode(&postData)

	if err != nil {
		return nil, err
	}

	postData.Start, err = parseTimeStr(postData.StartStr, "start")
	if err != nil {
		return nil, err
	}
	postData.End, err = parseTimeMinusBufferStr(postData.EndStr, "end")
	if err != nil {
		return nil, err
	}

	return postData, nil
}

func parseFilteredSpansRequest(r *http.Request) (*model.GetFilteredSpansParams, error) {

	var postData *model.GetFilteredSpansParams
	err := json.NewDecoder(r.Body).Decode(&postData)

	if err != nil {
		return nil, err
	}

	postData.Start, err = parseTimeStr(postData.StartStr, "start")
	if err != nil {
		return nil, err
	}
	postData.End, err = parseTimeMinusBufferStr(postData.EndStr, "end")
	if err != nil {
		return nil, err
	}

	if postData.Limit == 0 {
		postData.Limit = 100
	}

	return postData, nil
}

func parseFilteredSpanAggregatesRequest(r *http.Request) (*model.GetFilteredSpanAggregatesParams, error) {

	var postData *model.GetFilteredSpanAggregatesParams
	err := json.NewDecoder(r.Body).Decode(&postData)

	if err != nil {
		return nil, err
	}

	postData.Start, err = parseTimeStr(postData.StartStr, "start")
	if err != nil {
		return nil, err
	}
	postData.End, err = parseTimeMinusBufferStr(postData.EndStr, "end")
	if err != nil {
		return nil, err
	}

	step := postData.StepSeconds
	if step == 0 {
		return nil, errors.New("step param missing in query")
	}

	function := postData.Function
	if len(function) == 0 {
		return nil, errors.New("function param missing in query")
	} else {
		if !DoesExistInSlice(function, allowedFunctions) {
			return nil, errors.New(fmt.Sprintf("given function: %s is not allowed in query", function))
		}
	}

	var dimension, aggregationOption string

	switch function {
	case "count":
		dimension = "calls"
		aggregationOption = "count"
	case "ratePerSec":
		dimension = "calls"
		aggregationOption = "rate_per_sec"
	case "avg":
		dimension = "duration"
		aggregationOption = "avg"
	case "sum":
		dimension = "duration"
		aggregationOption = "sum"
	case "p50":
		dimension = "duration"
		aggregationOption = "p50"
	case "p90":
		dimension = "duration"
		aggregationOption = "p90"
	case "p95":
		dimension = "duration"
		aggregationOption = "p95"
	case "p99":
		dimension = "duration"
		aggregationOption = "p99"
	case "min":
		dimension = "duration"
		aggregationOption = "min"
	case "max":
		dimension = "duration"
		aggregationOption = "max"
	}

	postData.AggregationOption = aggregationOption
	postData.Dimension = dimension
	// tags, err := parseTagsV2("tags", r)
	// if err != nil {
	// 	return nil, err
	// }
	// if len(*tags) != 0 {
	// 	params.Tags = *tags
	// }

	return postData, nil
}

func parseErrorRequest(r *http.Request) (*model.GetErrorParams, error) {

	params := &model.GetErrorParams{}

	serviceName := r.URL.Query().Get("serviceName")
	if len(serviceName) != 0 {
		params.ServiceName = serviceName
	}

	errorType := r.URL.Query().Get("errorType")
	if len(errorType) != 0 {
		params.ErrorType = errorType
	}

	errorId := r.URL.Query().Get("errorId")
	if len(errorId) != 0 {
		params.ErrorID = errorId
	}

	return params, nil
}

func parseTagFilterRequest(r *http.Request) (*model.TagFilterParams, error) {
	var postData *model.TagFilterParams
	err := json.NewDecoder(r.Body).Decode(&postData)

	if err != nil {
		return nil, err
	}

	postData.Start, err = parseTimeStr(postData.StartStr, "start")
	if err != nil {
		return nil, err
	}
	postData.End, err = parseTimeMinusBufferStr(postData.EndStr, "end")
	if err != nil {
		return nil, err
	}

	return postData, nil

}

func parseTagValueRequest(r *http.Request) (*model.TagFilterParams, error) {
	var postData *model.TagFilterParams
	err := json.NewDecoder(r.Body).Decode(&postData)

	if err != nil {
		return nil, err
	}
	if postData.TagKey == "" {
		return nil, fmt.Errorf("%s param missing in query", postData.TagKey)
	}

	postData.Start, err = parseTimeStr(postData.StartStr, "start")
	if err != nil {
		return nil, err
	}
	postData.End, err = parseTimeMinusBufferStr(postData.EndStr, "end")
	if err != nil {
		return nil, err
	}

	return postData, nil

}

func parseErrorsRequest(r *http.Request) (*model.GetErrorsParams, error) {

	startTime, err := parseTime("start", r)
	if err != nil {
		return nil, err
	}
	endTime, err := parseTimeMinusBuffer("end", r)
	if err != nil {
		return nil, err
	}

	params := &model.GetErrorsParams{
		Start: startTime,
		End:   endTime,
	}

	return params, nil
}

func fetchArrayValues(param string, r *http.Request) []string {
	valueStr := r.URL.Query().Get(param)
	var values []string
	if len(valueStr) == 0 {
		return values
	}
	err := json.Unmarshal([]byte(valueStr), &values)
	if err != nil {
		zap.S().Error("Error in parsing service params", zap.Error(err))
	}
	return values
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

func parseTagsV2(param string, r *http.Request) (*[]model.TagQueryV2, error) {

	tags := new([]model.TagQueryV2)
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

func parseTimeStr(timeStr string, param string) (*time.Time, error) {

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

func parseTimeMinusBufferStr(timeStr string, param string) (*time.Time, error) {

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
func parseSetRulesRequest(r *http.Request) (string, *model.ApiError) {

	return "", nil
}

func parseTTLParams(r *http.Request) (*model.TTLParams, error) {

	// make sure either of the query params are present
	typeTTL := r.URL.Query().Get("type")
	delDuration := r.URL.Query().Get("duration")
	coldStorage := r.URL.Query().Get("coldStorage")
	toColdDuration := r.URL.Query().Get("toColdDuration")

	if len(typeTTL) == 0 || len(delDuration) == 0 {
		return nil, fmt.Errorf("type and duration param cannot be empty from the query")
	}

	// Validate the type parameter
	if typeTTL != constants.TraceTTL && typeTTL != constants.MetricsTTL {
		return nil, fmt.Errorf("type param should be <metrics|traces>, got %v", typeTTL)
	}

	// Validate the TTL duration.
	durationParsed, err := time.ParseDuration(delDuration)
	if err != nil {
		return nil, fmt.Errorf("Not a valid TTL duration %v", delDuration)
	}

	var toColdParsed time.Duration

	// If some cold storage is provided, validate the cold storage move TTL.
	if len(coldStorage) > 0 {
		toColdParsed, err = time.ParseDuration(toColdDuration)
		if err != nil {
			return nil, fmt.Errorf("Not a valid toCold TTL duration %v", toColdDuration)
		}
		if toColdParsed.Seconds() >= durationParsed.Seconds() {
			return nil, fmt.Errorf("Delete TTL should be greater than cold storage move TTL.")
		}
	}

	return &model.TTLParams{
		Type:                  typeTTL,
		DelDuration:           durationParsed.Seconds(),
		ColdStorageVolume:     coldStorage,
		ToColdStorageDuration: toColdParsed.Seconds(),
	}, nil
}

func parseGetTTL(r *http.Request) (*model.GetTTLParams, error) {

	typeTTL := r.URL.Query().Get("type")
	getAllTTL := false

	if len(typeTTL) == 0 {
		getAllTTL = true
	} else {
		// Validate the type parameter
		if typeTTL != constants.TraceTTL && typeTTL != constants.MetricsTTL {
			return nil, fmt.Errorf("type param should be <metrics|traces>, got %v", typeTTL)
		}
	}

	return &model.GetTTLParams{Type: typeTTL, GetAllTTL: getAllTTL}, nil
}

func parseUserPreferences(r *http.Request) (*model.UserPreferences, error) {

	var userPreferences model.UserPreferences
	err := json.NewDecoder(r.Body).Decode(&userPreferences)
	if err != nil {
		return nil, err
	}

	return &userPreferences, nil

}
