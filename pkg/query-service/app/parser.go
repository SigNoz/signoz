package app

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"text/template"
	"time"

	"github.com/SigNoz/govaluate"
	"github.com/gorilla/mux"
	promModel "github.com/prometheus/common/model"
	"go.uber.org/multierr"

	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/constants"
	baseconstants "go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"go.signoz.io/signoz/pkg/query-service/utils"
	querytemplate "go.signoz.io/signoz/pkg/query-service/utils/queryTemplate"
)

var allowedFunctions = []string{"count", "ratePerSec", "sum", "avg", "min", "max", "p50", "p90", "p95", "p99"}

func parseGetTopOperationsRequest(r *http.Request) (*model.GetTopOperationsParams, error) {
	var postData *model.GetTopOperationsParams
	err := json.NewDecoder(r.Body).Decode(&postData)

	if err != nil {
		return nil, err
	}

	postData.Start, err = parseTimeStr(postData.StartTime, "start")
	if err != nil {
		return nil, err
	}
	postData.End, err = parseTimeMinusBufferStr(postData.EndTime, "end")
	if err != nil {
		return nil, err
	}

	if len(postData.ServiceName) == 0 {
		return nil, errors.New("serviceName param missing in query")
	}

	return postData, nil
}

func parseRegisterEventRequest(r *http.Request) (*model.RegisterEventParams, error) {
	var postData *model.RegisterEventParams
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		return nil, err
	}
	if postData.EventName == "" {
		return nil, errors.New("eventName param missing in query")
	}

	return postData, nil
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
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
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
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}
	end, err := parseMetricsTime(r.FormValue("end"))
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}
	if end.Before(start) {
		err := errors.New("end timestamp must not be before start time")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	step, err := parseMetricsDuration(r.FormValue("step"))
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	if step <= 0 {
		err := errors.New("zero or negative query resolution step widths are not accepted. Try a positive integer")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	// For safety, limit the number of returned points per timeseries.
	// This is sufficient for 60s resolution for a week or 1h resolution for a year.
	if end.Sub(start)/step > 11000 {
		err := errors.New("exceeded maximum resolution of 11,000 points per timeseries. Try decreasing the query resolution (?step=XX)")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
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

func parseGetServicesRequest(r *http.Request) (*model.GetServicesParams, error) {

	var postData *model.GetServicesParams
	err := json.NewDecoder(r.Body).Decode(&postData)

	if err != nil {
		return nil, err
	}

	postData.Start, err = parseTimeStr(postData.StartTime, "start")
	if err != nil {
		return nil, err
	}
	postData.End, err = parseTimeMinusBufferStr(postData.EndTime, "end")
	if err != nil {
		return nil, err
	}

	postData.Period = int(postData.End.Unix() - postData.Start.Unix())
	return postData, nil
}

func ParseSearchTracesParams(r *http.Request) (*model.SearchTracesParams, error) {
	vars := mux.Vars(r)
	params := &model.SearchTracesParams{}
	params.TraceID = vars["traceId"]
	params.SpanID = r.URL.Query().Get("spanId")

	levelUpStr := r.URL.Query().Get("levelUp")
	levelDownStr := r.URL.Query().Get("levelDown")
	SpanRenderLimitStr := r.URL.Query().Get("spanRenderLimit")
	if levelUpStr == "" || levelUpStr == "null" {
		levelUpStr = "0"
	}
	if levelDownStr == "" || levelDownStr == "null" {
		levelDownStr = "0"
	}
	if SpanRenderLimitStr == "" || SpanRenderLimitStr == "null" {
		SpanRenderLimitStr = baseconstants.SpanRenderLimitStr
	}

	levelUpInt, err := strconv.Atoi(levelUpStr)
	if err != nil {
		return nil, err
	}
	levelDownInt, err := strconv.Atoi(levelDownStr)
	if err != nil {
		return nil, err
	}
	SpanRenderLimitInt, err := strconv.Atoi(SpanRenderLimitStr)
	if err != nil {
		return nil, err
	}
	MaxSpansInTraceInt, err := strconv.Atoi(baseconstants.MaxSpansInTraceStr)
	if err != nil {
		return nil, err
	}
	params.LevelUp = levelUpInt
	params.LevelDown = levelDownInt
	params.SpansRenderLimit = SpanRenderLimitInt
	params.MaxSpansInTrace = MaxSpansInTraceInt
	return params, nil
}

func DoesExistInSlice(item string, list []string) bool {
	for _, element := range list {
		if item == element {
			return true
		}
	}
	return false
}
func parseListErrorsRequest(r *http.Request) (*model.ListErrorsParams, error) {

	var allowedOrderParams = []string{"exceptionType", "exceptionCount", "firstSeen", "lastSeen", "serviceName"}
	var allowedOrderDirections = []string{"ascending", "descending"}

	var postData *model.ListErrorsParams
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
		return nil, fmt.Errorf("limit param cannot be empty from the query")
	}

	if len(postData.Order) > 0 && !DoesExistInSlice(postData.Order, allowedOrderDirections) {
		return nil, fmt.Errorf("given order: %s is not allowed in query", postData.Order)
	}

	if len(postData.Order) > 0 && !DoesExistInSlice(postData.OrderParam, allowedOrderParams) {
		return nil, fmt.Errorf("given orderParam: %s is not allowed in query", postData.OrderParam)
	}

	return postData, nil
}

func parseCountErrorsRequest(r *http.Request) (*model.CountErrorsParams, error) {

	var postData *model.CountErrorsParams
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

func parseGetErrorRequest(r *http.Request) (*model.GetErrorParams, error) {

	timestamp, err := parseTime("timestamp", r)
	if err != nil {
		return nil, err
	}

	groupID := r.URL.Query().Get("groupID")

	if len(groupID) == 0 {
		return nil, fmt.Errorf("groupID param cannot be empty from the query")
	}
	errorID := r.URL.Query().Get("errorID")

	params := &model.GetErrorParams{
		Timestamp: timestamp,
		GroupID:   groupID,
		ErrorID:   errorID,
	}

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
	if typeTTL != baseconstants.TraceTTL && typeTTL != baseconstants.MetricsTTL && typeTTL != baseconstants.LogsTTL {
		return nil, fmt.Errorf("type param should be metrics|traces|logs, got %v", typeTTL)
	}

	// Validate the TTL duration.
	durationParsed, err := time.ParseDuration(delDuration)
	if err != nil || durationParsed.Seconds() <= 0 {
		return nil, fmt.Errorf("not a valid TTL duration %v", delDuration)
	}

	var toColdParsed time.Duration

	// If some cold storage is provided, validate the cold storage move TTL.
	if len(coldStorage) > 0 {
		toColdParsed, err = time.ParseDuration(toColdDuration)
		if err != nil || toColdParsed.Seconds() <= 0 {
			return nil, fmt.Errorf("not a valid toCold TTL duration %v", toColdDuration)
		}
		if toColdParsed.Seconds() != 0 && toColdParsed.Seconds() >= durationParsed.Seconds() {
			return nil, fmt.Errorf("delete TTL should be greater than cold storage move TTL")
		}
	}

	return &model.TTLParams{
		Type:                  typeTTL,
		DelDuration:           int64(durationParsed.Seconds()),
		ColdStorageVolume:     coldStorage,
		ToColdStorageDuration: int64(toColdParsed.Seconds()),
	}, nil
}

func parseGetTTL(r *http.Request) (*model.GetTTLParams, error) {

	typeTTL := r.URL.Query().Get("type")

	if len(typeTTL) == 0 {
		return nil, fmt.Errorf("type param cannot be empty from the query")
	} else {
		// Validate the type parameter
		if typeTTL != baseconstants.TraceTTL && typeTTL != baseconstants.MetricsTTL && typeTTL != baseconstants.LogsTTL {
			return nil, fmt.Errorf("type param should be metrics|traces|logs, got %v", typeTTL)
		}
	}

	return &model.GetTTLParams{Type: typeTTL}, nil
}

func parseUserRequest(r *http.Request) (*model.User, error) {
	var req model.User
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return &req, nil
}

func parseInviteRequest(r *http.Request) (*model.InviteRequest, error) {
	var req model.InviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	// Trim spaces from email
	req.Email = strings.TrimSpace(req.Email)
	return &req, nil
}

func isValidRole(role string) bool {
	switch role {
	case constants.AdminGroup, constants.EditorGroup, constants.ViewerGroup:
		return true
	}
	return false
}

func parseInviteUsersRequest(r *http.Request) (*model.BulkInviteRequest, error) {
	var req model.BulkInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}

	// Validate that the request contains users
	if len(req.Users) == 0 {
		return nil, fmt.Errorf("no users provided for invitation")
	}

	// Trim spaces and validate each user
	for i := range req.Users {
		req.Users[i].Email = strings.TrimSpace(req.Users[i].Email)
		if req.Users[i].Email == "" {
			return nil, fmt.Errorf("email is required for each user")
		}
		if req.Users[i].FrontendBaseUrl == "" {
			return nil, fmt.Errorf("frontendBaseUrl is required for each user")
		}
		if !isValidRole(req.Users[i].Role) {
			return nil, fmt.Errorf("invalid role for user: %s", req.Users[i].Email)
		}
	}

	return &req, nil
}

func parseSetApdexScoreRequest(r *http.Request) (*model.ApdexSettings, error) {
	var req model.ApdexSettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return &req, nil
}

func parseInsertIngestionKeyRequest(r *http.Request) (*model.IngestionKey, error) {
	var req model.IngestionKey
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return &req, nil
}

func parseRegisterRequest(r *http.Request) (*auth.RegisterRequest, error) {
	var req auth.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}

	if err := auth.ValidatePassword(req.Password); err != nil {
		return nil, err
	}

	return &req, nil
}

func parseLoginRequest(r *http.Request) (*model.LoginRequest, error) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}

	return &req, nil
}

