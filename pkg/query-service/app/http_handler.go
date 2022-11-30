package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	_ "github.com/mattn/go-sqlite3"
	"github.com/prometheus/prometheus/promql"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/app/logs"
	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	"go.signoz.io/signoz/pkg/query-service/app/parser"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	querytemplate "go.signoz.io/signoz/pkg/query-service/utils/queryTemplate"

	"go.signoz.io/signoz/pkg/query-service/dao"
	am "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	signozio "go.signoz.io/signoz/pkg/query-service/integrations/signozio"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/query-service/version"
	"go.uber.org/zap"
)

type status string

const (
	statusSuccess status = "success"
	statusError   status = "error"
)

// NewRouter creates and configures a Gorilla Router.
func NewRouter() *mux.Router {
	return mux.NewRouter().UseEncodedPath()
}

// APIHandler implements the query service public API by registering routes at httpPrefix
type APIHandler struct {
	// queryService *querysvc.QueryService
	// queryParser  queryParser
	basePath     string
	apiPrefix    string
	reader       interfaces.Reader
	appDao       dao.ModelDao
	alertManager am.Manager
	ruleManager  *rules.Manager
	featureFlags interfaces.FeatureLookup
	ready        func(http.HandlerFunc) http.HandlerFunc
}

type APIHandlerOpts struct {

	// business data reader e.g. clickhouse
	Reader interfaces.Reader

	// dao layer to perform crud on app objects like dashboard, alerts etc
	AppDao dao.ModelDao

	// rule manager handles rule crud operations
	RuleManager *rules.Manager

	// feature flags querier
	FeatureFlags interfaces.FeatureLookup
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(opts APIHandlerOpts) (*APIHandler, error) {

	alertManager, err := am.New("")
	if err != nil {
		return nil, err
	}

	aH := &APIHandler{
		reader:       opts.Reader,
		appDao:       opts.AppDao,
		alertManager: alertManager,
		ruleManager:  opts.RuleManager,
		featureFlags: opts.FeatureFlags,
	}

	aH.ready = aH.testReady

	dashboards.LoadDashboardFiles()
	// if errReadingDashboards != nil {
	// 	return nil, errReadingDashboards
	// }
	return aH, nil
}

type structuredResponse struct {
	Data   interface{}       `json:"data"`
	Total  int               `json:"total"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
	Errors []structuredError `json:"errors"`
}

type structuredError struct {
	Code int    `json:"code,omitempty"`
	Msg  string `json:"msg"`
	// TraceID ui.TraceID `json:"traceID,omitempty"`
}

var corsHeaders = map[string]string{
	"Access-Control-Allow-Headers":  "Accept, Authorization, Content-Type, Origin",
	"Access-Control-Allow-Methods":  "GET, OPTIONS",
	"Access-Control-Allow-Origin":   "*",
	"Access-Control-Expose-Headers": "Date",
}

// Enables cross-site script calls.
func setCORS(w http.ResponseWriter) {
	for h, v := range corsHeaders {
		w.Header().Set(h, v)
	}
}

type apiFunc func(r *http.Request) (interface{}, *model.ApiError, func())

// Checks if server is ready, calls f if it is, returns 503 if it is not.
func (aH *APIHandler) testReady(f http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		f(w, r)

	}
}

type response struct {
	Status    status          `json:"status"`
	Data      interface{}     `json:"data,omitempty"`
	ErrorType model.ErrorType `json:"errorType,omitempty"`
	Error     string          `json:"error,omitempty"`
}

func RespondError(w http.ResponseWriter, apiErr model.BaseApiError, data interface{}) {
	json := jsoniter.ConfigCompatibleWithStandardLibrary
	b, err := json.Marshal(&response{
		Status:    statusError,
		ErrorType: apiErr.Type(),
		Error:     apiErr.Error(),
		Data:      data,
	})
	if err != nil {
		zap.S().Error("msg", "error marshalling json response", "err", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var code int
	switch apiErr.Type() {
	case model.ErrorBadData:
		code = http.StatusBadRequest
	case model.ErrorExec:
		code = 422
	case model.ErrorCanceled, model.ErrorTimeout:
		code = http.StatusServiceUnavailable
	case model.ErrorInternal:
		code = http.StatusInternalServerError
	case model.ErrorNotFound:
		code = http.StatusNotFound
	case model.ErrorNotImplemented:
		code = http.StatusNotImplemented
	case model.ErrorUnauthorized:
		code = http.StatusUnauthorized
	case model.ErrorForbidden:
		code = http.StatusForbidden
	default:
		code = http.StatusInternalServerError
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if n, err := w.Write(b); err != nil {
		zap.S().Error("msg", "error writing response", "bytesWritten", n, "err", err)
	}
}

func writeHttpResponse(w http.ResponseWriter, data interface{}) {
	json := jsoniter.ConfigCompatibleWithStandardLibrary
	b, err := json.Marshal(&response{
		Status: statusSuccess,
		Data:   data,
	})
	if err != nil {
		zap.S().Error("msg", "error marshalling json response", "err", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if n, err := w.Write(b); err != nil {
		zap.S().Error("msg", "error writing response", "bytesWritten", n, "err", err)
	}
}

func (aH *APIHandler) RegisterMetricsRoutes(router *mux.Router) {
	subRouter := router.PathPrefix("/api/v2/metrics").Subrouter()
	subRouter.HandleFunc("/query_range", ViewAccess(aH.QueryRangeMetricsV2)).Methods(http.MethodPost)
	subRouter.HandleFunc("/autocomplete/list", ViewAccess(aH.metricAutocompleteMetricName)).Methods(http.MethodGet)
	subRouter.HandleFunc("/autocomplete/tagKey", ViewAccess(aH.metricAutocompleteTagKey)).Methods(http.MethodGet)
	subRouter.HandleFunc("/autocomplete/tagValue", ViewAccess(aH.metricAutocompleteTagValue)).Methods(http.MethodGet)
}

func (aH *APIHandler) Respond(w http.ResponseWriter, data interface{}) {
	writeHttpResponse(w, data)
}

func OpenAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		f(w, r)
	}
}

func ViewAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := auth.GetUserFromRequest(r)
		if err != nil {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorUnauthorized,
				Err: err,
			}, nil)
			return
		}

		if !(auth.IsViewer(user) || auth.IsEditor(user) || auth.IsAdmin(user)) {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorForbidden,
				Err: errors.New("API is accessible to viewers/editors/admins."),
			}, nil)
			return
		}
		f(w, r)
	}
}

func EditAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := auth.GetUserFromRequest(r)
		if err != nil {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorUnauthorized,
				Err: err,
			}, nil)
			return
		}
		if !(auth.IsEditor(user) || auth.IsAdmin(user)) {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorForbidden,
				Err: errors.New("API is accessible to editors/admins."),
			}, nil)
			return
		}
		f(w, r)
	}
}

func SelfAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := auth.GetUserFromRequest(r)
		if err != nil {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorUnauthorized,
				Err: err,
			}, nil)
			return
		}
		id := mux.Vars(r)["id"]
		if !(auth.IsSelfAccessRequest(user, id) || auth.IsAdmin(user)) {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorForbidden,
				Err: errors.New("API is accessible for self access or to the admins."),
			}, nil)
			return
		}
		f(w, r)
	}
}

func AdminAccess(f func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := auth.GetUserFromRequest(r)
		if err != nil {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorUnauthorized,
				Err: err,
			}, nil)
			return
		}
		if !auth.IsAdmin(user) {
			RespondError(w, &model.ApiError{
				Typ: model.ErrorForbidden,
				Err: errors.New("API is accessible to admins only"),
			}, nil)
			return
		}
		f(w, r)
	}
}

// RegisterPrivateRoutes registers routes for this handler on the given router
func (aH *APIHandler) RegisterPrivateRoutes(router *mux.Router) {
	router.HandleFunc("/api/v1/channels", aH.listChannels).Methods(http.MethodGet)
}

// RegisterRoutes registers routes for this handler on the given router
func (aH *APIHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/api/v1/query_range", ViewAccess(aH.queryRangeMetrics)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/query", ViewAccess(aH.queryMetrics)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels", ViewAccess(aH.listChannels)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", ViewAccess(aH.getChannel)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", AdminAccess(aH.editChannel)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/channels/{id}", AdminAccess(aH.deleteChannel)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/channels", EditAccess(aH.createChannel)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/testChannel", EditAccess(aH.testChannel)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/rules", ViewAccess(aH.listRules)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rules/{id}", ViewAccess(aH.getRule)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rules", EditAccess(aH.createRule)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/rules/{id}", EditAccess(aH.editRule)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/rules/{id}", EditAccess(aH.deleteRule)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/rules/{id}", EditAccess(aH.patchRule)).Methods(http.MethodPatch)
	router.HandleFunc("/api/v1/testRule", EditAccess(aH.testRule)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/dashboards", ViewAccess(aH.getDashboards)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards", EditAccess(aH.createDashboards)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/dashboards/grafana", EditAccess(aH.createDashboardsTransform)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/dashboards/{uuid}", ViewAccess(aH.getDashboard)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards/{uuid}", EditAccess(aH.updateDashboard)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/dashboards/{uuid}", EditAccess(aH.deleteDashboard)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/variables/query", ViewAccess(aH.queryDashboardVars)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/feedback", OpenAccess(aH.submitFeedback)).Methods(http.MethodPost)
	// router.HandleFunc("/api/v1/get_percentiles", aH.getApplicationPercentiles).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/services", ViewAccess(aH.getServices)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/services/list", aH.getServicesList).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/overview", ViewAccess(aH.getServiceOverview)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/service/top_operations", ViewAccess(aH.getTopOperations)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/service/top_level_operations", ViewAccess(aH.getServicesTopLevelOps)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/traces/{traceId}", ViewAccess(aH.SearchTraces)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/usage", ViewAccess(aH.getUsage)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dependency_graph", ViewAccess(aH.dependencyGraph)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/ttl", AdminAccess(aH.setTTL)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/ttl", ViewAccess(aH.getTTL)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/version", OpenAccess(aH.getVersion)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/featureFlags", OpenAccess(aH.getFeatureFlags)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/configs", OpenAccess(aH.getConfigs)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/getSpanFilters", ViewAccess(aH.getSpanFilters)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getTagFilters", ViewAccess(aH.getTagFilters)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getFilteredSpans", ViewAccess(aH.getFilteredSpans)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getFilteredSpans/aggregates", ViewAccess(aH.getFilteredSpanAggregates)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getTagValues", ViewAccess(aH.getTagValues)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/listErrors", ViewAccess(aH.listErrors)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/countErrors", ViewAccess(aH.countErrors)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/errorFromErrorID", ViewAccess(aH.getErrorFromErrorID)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/errorFromGroupID", ViewAccess(aH.getErrorFromGroupID)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/nextPrevErrorIDs", ViewAccess(aH.getNextPrevErrorIDs)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/disks", ViewAccess(aH.getDisks)).Methods(http.MethodGet)

	// === Authentication APIs ===
	router.HandleFunc("/api/v1/invite", AdminAccess(aH.inviteUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/invite/{token}", OpenAccess(aH.getInvite)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/invite/{email}", AdminAccess(aH.revokeInvite)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/invite", AdminAccess(aH.listPendingInvites)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/register", OpenAccess(aH.registerUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/login", OpenAccess(aH.loginUser)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/user", AdminAccess(aH.listUsers)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/{id}", SelfAccess(aH.getUser)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/{id}", SelfAccess(aH.editUser)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/user/{id}", AdminAccess(aH.deleteUser)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/rbac/role/{id}", SelfAccess(aH.getRole)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rbac/role/{id}", AdminAccess(aH.editRole)).Methods(http.MethodPut)

	router.HandleFunc("/api/v1/org", AdminAccess(aH.getOrgs)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/org/{id}", AdminAccess(aH.getOrg)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/org/{id}", AdminAccess(aH.editOrg)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/orgUsers/{id}", AdminAccess(aH.getOrgUsers)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/getResetPasswordToken/{id}", AdminAccess(aH.getResetPasswordToken)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/resetPassword", OpenAccess(aH.resetPassword)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/changePassword/{id}", SelfAccess(aH.changePassword)).Methods(http.MethodPost)
}

func Intersection(a, b []int) (c []int) {
	m := make(map[int]bool)

	for _, item := range a {
		m[item] = true
	}

	for _, item := range b {
		if _, ok := m[item]; ok {
			c = append(c, item)
		}
	}
	return
}

func (aH *APIHandler) getRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	ruleResponse, err := aH.ruleManager.GetRule(id)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, ruleResponse)
}

func (aH *APIHandler) metricAutocompleteMetricName(w http.ResponseWriter, r *http.Request) {
	matchText := r.URL.Query().Get("match")
	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 0 // no limit
	}

	metricNameList, apiErrObj := aH.reader.GetMetricAutocompleteMetricNames(r.Context(), matchText, limit)

	if apiErrObj != nil {
		RespondError(w, apiErrObj, nil)
		return
	}
	aH.Respond(w, metricNameList)

}

func (aH *APIHandler) metricAutocompleteTagKey(w http.ResponseWriter, r *http.Request) {
	metricsAutocompleteTagKeyParams, apiErrorObj := parser.ParseMetricAutocompleteTagParams(r)
	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}

	tagKeyList, apiErrObj := aH.reader.GetMetricAutocompleteTagKey(r.Context(), metricsAutocompleteTagKeyParams)

	if apiErrObj != nil {
		RespondError(w, apiErrObj, nil)
		return
	}
	aH.Respond(w, tagKeyList)
}

func (aH *APIHandler) metricAutocompleteTagValue(w http.ResponseWriter, r *http.Request) {
	metricsAutocompleteTagValueParams, apiErrorObj := parser.ParseMetricAutocompleteTagParams(r)

	if len(metricsAutocompleteTagValueParams.TagKey) == 0 {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("tagKey not present in params")}
		RespondError(w, apiErrObj, nil)
		return
	}
	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}

	tagValueList, apiErrObj := aH.reader.GetMetricAutocompleteTagValue(r.Context(), metricsAutocompleteTagValueParams)

	if apiErrObj != nil {
		RespondError(w, apiErrObj, nil)
		return
	}

	aH.Respond(w, tagValueList)
}

func (aH *APIHandler) QueryRangeMetricsV2(w http.ResponseWriter, r *http.Request) {
	metricsQueryRangeParams, apiErrorObj := parser.ParseMetricQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.S().Errorf(apiErrorObj.Err.Error())
		RespondError(w, apiErrorObj, nil)
		return
	}

	// prometheus instant query needs same timestamp
	if metricsQueryRangeParams.CompositeMetricQuery.PanelType == model.QUERY_VALUE &&
		metricsQueryRangeParams.CompositeMetricQuery.QueryType == model.PROM {
		metricsQueryRangeParams.Start = metricsQueryRangeParams.End
	}

	// round up the end to neaerest multiple
	if metricsQueryRangeParams.CompositeMetricQuery.QueryType == model.QUERY_BUILDER {
		end := (metricsQueryRangeParams.End) / 1000
		step := metricsQueryRangeParams.Step
		metricsQueryRangeParams.End = (end / step * step) * 1000
	}

	type channelResult struct {
		Series []*model.Series
		Err    error
		Name   string
		Query  string
	}

	execClickHouseQueries := func(queries map[string]string) ([]*model.Series, error, map[string]string) {
		var seriesList []*model.Series
		ch := make(chan channelResult, len(queries))
		var wg sync.WaitGroup

		for name, query := range queries {
			wg.Add(1)
			go func(name, query string) {
				defer wg.Done()
				seriesList, err := aH.reader.GetMetricResult(r.Context(), query)
				for _, series := range seriesList {
					series.QueryName = name
				}

				if err != nil {
					ch <- channelResult{Err: fmt.Errorf("error in query-%s: %v", name, err), Name: name, Query: query}
					return
				}
				ch <- channelResult{Series: seriesList}
			}(name, query)
		}

		wg.Wait()
		close(ch)

		var errs []error
		errQuriesByName := make(map[string]string)
		// read values from the channel
		for r := range ch {
			if r.Err != nil {
				errs = append(errs, r.Err)
				errQuriesByName[r.Name] = r.Query
				continue
			}
			seriesList = append(seriesList, r.Series...)
		}
		if len(errs) != 0 {
			return nil, fmt.Errorf("encountered multiple errors: %s", metrics.FormatErrs(errs, "\n")), errQuriesByName
		}
		return seriesList, nil, nil
	}

	execPromQueries := func(metricsQueryRangeParams *model.QueryRangeParamsV2) ([]*model.Series, error, map[string]string) {
		var seriesList []*model.Series
		ch := make(chan channelResult, len(metricsQueryRangeParams.CompositeMetricQuery.PromQueries))
		var wg sync.WaitGroup

		for name, query := range metricsQueryRangeParams.CompositeMetricQuery.PromQueries {
			if query.Disabled {
				continue
			}
			wg.Add(1)
			go func(name string, query *model.PromQuery) {
				var seriesList []*model.Series
				defer wg.Done()
				tmpl := template.New("promql-query")
				tmpl, tmplErr := tmpl.Parse(query.Query)
				if tmplErr != nil {
					ch <- channelResult{Err: fmt.Errorf("error in parsing query-%s: %v", name, tmplErr), Name: name, Query: query.Query}
					return
				}
				var queryBuf bytes.Buffer
				tmplErr = tmpl.Execute(&queryBuf, metricsQueryRangeParams.Variables)
				if tmplErr != nil {
					ch <- channelResult{Err: fmt.Errorf("error in parsing query-%s: %v", name, tmplErr), Name: name, Query: query.Query}
					return
				}
				query.Query = queryBuf.String()
				queryModel := model.QueryRangeParams{
					Start: time.UnixMilli(metricsQueryRangeParams.Start),
					End:   time.UnixMilli(metricsQueryRangeParams.End),
					Step:  time.Duration(metricsQueryRangeParams.Step * int64(time.Second)),
					Query: query.Query,
				}
				promResult, _, err := aH.reader.GetQueryRangeResult(r.Context(), &queryModel)
				if err != nil {
					ch <- channelResult{Err: fmt.Errorf("error in query-%s: %v", name, err), Name: name, Query: query.Query}
					return
				}
				matrix, _ := promResult.Matrix()
				for _, v := range matrix {
					var s model.Series
					s.QueryName = name
					s.Labels = v.Metric.Copy().Map()
					for _, p := range v.Points {
						s.Points = append(s.Points, model.MetricPoint{Timestamp: p.T, Value: p.V})
					}
					seriesList = append(seriesList, &s)
				}
				ch <- channelResult{Series: seriesList}
			}(name, query)
		}

		wg.Wait()
		close(ch)

		var errs []error
		errQuriesByName := make(map[string]string)
		// read values from the channel
		for r := range ch {
			if r.Err != nil {
				errs = append(errs, r.Err)
				errQuriesByName[r.Name] = r.Query
				continue
			}
			seriesList = append(seriesList, r.Series...)
		}
		if len(errs) != 0 {
			return nil, fmt.Errorf("encountered multiple errors: %s", metrics.FormatErrs(errs, "\n")), errQuriesByName
		}
		return seriesList, nil, nil
	}

	var seriesList []*model.Series
	var err error
	var errQuriesByName map[string]string
	switch metricsQueryRangeParams.CompositeMetricQuery.QueryType {
	case model.QUERY_BUILDER:
		runQueries := metrics.PrepareBuilderMetricQueries(metricsQueryRangeParams, constants.SIGNOZ_TIMESERIES_TABLENAME)
		if runQueries.Err != nil {
			RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: runQueries.Err}, nil)
			return
		}
		seriesList, err, errQuriesByName = execClickHouseQueries(runQueries.Queries)

	case model.CLICKHOUSE:
		queries := make(map[string]string)
		for name, chQuery := range metricsQueryRangeParams.CompositeMetricQuery.ClickHouseQueries {
			if chQuery.Disabled {
				continue
			}
			tmpl := template.New("clickhouse-query")
			tmpl, err := tmpl.Parse(chQuery.Query)
			if err != nil {
				RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
				return
			}
			var query bytes.Buffer

			// replace go template variables
			querytemplate.AssignReservedVars(metricsQueryRangeParams)

			err = tmpl.Execute(&query, metricsQueryRangeParams.Variables)
			if err != nil {
				RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
				return
			}

			queries[name] = query.String()
		}
		seriesList, err, errQuriesByName = execClickHouseQueries(queries)
	case model.PROM:
		seriesList, err, errQuriesByName = execPromQueries(metricsQueryRangeParams)
	default:
		err = fmt.Errorf("invalid query type")
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, errQuriesByName)
		return
	}

	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}
	if metricsQueryRangeParams.CompositeMetricQuery.PanelType == model.QUERY_VALUE &&
		len(seriesList) > 1 &&
		(metricsQueryRangeParams.CompositeMetricQuery.QueryType == model.QUERY_BUILDER ||
			metricsQueryRangeParams.CompositeMetricQuery.QueryType == model.CLICKHOUSE) {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("invalid: query resulted in more than one series for value type")}, nil)
		return
	}

	type ResponseFormat struct {
		ResultType string          `json:"resultType"`
		Result     []*model.Series `json:"result"`
	}
	resp := ResponseFormat{ResultType: "matrix", Result: seriesList}
	aH.Respond(w, resp)
}

func (aH *APIHandler) listRules(w http.ResponseWriter, r *http.Request) {

	rules, err := aH.ruleManager.ListRuleStates()
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// todo(amol): need to add sorter

	aH.Respond(w, rules)
}

func (aH *APIHandler) getDashboards(w http.ResponseWriter, r *http.Request) {

	allDashboards, err := dashboards.GetDashboards()

	if err != nil {
		RespondError(w, err, nil)
		return
	}
	tagsFromReq, ok := r.URL.Query()["tags"]
	if !ok || len(tagsFromReq) == 0 || tagsFromReq[0] == "" {
		aH.Respond(w, allDashboards)
		return
	}

	tags2Dash := make(map[string][]int)
	for i := 0; i < len(allDashboards); i++ {
		tags, ok := (allDashboards)[i].Data["tags"].([]interface{})
		if !ok {
			continue
		}

		tagsArray := make([]string, len(tags))
		for i, v := range tags {
			tagsArray[i] = v.(string)
		}

		for _, tag := range tagsArray {
			tags2Dash[tag] = append(tags2Dash[tag], i)
		}

	}

	inter := make([]int, len(allDashboards))
	for i := range inter {
		inter[i] = i
	}

	for _, tag := range tagsFromReq {
		inter = Intersection(inter, tags2Dash[tag])
	}

	filteredDashboards := []dashboards.Dashboard{}
	for _, val := range inter {
		dash := (allDashboards)[val]
		filteredDashboards = append(filteredDashboards, dash)
	}

	aH.Respond(w, filteredDashboards)

}
func (aH *APIHandler) deleteDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]
	err := dashboards.DeleteDashboard(uuid)

	if err != nil {
		RespondError(w, err, nil)
		return
	}

	aH.Respond(w, nil)

}

func (aH *APIHandler) queryDashboardVars(w http.ResponseWriter, r *http.Request) {

	query := r.URL.Query().Get("query")
	if query == "" {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("query is required")}, nil)
		return
	}
	if strings.Contains(strings.ToLower(query), "alter table") {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("query shouldn't alter data")}, nil)
		return
	}
	dashboardVars, err := aH.reader.QueryDashboardVars(r.Context(), query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	aH.Respond(w, dashboardVars)
}

func (aH *APIHandler) updateDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]

	var postData map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}
	err = dashboards.IsPostDataSane(&postData)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}

	dashboard, apiError := dashboards.UpdateDashboard(uuid, postData)
	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	aH.Respond(w, dashboard)

}

func (aH *APIHandler) getDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]

	dashboard, apiError := dashboards.GetDashboard(uuid)

	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	aH.Respond(w, dashboard)

}

func (aH *APIHandler) saveAndReturn(w http.ResponseWriter, signozDashboard model.DashboardData) {
	toSave := make(map[string]interface{})
	toSave["title"] = signozDashboard.Title
	toSave["description"] = signozDashboard.Description
	toSave["tags"] = signozDashboard.Tags
	toSave["layout"] = signozDashboard.Layout
	toSave["widgets"] = signozDashboard.Widgets
	toSave["variables"] = signozDashboard.Variables

	dashboard, apiError := dashboards.CreateDashboard(toSave)
	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, dashboard)
	return
}

func (aH *APIHandler) createDashboardsTransform(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	b, err := ioutil.ReadAll(r.Body)

	var importData model.GrafanaJSON

	err = json.Unmarshal(b, &importData)
	if err == nil {
		signozDashboard := dashboards.TransformGrafanaJSONToSignoz(importData)
		aH.saveAndReturn(w, signozDashboard)
		return
	}
	RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, "Error while creating dashboard from grafana json")
}

func (aH *APIHandler) createDashboards(w http.ResponseWriter, r *http.Request) {

	var postData map[string]interface{}

	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, "Error reading request body")
		return
	}

	err = dashboards.IsPostDataSane(&postData)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, "Error reading request body")
		return
	}

	dash, apiErr := dashboards.CreateDashboard(postData)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, dash)

}

func (aH *APIHandler) testRule(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body in test rule API\n", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
	defer cancel()

	alertCount, apiRrr := aH.ruleManager.TestNotification(ctx, string(body))
	if apiRrr != nil {
		RespondError(w, apiRrr, nil)
		return
	}

	response := map[string]interface{}{
		"alertCount": alertCount,
		"message":    "notification sent",
	}
	aH.Respond(w, response)
}

func (aH *APIHandler) deleteRule(w http.ResponseWriter, r *http.Request) {

	id := mux.Vars(r)["id"]

	err := aH.ruleManager.DeleteRule(id)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, "rule successfully deleted")

}

// patchRule updates only requested changes in the rule
func (aH *APIHandler) patchRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("msg: error in getting req body of patch rule API\n", "\t error:", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	gettableRule, err := aH.ruleManager.PatchRule(string(body), id)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, gettableRule)
}

func (aH *APIHandler) editRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("msg: error in getting req body of edit rule API\n", "\t error:", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	err = aH.ruleManager.EditRule(string(body), id)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, "rule successfully edited")

}

func (aH *APIHandler) getChannel(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	channel, apiErrorObj := aH.reader.GetChannel(id)
	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}
	aH.Respond(w, channel)
}

func (aH *APIHandler) deleteChannel(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	apiErrorObj := aH.reader.DeleteChannel(id)
	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}
	aH.Respond(w, "notification channel successfully deleted")
}

func (aH *APIHandler) listChannels(w http.ResponseWriter, r *http.Request) {
	channels, apiErrorObj := aH.reader.GetChannels()
	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}
	aH.Respond(w, channels)
}

// testChannels sends test alert to all registered channels
func (aH *APIHandler) testChannel(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body of testChannel API\n", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.S().Errorf("Error in parsing req body of testChannel API\n", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	// send alert
	apiErrorObj := aH.alertManager.TestReceiver(receiver)
	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}
	aH.Respond(w, "test alert sent")
}

func (aH *APIHandler) editChannel(w http.ResponseWriter, r *http.Request) {

	id := mux.Vars(r)["id"]

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body of editChannel API\n", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.S().Errorf("Error in parsing req body of editChannel API\n", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	_, apiErrorObj := aH.reader.EditChannel(receiver, id)

	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}

	aH.Respond(w, nil)

}

func (aH *APIHandler) createChannel(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body of createChannel API\n", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.S().Errorf("Error in parsing req body of createChannel API\n", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	_, apiErrorObj := aH.reader.CreateChannel(receiver)

	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}

	aH.Respond(w, nil)

}

func (aH *APIHandler) createRule(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body for create rule API\n", err)
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	err = aH.ruleManager.CreateRule(string(body))
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	aH.Respond(w, "rule successfully added")

}

func (aH *APIHandler) queryRangeMetricsFromClickhouse(w http.ResponseWriter, r *http.Request) {

}
func (aH *APIHandler) queryRangeMetrics(w http.ResponseWriter, r *http.Request) {

	query, apiErrorObj := parseQueryRangeRequest(r)

	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}

	// zap.S().Info(query, apiError)

	ctx := r.Context()
	if to := r.FormValue("timeout"); to != "" {
		var cancel context.CancelFunc
		timeout, err := parseMetricsDuration(to)
		if aH.HandleError(w, err, http.StatusBadRequest) {
			return
		}

		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	res, qs, apiError := aH.reader.GetQueryRangeResult(ctx, query)

	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	if res.Err != nil {
		zap.S().Error(res.Err)
	}

	if res.Err != nil {
		switch res.Err.(type) {
		case promql.ErrQueryCanceled:
			RespondError(w, &model.ApiError{model.ErrorCanceled, res.Err}, nil)
		case promql.ErrQueryTimeout:
			RespondError(w, &model.ApiError{model.ErrorTimeout, res.Err}, nil)
		}
		RespondError(w, &model.ApiError{model.ErrorExec, res.Err}, nil)
	}

	response_data := &model.QueryData{
		ResultType: res.Value.Type(),
		Result:     res.Value,
		Stats:      qs,
	}

	aH.Respond(w, response_data)

}

func (aH *APIHandler) queryMetrics(w http.ResponseWriter, r *http.Request) {

	queryParams, apiErrorObj := parseInstantQueryMetricsRequest(r)

	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}

	// zap.S().Info(query, apiError)

	ctx := r.Context()
	if to := r.FormValue("timeout"); to != "" {
		var cancel context.CancelFunc
		timeout, err := parseMetricsDuration(to)
		if aH.HandleError(w, err, http.StatusBadRequest) {
			return
		}

		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	res, qs, apiError := aH.reader.GetInstantQueryMetricsResult(ctx, queryParams)

	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	if res.Err != nil {
		zap.S().Error(res.Err)
	}

	if res.Err != nil {
		switch res.Err.(type) {
		case promql.ErrQueryCanceled:
			RespondError(w, &model.ApiError{model.ErrorCanceled, res.Err}, nil)
		case promql.ErrQueryTimeout:
			RespondError(w, &model.ApiError{model.ErrorTimeout, res.Err}, nil)
		}
		RespondError(w, &model.ApiError{model.ErrorExec, res.Err}, nil)
	}

	response_data := &model.QueryData{
		ResultType: res.Value.Type(),
		Result:     res.Value,
		Stats:      qs,
	}

	aH.Respond(w, response_data)

}

func (aH *APIHandler) submitFeedback(w http.ResponseWriter, r *http.Request) {

	var postData map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}

	message, ok := postData["message"]
	if !ok {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("message not present in request body")}, "Error reading message from request body")
		return
	}
	messageStr := fmt.Sprintf("%s", message)
	if len(messageStr) == 0 {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("empty message in request body")}, "empty message in request body")
		return
	}

	email := postData["email"]

	data := map[string]interface{}{
		"email":   email,
		"message": message,
	}
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_INPRODUCT_FEEDBACK, data)

}

func (aH *APIHandler) getTopOperations(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetTopOperationsRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetTopOperations(r.Context(), query)

	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) getUsage(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetUsageRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := aH.reader.GetUsage(r.Context(), query)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) getServiceOverview(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServiceOverviewRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetServiceOverview(r.Context(), query)
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) getServicesTopLevelOps(w http.ResponseWriter, r *http.Request) {

	result, apiErr := aH.reader.GetTopLevelOperations(r.Context())
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getServices(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServicesRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetServices(r.Context(), query)
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	data := map[string]interface{}{
		"number": len(*result),
	}

	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_NUMBER_OF_SERVICES, data)

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) dependencyGraph(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServicesRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := aH.reader.GetDependencyGraph(r.Context(), query)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getServicesList(w http.ResponseWriter, r *http.Request) {

	result, err := aH.reader.GetServicesList(r.Context())
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) SearchTraces(w http.ResponseWriter, r *http.Request) {

	traceId, spanId, levelUpInt, levelDownInt, err := ParseSearchTracesParams(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading params")
		return
	}

	result, err := aH.reader.SearchTraces(r.Context(), traceId, spanId, levelUpInt, levelDownInt, 0, nil)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) listErrors(w http.ResponseWriter, r *http.Request) {

	query, err := parseListErrorsRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}
	result, apiErr := aH.reader.ListErrors(r.Context(), query)
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) countErrors(w http.ResponseWriter, r *http.Request) {

	query, err := parseCountErrorsRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}
	result, apiErr := aH.reader.CountErrors(r.Context(), query)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getErrorFromErrorID(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetErrorRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}
	result, apiErr := aH.reader.GetErrorFromErrorID(r.Context(), query)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getNextPrevErrorIDs(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetErrorRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}
	result, apiErr := aH.reader.GetNextPrevErrorIDs(r.Context(), query)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getErrorFromGroupID(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetErrorRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}
	result, apiErr := aH.reader.GetErrorFromGroupID(r.Context(), query)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getSpanFilters(w http.ResponseWriter, r *http.Request) {

	query, err := parseSpanFilterRequestBody(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetSpanFilters(r.Context(), query)

	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getFilteredSpans(w http.ResponseWriter, r *http.Request) {

	query, err := parseFilteredSpansRequest(r, aH)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetFilteredSpans(r.Context(), query)

	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getFilteredSpanAggregates(w http.ResponseWriter, r *http.Request) {

	query, err := parseFilteredSpanAggregatesRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetFilteredSpansAggregates(r.Context(), query)

	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getTagFilters(w http.ResponseWriter, r *http.Request) {

	query, err := parseTagFilterRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetTagFilters(r.Context(), query)

	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getTagValues(w http.ResponseWriter, r *http.Request) {

	query, err := parseTagValueRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetTagValues(r.Context(), query)

	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) setTTL(w http.ResponseWriter, r *http.Request) {
	ttlParams, err := parseTTLParams(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	// Context is not used here as TTL is long duration DB operation
	result, apiErr := aH.reader.SetTTL(context.Background(), ttlParams)
	if apiErr != nil {
		if apiErr.Typ == model.ErrorConflict {
			aH.HandleError(w, apiErr.Err, http.StatusConflict)
		} else {
			aH.HandleError(w, apiErr.Err, http.StatusInternalServerError)
		}
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) getTTL(w http.ResponseWriter, r *http.Request) {
	ttlParams, err := parseGetTTL(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetTTL(r.Context(), ttlParams)
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getDisks(w http.ResponseWriter, r *http.Request) {
	result, apiErr := aH.reader.GetDisks(context.Background())
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getVersion(w http.ResponseWriter, r *http.Request) {
	version := version.GetVersion()
	aH.WriteJSON(w, r, map[string]string{"version": version, "ee": "N"})
}

func (aH *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet := aH.FF().GetFeatureFlags()
	aH.Respond(w, featureSet)
}

func (aH *APIHandler) FF() interfaces.FeatureLookup {
	return aH.featureFlags
}

func (aH *APIHandler) CheckFeature(f string) bool {
	err := aH.FF().CheckFeature(f)
	return err == nil
}

func (aH *APIHandler) getConfigs(w http.ResponseWriter, r *http.Request) {

	configs, err := signozio.FetchDynamicConfigs()
	if err != nil {
		aH.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	aH.Respond(w, configs)
}

// inviteUser is used to invite a user. It is used by an admin api.
func (aH *APIHandler) inviteUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseInviteRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	ctx := auth.AttachJwtToContext(context.Background(), r)
	resp, err := auth.Invite(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}
	aH.WriteJSON(w, r, resp)
}

// getInvite returns the invite object details for the given invite token. We do not need to
// protect this API because invite token itself is meant to be private.
func (aH *APIHandler) getInvite(w http.ResponseWriter, r *http.Request) {
	token := mux.Vars(r)["token"]

	resp, err := auth.GetInvite(context.Background(), token)
	if err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorNotFound}, nil)
		return
	}
	aH.WriteJSON(w, r, resp)
}

// revokeInvite is used to revoke an invite.
func (aH *APIHandler) revokeInvite(w http.ResponseWriter, r *http.Request) {
	email := mux.Vars(r)["email"]

	ctx := auth.AttachJwtToContext(context.Background(), r)
	if err := auth.RevokeInvite(ctx, email); err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}
	aH.WriteJSON(w, r, map[string]string{"data": "invite revoked successfully"})
}

// listPendingInvites is used to list the pending invites.
func (aH *APIHandler) listPendingInvites(w http.ResponseWriter, r *http.Request) {

	ctx := context.Background()
	invites, err := dao.DB().GetInvites(ctx)
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	// TODO(Ahsan): Querying org name based on orgId for each invite is not a good idea. Either
	// we should include org name field in the invite table, or do a join query.
	var resp []*model.InvitationResponseObject
	for _, inv := range invites {

		org, apiErr := dao.DB().GetOrg(ctx, inv.OrgId)
		if apiErr != nil {
			RespondError(w, apiErr, nil)
		}
		resp = append(resp, &model.InvitationResponseObject{
			Name:         inv.Name,
			Email:        inv.Email,
			Token:        inv.Token,
			CreatedAt:    inv.CreatedAt,
			Role:         inv.Role,
			Organization: org.Name,
		})
	}
	aH.WriteJSON(w, r, resp)
}

// Register extends registerUser for non-internal packages
func (aH *APIHandler) Register(w http.ResponseWriter, r *http.Request) {
	aH.registerUser(w, r)
}

func (aH *APIHandler) registerUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseRegisterRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	_, apiErr := auth.Register(context.Background(), req)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, nil)
}

func (aH *APIHandler) loginUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseLoginRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	// c, err := r.Cookie("refresh-token")
	// if err != nil {
	// 	if err != http.ErrNoCookie {
	// 		w.WriteHeader(http.StatusBadRequest)
	// 		return
	// 	}
	// }

	// if c != nil {
	// 	req.RefreshToken = c.Value
	// }

	resp, err := auth.Login(context.Background(), req)
	if aH.HandleError(w, err, http.StatusUnauthorized) {
		return
	}

	// http.SetCookie(w, &http.Cookie{
	// 	Name:     "refresh-token",
	// 	Value:    resp.RefreshJwt,
	// 	Expires:  time.Unix(resp.RefreshJwtExpiry, 0),
	// 	HttpOnly: true,
	// })

	aH.WriteJSON(w, r, resp)
}

func (aH *APIHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	users, err := dao.DB().GetUsers(context.Background())
	if err != nil {
		zap.S().Debugf("[listUsers] Failed to query list of users, err: %v", err)
		RespondError(w, err, nil)
		return
	}
	// mask the password hash
	for i := range users {
		users[i].Password = ""
	}
	aH.WriteJSON(w, r, users)
}

func (aH *APIHandler) getUser(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	ctx := context.Background()
	user, err := dao.DB().GetUser(ctx, id)
	if err != nil {
		zap.S().Debugf("[getUser] Failed to query user, err: %v", err)
		RespondError(w, err, "Failed to get user")
		return
	}
	if user == nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("User not found"),
		}, nil)
		return
	}

	// No need to send password hash for the user object.
	user.Password = ""
	aH.WriteJSON(w, r, user)
}

// editUser only changes the user's Name and ProfilePictureURL. It is intentionally designed
// to not support update of orgId, Password, createdAt for the sucurity reasons.
func (aH *APIHandler) editUser(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	update, err := parseUserRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	ctx := context.Background()
	old, apiErr := dao.DB().GetUser(ctx, id)
	if apiErr != nil {
		zap.S().Debugf("[editUser] Failed to query user, err: %v", err)
		RespondError(w, apiErr, nil)
		return
	}

	if len(update.Name) > 0 {
		old.Name = update.Name
	}
	if len(update.ProfilePirctureURL) > 0 {
		old.ProfilePirctureURL = update.ProfilePirctureURL
	}

	_, apiErr = dao.DB().EditUser(ctx, &model.User{
		Id:                 old.Id,
		Name:               old.Name,
		OrgId:              old.OrgId,
		Email:              old.Email,
		Password:           old.Password,
		CreatedAt:          old.CreatedAt,
		ProfilePirctureURL: old.ProfilePirctureURL,
	})
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}
	aH.WriteJSON(w, r, map[string]string{"data": "user updated successfully"})
}

func (aH *APIHandler) deleteUser(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	// Query for the user's group, and the admin's group. If the user belongs to the admin group
	// and is the last user then don't let the deletion happen. Otherwise, the system will become
	// admin less and hence inaccessible.
	ctx := context.Background()
	user, apiErr := dao.DB().GetUser(ctx, id)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to get user's group")
		return
	}

	if user == nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorNotFound,
			Err: errors.New("User not found"),
		}, nil)
		return
	}

	adminGroup, apiErr := dao.DB().GetGroupByName(ctx, constants.AdminGroup)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to get admin group")
		return
	}
	adminUsers, apiErr := dao.DB().GetUsersByGroup(ctx, adminGroup.Id)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to get admin group users")
		return
	}

	if user.GroupId == adminGroup.Id && len(adminUsers) == 1 {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("cannot delete the last admin user")}, nil)
		return
	}

	err := dao.DB().DeleteUser(ctx, id)
	if err != nil {
		RespondError(w, err, "Failed to delete user")
		return
	}
	aH.WriteJSON(w, r, map[string]string{"data": "user deleted successfully"})
}

func (aH *APIHandler) getRole(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	user, err := dao.DB().GetUser(context.Background(), id)
	if err != nil {
		RespondError(w, err, "Failed to get user's group")
		return
	}
	if user == nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorNotFound,
			Err: errors.New("No user found"),
		}, nil)
		return
	}
	group, err := dao.DB().GetGroup(context.Background(), user.GroupId)
	if err != nil {
		RespondError(w, err, "Failed to get group")
		return
	}

	aH.WriteJSON(w, r, &model.UserRole{UserId: id, GroupName: group.Name})
}

func (aH *APIHandler) editRole(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	req, err := parseUserRoleRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	ctx := context.Background()
	newGroup, apiErr := dao.DB().GetGroupByName(ctx, req.GroupName)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to get user's group")
		return
	}

	if newGroup == nil {
		RespondError(w, apiErr, "Specified group is not present")
		return
	}

	user, apiErr := dao.DB().GetUser(ctx, id)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch user group")
		return
	}

	// Make sure that the request is not demoting the last admin user.
	if user.GroupId == auth.AuthCacheObj.AdminGroupId {
		adminUsers, apiErr := dao.DB().GetUsersByGroup(ctx, auth.AuthCacheObj.AdminGroupId)
		if apiErr != nil {
			RespondError(w, apiErr, "Failed to fetch adminUsers")
			return
		}

		if len(adminUsers) == 1 {
			RespondError(w, &model.ApiError{
				Err: errors.New("Cannot demote the last admin"),
				Typ: model.ErrorInternal}, nil)
			return
		}
	}

	apiErr = dao.DB().UpdateUserGroup(context.Background(), user.Id, newGroup.Id)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to add user to group")
		return
	}
	aH.WriteJSON(w, r, map[string]string{"data": "user group updated successfully"})
}

func (aH *APIHandler) getOrgs(w http.ResponseWriter, r *http.Request) {
	orgs, apiErr := dao.DB().GetOrgs(context.Background())
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch orgs from the DB")
		return
	}
	aH.WriteJSON(w, r, orgs)
}

func (aH *APIHandler) getOrg(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	org, apiErr := dao.DB().GetOrg(context.Background(), id)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch org from the DB")
		return
	}
	aH.WriteJSON(w, r, org)
}

func (aH *APIHandler) editOrg(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	req, err := parseEditOrgRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	req.Id = id
	if apiErr := dao.DB().EditOrg(context.Background(), req); apiErr != nil {
		RespondError(w, apiErr, "Failed to update org in the DB")
		return
	}

	data := map[string]interface{}{
		"hasOptedUpdates":  req.HasOptedUpdates,
		"isAnonymous":      req.IsAnonymous,
		"organizationName": req.Name,
	}

	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_ORG_SETTINGS, data)

	aH.WriteJSON(w, r, map[string]string{"data": "org updated successfully"})
}

func (aH *APIHandler) getOrgUsers(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	users, apiErr := dao.DB().GetUsersByOrg(context.Background(), id)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch org users from the DB")
		return
	}
	// mask the password hash
	for i := range users {
		users[i].Password = ""
	}
	aH.WriteJSON(w, r, users)
}

func (aH *APIHandler) getResetPasswordToken(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	resp, err := auth.CreateResetPasswordToken(context.Background(), id)
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: err}, "Failed to create reset token entry in the DB")
		return
	}
	aH.WriteJSON(w, r, resp)
}

func (aH *APIHandler) resetPassword(w http.ResponseWriter, r *http.Request) {
	req, err := parseResetPasswordRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	if err := auth.ResetPassword(context.Background(), req); err != nil {
		zap.S().Debugf("resetPassword failed, err: %v\n", err)
		if aH.HandleError(w, err, http.StatusInternalServerError) {
			return
		}

	}
	aH.WriteJSON(w, r, map[string]string{"data": "password reset successfully"})
}

func (aH *APIHandler) changePassword(w http.ResponseWriter, r *http.Request) {
	req, err := parseChangePasswordRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	if err := auth.ChangePassword(context.Background(), req); err != nil {
		if aH.HandleError(w, err, http.StatusInternalServerError) {
			return
		}

	}
	aH.WriteJSON(w, r, map[string]string{"data": "password changed successfully"})
}

// func (aH *APIHandler) getApplicationPercentiles(w http.ResponseWriter, r *http.Request) {
// 	// vars := mux.Vars(r)

// 	query, err := parseApplicationPercentileRequest(r)
// 	if aH.HandleError(w, err, http.StatusBadRequest) {
// 		return
// 	}

// 	result, err := aH.reader.GetApplicationPercentiles(context.Background(), query)
// 	if aH.HandleError(w, err, http.StatusBadRequest) {
// 		return
// 	}
// 	aH.WriteJSON(w, r, result)
// }

func (aH *APIHandler) HandleError(w http.ResponseWriter, err error, statusCode int) bool {
	if err == nil {
		return false
	}
	if statusCode == http.StatusInternalServerError {
		zap.S().Error("HTTP handler, Internal Server Error", zap.Error(err))
	}
	structuredResp := structuredResponse{
		Errors: []structuredError{
			{
				Code: statusCode,
				Msg:  err.Error(),
			},
		},
	}
	resp, _ := json.Marshal(&structuredResp)
	http.Error(w, string(resp), statusCode)
	return true
}

func (aH *APIHandler) WriteJSON(w http.ResponseWriter, r *http.Request, response interface{}) {
	marshall := json.Marshal
	if prettyPrint := r.FormValue("pretty"); prettyPrint != "" && prettyPrint != "false" {
		marshall = func(v interface{}) ([]byte, error) {
			return json.MarshalIndent(v, "", "    ")
		}
	}
	resp, _ := marshall(response)
	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

// logs
func (aH *APIHandler) RegisterLogsRoutes(router *mux.Router) {
	subRouter := router.PathPrefix("/api/v1/logs").Subrouter()
	subRouter.HandleFunc("", ViewAccess(aH.getLogs)).Methods(http.MethodGet)
	subRouter.HandleFunc("/tail", ViewAccess(aH.tailLogs)).Methods(http.MethodGet)
	subRouter.HandleFunc("/fields", ViewAccess(aH.logFields)).Methods(http.MethodGet)
	subRouter.HandleFunc("/fields", EditAccess(aH.logFieldUpdate)).Methods(http.MethodPost)
	subRouter.HandleFunc("/aggregate", ViewAccess(aH.logAggregate)).Methods(http.MethodGet)
}

func (aH *APIHandler) logFields(w http.ResponseWriter, r *http.Request) {
	fields, apiErr := aH.reader.GetLogFields(r.Context())
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch fields from the DB")
		return
	}
	aH.WriteJSON(w, r, fields)
}

func (aH *APIHandler) logFieldUpdate(w http.ResponseWriter, r *http.Request) {
	field := model.UpdateField{}
	if err := json.NewDecoder(r.Body).Decode(&field); err != nil {
		apiErr := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErr, "Failed to decode payload")
		return
	}

	err := logs.ValidateUpdateFieldPayload(&field)
	if err != nil {
		apiErr := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErr, "Incorrect payload")
		return
	}

	apiErr := aH.reader.UpdateLogField(r.Context(), &field)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to update filed in the DB")
		return
	}
	aH.WriteJSON(w, r, field)
}

func (aH *APIHandler) getLogs(w http.ResponseWriter, r *http.Request) {
	params, err := logs.ParseLogFilterParams(r)
	if err != nil {
		apiErr := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErr, "Incorrect params")
		return
	}

	res, apiErr := aH.reader.GetLogs(r.Context(), params)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch logs from the DB")
		return
	}
	aH.WriteJSON(w, r, map[string]interface{}{"results": res})
}

func (aH *APIHandler) tailLogs(w http.ResponseWriter, r *http.Request) {
	params, err := logs.ParseLogFilterParams(r)
	if err != nil {
		apiErr := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErr, "Incorrect params")
		return
	}

	// create the client
	client := &model.LogsTailClient{Name: r.RemoteAddr, Logs: make(chan *model.GetLogsResponse, 1000), Done: make(chan *bool), Error: make(chan error), Filter: *params}
	go aH.reader.TailLogs(r.Context(), client)

	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(200)

	flusher, ok := w.(http.Flusher)
	if !ok {
		err := model.ApiError{Typ: model.ErrorStreamingNotSupported, Err: nil}
		RespondError(w, &err, "streaming is not supported")
		return
	}

	for {
		select {
		case log := <-client.Logs:
			var buf bytes.Buffer
			enc := json.NewEncoder(&buf)
			enc.Encode(log)
			fmt.Fprintf(w, "data: %v\n\n", buf.String())
			flusher.Flush()
		case <-client.Done:
			zap.S().Debug("done!")
			return
		case err := <-client.Error:
			zap.S().Error("error occured!", err)
			return
		}
	}
}

func (aH *APIHandler) logAggregate(w http.ResponseWriter, r *http.Request) {
	params, err := logs.ParseLogAggregateParams(r)
	if err != nil {
		apiErr := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErr, "Incorrect params")
		return
	}

	res, apiErr := aH.reader.AggregateLogs(r.Context(), params)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch logs aggregate from the DB")
		return
	}
	aH.WriteJSON(w, r, res)
}