func parseUserRoleRequest(r *http.Request) (*model.UserRole, error) {
	var req model.UserRole
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}

	return &req, nil
}

func parseEditOrgRequest(r *http.Request) (*model.Organization, error) {
	var req model.Organization
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}

	return &req, nil
}

func parseResetPasswordRequest(r *http.Request) (*model.ResetPasswordRequest, error) {
	var req model.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	if err := auth.ValidatePassword(req.Password); err != nil {
		return nil, err
	}

	return &req, nil
}

func parseChangePasswordRequest(r *http.Request) (*model.ChangePasswordRequest, error) {
	id := mux.Vars(r)["id"]
	var req model.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.UserId = id
	if err := auth.ValidatePassword(req.NewPassword); err != nil {
		return nil, err
	}

	return &req, nil
}

func parseAggregateAttributeRequest(r *http.Request) (*v3.AggregateAttributeRequest, error) {
	var req v3.AggregateAttributeRequest

	aggregateOperator := v3.AggregateOperator(r.URL.Query().Get("aggregateOperator"))
	dataSource := v3.DataSource(r.URL.Query().Get("dataSource"))
	aggregateAttribute := r.URL.Query().Get("searchText")

	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 50
	}

	if dataSource != v3.DataSourceMetrics {
		if err := aggregateOperator.Validate(); err != nil {
			return nil, err
		}
	}

	if err := dataSource.Validate(); err != nil {
		return nil, err
	}

	req = v3.AggregateAttributeRequest{
		Operator:   aggregateOperator,
		SearchText: aggregateAttribute,
		Limit:      limit,
		DataSource: dataSource,
	}
	return &req, nil
}

func parseQBFilterSuggestionsRequest(r *http.Request) (
	*v3.QBFilterSuggestionsRequest, *model.ApiError,
) {
	dataSource := v3.DataSource(r.URL.Query().Get("dataSource"))
	if err := dataSource.Validate(); err != nil {
		return nil, model.BadRequest(err)
	}

	parsePositiveIntQP := func(
		queryParam string, defaultValue uint64, maxValue uint64,
	) (uint64, *model.ApiError) {
		value := defaultValue

		qpValue := r.URL.Query().Get(queryParam)
		if len(qpValue) > 0 {
			value, err := strconv.Atoi(qpValue)

			if err != nil || value < 1 || value > int(maxValue) {
				return 0, model.BadRequest(fmt.Errorf(
					"invalid %s: %s", queryParam, qpValue,
				))
			}
		}

		return value, nil
	}

	attributesLimit, err := parsePositiveIntQP(
		"attributesLimit",
		baseconstants.DefaultFilterSuggestionsAttributesLimit,
		baseconstants.MaxFilterSuggestionsAttributesLimit,
	)
	if err != nil {
		return nil, err
	}

	examplesLimit, err := parsePositiveIntQP(
		"examplesLimit",
		baseconstants.DefaultFilterSuggestionsExamplesLimit,
		baseconstants.MaxFilterSuggestionsExamplesLimit,
	)
	if err != nil {
		return nil, err
	}

	var existingFilter *v3.FilterSet
	existingFilterB64 := r.URL.Query().Get("existingFilter")
	if len(existingFilterB64) > 0 {
		decodedFilterJson, err := base64.RawURLEncoding.DecodeString(existingFilterB64)
		if err != nil {
			return nil, model.BadRequest(fmt.Errorf("couldn't base64 decode existingFilter: %w", err))
		}

		existingFilter = &v3.FilterSet{}
		err = json.Unmarshal(decodedFilterJson, existingFilter)
		if err != nil {
			return nil, model.BadRequest(fmt.Errorf("couldn't JSON decode existingFilter: %w", err))
		}
	}

	searchText := r.URL.Query().Get("searchText")

	return &v3.QBFilterSuggestionsRequest{
		DataSource:      dataSource,
		SearchText:      searchText,
		ExistingFilter:  existingFilter,
		AttributesLimit: attributesLimit,
		ExamplesLimit:   examplesLimit,
	}, nil
}

func parseFilterAttributeKeyRequest(r *http.Request) (*v3.FilterAttributeKeyRequest, error) {
	var req v3.FilterAttributeKeyRequest

	dataSource := v3.DataSource(r.URL.Query().Get("dataSource"))
	aggregateOperator := v3.AggregateOperator(r.URL.Query().Get("aggregateOperator"))
	aggregateAttribute := r.URL.Query().Get("aggregateAttribute")
	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 50
	}

	if err := dataSource.Validate(); err != nil {
		return nil, err
	}

	if dataSource != v3.DataSourceMetrics {
		if err := aggregateOperator.Validate(); err != nil {
			return nil, err
		}
	}

	req = v3.FilterAttributeKeyRequest{
		DataSource:         dataSource,
		AggregateOperator:  aggregateOperator,
		AggregateAttribute: aggregateAttribute,
		Limit:              limit,
		SearchText:         r.URL.Query().Get("searchText"),
	}
	return &req, nil
}

func parseFilterAttributeValueRequest(r *http.Request) (*v3.FilterAttributeValueRequest, error) {

	var req v3.FilterAttributeValueRequest

	dataSource := v3.DataSource(r.URL.Query().Get("dataSource"))
	aggregateOperator := v3.AggregateOperator(r.URL.Query().Get("aggregateOperator"))
	filterAttributeKeyDataType := v3.AttributeKeyDataType(r.URL.Query().Get("filterAttributeKeyDataType")) // can be empty
	aggregateAttribute := r.URL.Query().Get("aggregateAttribute")
	tagType := v3.TagType(r.URL.Query().Get("tagType")) // can be empty

	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 50
	}

	if err := dataSource.Validate(); err != nil {
		return nil, err
	}

	if dataSource != v3.DataSourceMetrics {
		if err := aggregateOperator.Validate(); err != nil {
			return nil, err
		}
	}

	req = v3.FilterAttributeValueRequest{
		DataSource:                 dataSource,
		AggregateOperator:          aggregateOperator,
		AggregateAttribute:         aggregateAttribute,
		TagType:                    tagType,
		Limit:                      limit,
		SearchText:                 r.URL.Query().Get("searchText"),
		FilterAttributeKey:         r.URL.Query().Get("attributeKey"),
		FilterAttributeKeyDataType: filterAttributeKeyDataType,
	}
	return &req, nil
}

func validateQueryRangeParamsV3(qp *v3.QueryRangeParamsV3) error {
	err := qp.CompositeQuery.Validate()
	if err != nil {
		return err
	}

	var expressions []string
	for _, q := range qp.CompositeQuery.BuilderQueries {
		expressions = append(expressions, q.Expression)
	}
	errs := validateExpressions(expressions, queryBuilder.EvalFuncs, qp.CompositeQuery)
	if len(errs) > 0 {
		return multierr.Combine(errs...)
	}
	return nil
}

// validateExpressions validates the math expressions using the list of
// allowed functions.
func validateExpressions(expressions []string, funcs map[string]govaluate.ExpressionFunction, cq *v3.CompositeQuery) []error {
	var errs []error
	for _, exp := range expressions {
		evalExp, err := govaluate.NewEvaluableExpressionWithFunctions(exp, funcs)
		if err != nil {
			errs = append(errs, fmt.Errorf("invalid expression %s: %v", exp, err))
			continue
		}
		for _, v := range evalExp.Vars() {
			var hasVariable bool
			for _, q := range cq.BuilderQueries {
				if q.Expression == v {
					hasVariable = true
					break
				}
			}
			if !hasVariable {
				errs = append(errs, fmt.Errorf("unknown variable %s", v))
			}
		}
	}
	return errs
}

func ParseQueryRangeParams(r *http.Request) (*v3.QueryRangeParamsV3, *model.ApiError) {

	var queryRangeParams *v3.QueryRangeParamsV3

	// parse the request body
	if err := json.NewDecoder(r.Body).Decode(&queryRangeParams); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}

	// sanitize the request body
	queryRangeParams.CompositeQuery.Sanitize()

	// validate the request body
	if err := validateQueryRangeParamsV3(queryRangeParams); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	// prepare the variables for the corresponding query type
	formattedVars := make(map[string]interface{})
	for name, value := range queryRangeParams.Variables {
		if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypePromQL {
			formattedVars[name] = metrics.PromFormattedValue(value)
		} else if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL {
			formattedVars[name] = utils.ClickHouseFormattedValue(value)
		}
	}

	// replace the variables in metrics builder filter item with actual value
	// example: {"key": "host", "value": "{{ .host }}", "operator": "equals"} with
	// variables {"host": "test"} will be replaced with {"key": "host", "value": "test", "operator": "equals"}

	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
			// Formula query
			// Check if the queries used in the expression can be joined
			if query.QueryName != query.Expression {
				expression, err := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, postprocess.EvalFuncs())
				if err != nil {
					return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
				}

				// get the group keys for the vars
				groupKeys := make(map[string][]string)
				for _, v := range expression.Vars() {
					if varQuery, ok := queryRangeParams.CompositeQuery.BuilderQueries[v]; ok {
						groupKeys[v] = []string{}
						for _, key := range varQuery.GroupBy {
							groupKeys[v] = append(groupKeys[v], key.Key)
						}
					} else {
						return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("unknown variable %s", v)}
					}
				}

				params := make(map[string]interface{})
				for k, v := range groupKeys {
					params[k] = v
				}

				can, _, err := expression.CanJoin(params)
				if err != nil {
					return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
				}

				if !can {
					return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot join the given group keys")}
				}
			}

			// If the step interval is less than the minimum allowed step interval, set it to the minimum allowed step interval
			if minStep := common.MinAllowedStepInterval(queryRangeParams.Start, queryRangeParams.End); query.StepInterval < minStep {
				query.StepInterval = minStep
			}

			if query.DataSource == v3.DataSourceMetrics && baseconstants.UseMetricsPreAggregation() {
				// if the time range is greater than 1 day, and less than 1 week set the step interval to be multiple of 5 minutes
				// if the time range is greater than 1 week, set the step interval to be multiple of 30 mins
				start, end := queryRangeParams.Start, queryRangeParams.End
				if end-start >= 24*time.Hour.Milliseconds() && end-start < 7*24*time.Hour.Milliseconds() {
					query.StepInterval = int64(math.Round(float64(query.StepInterval)/300)) * 300
				} else if end-start >= 7*24*time.Hour.Milliseconds() {
					query.StepInterval = int64(math.Round(float64(query.StepInterval)/1800)) * 1800
				}
			}

			query.SetShiftByFromFunc()

			if query.Filters == nil || len(query.Filters.Items) == 0 {
				continue
			}

			for idx := range query.Filters.Items {
				item := &query.Filters.Items[idx]
				value := item.Value
				if value != nil {
					switch x := value.(type) {
					case string:
						variableName := strings.Trim(x, "{[.$]}")
						if _, ok := queryRangeParams.Variables[variableName]; ok {
							item.Value = queryRangeParams.Variables[variableName]
						}
					case []interface{}:
						if len(x) > 0 {
							switch x[0].(type) {
							case string:
								variableName := strings.Trim(x[0].(string), "{[.$]}")
								if _, ok := queryRangeParams.Variables[variableName]; ok {
									item.Value = queryRangeParams.Variables[variableName]
								}
							}
						}
					}
				}

				if v3.FilterOperator(strings.ToLower((string(item.Operator)))) != v3.FilterOperatorIn && v3.FilterOperator(strings.ToLower((string(item.Operator)))) != v3.FilterOperatorNotIn {
					// the value type should not be multiple values
					if _, ok := item.Value.([]interface{}); ok {
						return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("multiple values %s are not allowed for operator `%s` for key `%s`", item.Value, item.Operator, item.Key.Key)}
					}
				}
			}
		}
	}
	queryRangeParams.Variables = formattedVars

	// prometheus instant query needs same timestamp
	if queryRangeParams.CompositeQuery.PanelType == v3.PanelTypeValue &&
		queryRangeParams.CompositeQuery.QueryType == v3.QueryTypePromQL {
		queryRangeParams.Start = queryRangeParams.End
	}

	// replace go template variables in clickhouse query
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL {
		for _, chQuery := range queryRangeParams.CompositeQuery.ClickHouseQueries {
			if chQuery.Disabled {
				continue
			}

			for name, value := range queryRangeParams.Variables {
				chQuery.Query = strings.Replace(chQuery.Query, fmt.Sprintf("{{%s}}", name), fmt.Sprint(value), -1)
				chQuery.Query = strings.Replace(chQuery.Query, fmt.Sprintf("[[%s]]", name), fmt.Sprint(value), -1)
				chQuery.Query = strings.Replace(chQuery.Query, fmt.Sprintf("$%s", name), fmt.Sprint(value), -1)
			}

			tmpl := template.New("clickhouse-query")
			tmpl, err := tmpl.Parse(chQuery.Query)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
			}
			var query bytes.Buffer

			// replace go template variables
			querytemplate.AssignReservedVarsV3(queryRangeParams)

			err = tmpl.Execute(&query, queryRangeParams.Variables)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
			}
			chQuery.Query = query.String()
		}
	}

	// replace go template variables in prometheus query
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypePromQL {
		for _, promQuery := range queryRangeParams.CompositeQuery.PromQueries {
			if promQuery.Disabled {
				continue
			}

			for name, value := range queryRangeParams.Variables {
				promQuery.Query = strings.Replace(promQuery.Query, fmt.Sprintf("{{%s}}", name), fmt.Sprint(value), -1)
				promQuery.Query = strings.Replace(promQuery.Query, fmt.Sprintf("[[%s]]", name), fmt.Sprint(value), -1)
				promQuery.Query = strings.Replace(promQuery.Query, fmt.Sprintf("$%s", name), fmt.Sprint(value), -1)
			}

			tmpl := template.New("prometheus-query")
			tmpl, err := tmpl.Parse(promQuery.Query)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
			}
			var query bytes.Buffer

			// replace go template variables
			querytemplate.AssignReservedVarsV3(queryRangeParams)

			err = tmpl.Execute(&query, queryRangeParams.Variables)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
			}
			promQuery.Query = query.String()
		}
	}

	return queryRangeParams, nil
}
