package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/SigNoz/govaluate"
	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	_ "github.com/mattn/go-sqlite3"
	"github.com/prometheus/prometheus/promql"

	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/app/explorer"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/app/logs"
	logsv3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	metricsv3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/app/parser"
	"go.signoz.io/signoz/pkg/query-service/app/querier"
	querierV2 "go.signoz.io/signoz/pkg/query-service/app/querier/v2"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	querytemplate "go.signoz.io/signoz/pkg/query-service/utils/queryTemplate"

	"go.uber.org/multierr"
	"go.uber.org/zap"

	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/dao"
	am "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	signozio "go.signoz.io/signoz/pkg/query-service/integrations/signozio"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/query-service/version"
)

type status string

const (
	statusSuccess       status = "success"
	statusError         status = "error"
	defaultFluxInterval        = 5 * time.Minute
)

// NewRouter creates and configures a Gorilla Router.
func NewRouter() *mux.Router {
	return mux.NewRouter().UseEncodedPath()
}

// APIHandler implements the query service public API by registering routes at httpPrefix
type APIHandler struct {
	// queryService *querysvc.QueryService
	// queryParser  queryParser
	basePath          string
	apiPrefix         string
	reader            interfaces.Reader
	skipConfig        *model.SkipConfig
	appDao            dao.ModelDao
	alertManager      am.Manager
	ruleManager       *rules.Manager
	featureFlags      interfaces.FeatureLookup
	ready             func(http.HandlerFunc) http.HandlerFunc
	querier           interfaces.Querier
	querierV2         interfaces.Querier
	queryBuilder      *queryBuilder.QueryBuilder
	preferDelta       bool
	preferSpanMetrics bool

	// temporalityMap is a map of metric name to temporality
	// to avoid fetching temporality for the same metric multiple times
	// querying the v4 table on low cardinal temporality column
	// should be fast but we can still avoid the query if we have the data in memory
	temporalityMap map[string]map[v3.Temporality]bool

	maxIdleConns int
	maxOpenConns int
	dialTimeout  time.Duration

	IntegrationsController *integrations.Controller

	LogsParsingPipelineController *logparsingpipeline.LogParsingPipelineController

	// SetupCompleted indicates if SigNoz is ready for general use.
	// at the moment, we mark the app ready when the first user
	// is registers.
	SetupCompleted bool
}

type APIHandlerOpts struct {

	// business data reader e.g. clickhouse
	Reader interfaces.Reader

	SkipConfig *model.SkipConfig

	PerferDelta       bool
	PreferSpanMetrics bool

	MaxIdleConns int
	MaxOpenConns int
	DialTimeout  time.Duration

	// dao layer to perform crud on app objects like dashboard, alerts etc
	AppDao dao.ModelDao

	// rule manager handles rule crud operations
	RuleManager *rules.Manager

	// feature flags querier
	FeatureFlags interfaces.FeatureLookup

	// Integrations
	IntegrationsController *integrations.Controller

	// Log parsing pipelines
	LogsParsingPipelineController *logparsingpipeline.LogParsingPipelineController

	// cache
	Cache cache.Cache

	// Querier Influx Interval
	FluxInterval time.Duration
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(opts APIHandlerOpts) (*APIHandler, error) {

	alertManager, err := am.New("")
	if err != nil {
		return nil, err
	}

	querierOpts := querier.QuerierOptions{
		Reader:        opts.Reader,
		Cache:         opts.Cache,
		KeyGenerator:  queryBuilder.NewKeyGenerator(),
		FluxInterval:  opts.FluxInterval,
		FeatureLookup: opts.FeatureFlags,
	}

	querierOptsV2 := querierV2.QuerierOptions{
		Reader:        opts.Reader,
		Cache:         opts.Cache,
		KeyGenerator:  queryBuilder.NewKeyGenerator(),
		FluxInterval:  opts.FluxInterval,
		FeatureLookup: opts.FeatureFlags,
	}

	querier := querier.NewQuerier(querierOpts)
	querierv2 := querierV2.NewQuerier(querierOptsV2)

	aH := &APIHandler{
		reader:                        opts.Reader,
		appDao:                        opts.AppDao,
		skipConfig:                    opts.SkipConfig,
		preferDelta:                   opts.PerferDelta,
		preferSpanMetrics:             opts.PreferSpanMetrics,
		temporalityMap:                make(map[string]map[v3.Temporality]bool),
		maxIdleConns:                  opts.MaxIdleConns,
		maxOpenConns:                  opts.MaxOpenConns,
		dialTimeout:                   opts.DialTimeout,
		alertManager:                  alertManager,
		ruleManager:                   opts.RuleManager,
		featureFlags:                  opts.FeatureFlags,
		IntegrationsController:        opts.IntegrationsController,
		LogsParsingPipelineController: opts.LogsParsingPipelineController,
		querier:                       querier,
		querierV2:                     querierv2,
	}

	builderOpts := queryBuilder.QueryBuilderOptions{
		BuildMetricQuery: metricsv3.PrepareMetricQuery,
		BuildTraceQuery:  tracesV3.PrepareTracesQuery,
		BuildLogQuery:    logsv3.PrepareLogsQuery,
	}
	aH.queryBuilder = queryBuilder.NewQueryBuilder(builderOpts, aH.featureFlags)

	aH.ready = aH.testReady

	dashboards.LoadDashboardFiles(aH.featureFlags)
	// if errReadingDashboards != nil {
	// 	return nil, errReadingDashboards
	// }

	// check if at least one user is created
	hasUsers, err := aH.appDao.GetUsersWithOpts(context.Background(), 1)
	if err.Error() != "" {
		// raise warning but no panic as this is a recoverable condition
		zap.L().Warn("unexpected error while fetch user count while initializing base api handler", zap.Error(err))
	}
	if len(hasUsers) != 0 {
		// first user is already created, we can mark the app ready for general use.
		// this means, we disable self-registration and expect new users
		// to signup signoz through invite link only.
		aH.SetupCompleted = true
	}
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

type ApiResponse struct {
	Status    status          `json:"status"`
	Data      interface{}     `json:"data,omitempty"`
	ErrorType model.ErrorType `json:"errorType,omitempty"`
	Error     string          `json:"error,omitempty"`
}

func RespondError(w http.ResponseWriter, apiErr model.BaseApiError, data interface{}) {
	json := jsoniter.ConfigCompatibleWithStandardLibrary
	b, err := json.Marshal(&ApiResponse{
		Status:    statusError,
		ErrorType: apiErr.Type(),
		Error:     apiErr.Error(),
		Data:      data,
	})
	if err != nil {
		zap.L().Error("error marshalling json response", zap.Error(err))
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
		zap.L().Error("error writing response", zap.Int("bytesWritten", n), zap.Error(err))
	}
}

func writeHttpResponse(w http.ResponseWriter, data interface{}) {
	json := jsoniter.ConfigCompatibleWithStandardLibrary
	b, err := json.Marshal(&ApiResponse{
		Status: statusSuccess,
		Data:   data,
	})
	if err != nil {
		zap.L().Error("error marshalling json response", zap.Error(err))
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if n, err := w.Write(b); err != nil {
		zap.L().Error("error writing response", zap.Int("bytesWritten", n), zap.Error(err))
	}
}

func (aH *APIHandler) RegisterMetricsRoutes(router *mux.Router, am *AuthMiddleware) {
	subRouter := router.PathPrefix("/api/v2/metrics").Subrouter()
	subRouter.HandleFunc("/query_range", am.ViewAccess(aH.QueryRangeMetricsV2)).Methods(http.MethodPost)
	subRouter.HandleFunc("/autocomplete/list", am.ViewAccess(aH.metricAutocompleteMetricName)).Methods(http.MethodGet)
	subRouter.HandleFunc("/autocomplete/tagKey", am.ViewAccess(aH.metricAutocompleteTagKey)).Methods(http.MethodGet)
	subRouter.HandleFunc("/autocomplete/tagValue", am.ViewAccess(aH.metricAutocompleteTagValue)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterQueryRangeV3Routes(router *mux.Router, am *AuthMiddleware) {
	subRouter := router.PathPrefix("/api/v3").Subrouter()
	subRouter.HandleFunc("/autocomplete/aggregate_attributes", am.ViewAccess(
		withCacheControl(AutoCompleteCacheControlAge, aH.autocompleteAggregateAttributes))).Methods(http.MethodGet)
	subRouter.HandleFunc("/autocomplete/attribute_keys", am.ViewAccess(
		withCacheControl(AutoCompleteCacheControlAge, aH.autoCompleteAttributeKeys))).Methods(http.MethodGet)
	subRouter.HandleFunc("/autocomplete/attribute_values", am.ViewAccess(
		withCacheControl(AutoCompleteCacheControlAge, aH.autoCompleteAttributeValues))).Methods(http.MethodGet)
	subRouter.HandleFunc("/query_range", am.ViewAccess(aH.QueryRangeV3)).Methods(http.MethodPost)
	subRouter.HandleFunc("/query_range/format", am.ViewAccess(aH.QueryRangeV3Format)).Methods(http.MethodPost)

	// live logs
	subRouter.HandleFunc("/logs/livetail", am.ViewAccess(aH.liveTailLogs)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterQueryRangeV4Routes(router *mux.Router, am *AuthMiddleware) {
	subRouter := router.PathPrefix("/api/v4").Subrouter()
	subRouter.HandleFunc("/query_range", am.ViewAccess(aH.QueryRangeV4)).Methods(http.MethodPost)
	subRouter.HandleFunc("/metric/metric_metadata", am.ViewAccess(aH.getMetricMetadata)).Methods(http.MethodGet)
}

func (aH *APIHandler) Respond(w http.ResponseWriter, data interface{}) {
	writeHttpResponse(w, data)
}

// RegisterPrivateRoutes registers routes for this handler on the given router
func (aH *APIHandler) RegisterPrivateRoutes(router *mux.Router) {
	router.HandleFunc("/api/v1/channels", aH.listChannels).Methods(http.MethodGet)
}

// RegisterRoutes registers routes for this handler on the given router
func (aH *APIHandler) RegisterRoutes(router *mux.Router, am *AuthMiddleware) {
	router.HandleFunc("/api/v1/query_range", am.ViewAccess(aH.queryRangeMetrics)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/query", am.ViewAccess(aH.queryMetrics)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels", am.ViewAccess(aH.listChannels)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", am.ViewAccess(aH.getChannel)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", am.AdminAccess(aH.editChannel)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/channels/{id}", am.AdminAccess(aH.deleteChannel)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/channels", am.EditAccess(aH.createChannel)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/testChannel", am.EditAccess(aH.testChannel)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/alerts", am.ViewAccess(aH.getAlerts)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/rules", am.ViewAccess(aH.listRules)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rules/{id}", am.ViewAccess(aH.getRule)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rules", am.EditAccess(aH.createRule)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/rules/{id}", am.EditAccess(aH.editRule)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/rules/{id}", am.EditAccess(aH.deleteRule)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/rules/{id}", am.EditAccess(aH.patchRule)).Methods(http.MethodPatch)
	router.HandleFunc("/api/v1/testRule", am.EditAccess(aH.testRule)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/dashboards", am.ViewAccess(aH.getDashboards)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards", am.EditAccess(aH.createDashboards)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/dashboards/grafana", am.EditAccess(aH.createDashboardsTransform)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/dashboards/{uuid}", am.ViewAccess(aH.getDashboard)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards/{uuid}", am.EditAccess(aH.updateDashboard)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/dashboards/{uuid}", am.EditAccess(aH.deleteDashboard)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/variables/query", am.ViewAccess(aH.queryDashboardVars)).Methods(http.MethodGet)
	router.HandleFunc("/api/v2/variables/query", am.ViewAccess(aH.queryDashboardVarsV2)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/explorer/views", am.ViewAccess(aH.getSavedViews)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/explorer/views", am.EditAccess(aH.createSavedViews)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.ViewAccess(aH.getSavedView)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.EditAccess(aH.updateSavedView)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.EditAccess(aH.deleteSavedView)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/feedback", am.OpenAccess(aH.submitFeedback)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/events", am.ViewAccess(aH.registerEvent)).Methods(http.MethodPost)

	// router.HandleFunc("/api/v1/get_percentiles", aH.getApplicationPercentiles).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/services", am.ViewAccess(aH.getServices)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/services/list", am.ViewAccess(aH.getServicesList)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/overview", am.ViewAccess(aH.getServiceOverview)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/service/top_operations", am.ViewAccess(aH.getTopOperations)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/service/top_level_operations", am.ViewAccess(aH.getServicesTopLevelOps)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/traces/{traceId}", am.ViewAccess(aH.SearchTraces)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/usage", am.ViewAccess(aH.getUsage)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dependency_graph", am.ViewAccess(aH.dependencyGraph)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/ttl", am.AdminAccess(aH.setTTL)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/ttl", am.ViewAccess(aH.getTTL)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/settings/apdex", am.AdminAccess(aH.setApdexSettings)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/apdex", am.ViewAccess(aH.getApdexSettings)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/settings/ingestion_key", am.AdminAccess(aH.insertIngestionKey)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/ingestion_key", am.ViewAccess(aH.getIngestionKeys)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/metric_meta", am.ViewAccess(aH.getLatencyMetricMetadata)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/version", am.OpenAccess(aH.getVersion)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/featureFlags", am.OpenAccess(aH.getFeatureFlags)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/configs", am.OpenAccess(aH.getConfigs)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/health", am.OpenAccess(aH.getHealth)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/getSpanFilters", am.ViewAccess(aH.getSpanFilters)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getTagFilters", am.ViewAccess(aH.getTagFilters)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getFilteredSpans", am.ViewAccess(aH.getFilteredSpans)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getFilteredSpans/aggregates", am.ViewAccess(aH.getFilteredSpanAggregates)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getTagValues", am.ViewAccess(aH.getTagValues)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/listErrors", am.ViewAccess(aH.listErrors)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/countErrors", am.ViewAccess(aH.countErrors)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/errorFromErrorID", am.ViewAccess(aH.getErrorFromErrorID)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/errorFromGroupID", am.ViewAccess(aH.getErrorFromGroupID)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/nextPrevErrorIDs", am.ViewAccess(aH.getNextPrevErrorIDs)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/disks", am.ViewAccess(aH.getDisks)).Methods(http.MethodGet)

	// === Authentication APIs ===
	router.HandleFunc("/api/v1/invite", am.AdminAccess(aH.inviteUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/invite/{token}", am.OpenAccess(aH.getInvite)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/invite/{email}", am.AdminAccess(aH.revokeInvite)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/invite", am.AdminAccess(aH.listPendingInvites)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/register", am.OpenAccess(aH.registerUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/login", am.OpenAccess(aH.loginUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/loginPrecheck", am.OpenAccess(aH.precheckLogin)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/user", am.AdminAccess(aH.listUsers)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/{id}", am.SelfAccess(aH.getUser)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/{id}", am.SelfAccess(aH.editUser)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/user/{id}", am.AdminAccess(aH.deleteUser)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/user/{id}/flags", am.SelfAccess(aH.patchUserFlag)).Methods(http.MethodPatch)

	router.HandleFunc("/api/v1/rbac/role/{id}", am.SelfAccess(aH.getRole)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rbac/role/{id}", am.AdminAccess(aH.editRole)).Methods(http.MethodPut)

	router.HandleFunc("/api/v1/org", am.AdminAccess(aH.getOrgs)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/org/{id}", am.AdminAccess(aH.getOrg)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/org/{id}", am.AdminAccess(aH.editOrg)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/orgUsers/{id}", am.AdminAccess(aH.getOrgUsers)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/getResetPasswordToken/{id}", am.AdminAccess(aH.getResetPasswordToken)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/resetPassword", am.OpenAccess(aH.resetPassword)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/changePassword/{id}", am.SelfAccess(aH.changePassword)).Methods(http.MethodPost)
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
	ruleResponse, err := aH.ruleManager.GetRule(r.Context(), id)
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

func (aH *APIHandler) addTemporality(ctx context.Context, qp *v3.QueryRangeParamsV3) error {

	metricNames := make([]string, 0)
	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)
	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for _, query := range qp.CompositeQuery.BuilderQueries {
			if query.DataSource == v3.DataSourceMetrics && query.Temporality == "" {
				metricNames = append(metricNames, query.AggregateAttribute.Key)
				if _, ok := metricNameToTemporality[query.AggregateAttribute.Key]; !ok {
					metricNameToTemporality[query.AggregateAttribute.Key] = make(map[v3.Temporality]bool)
				}
			}
		}
	}

	var err error

	if aH.preferDelta {
		zap.L().Debug("fetching metric temporality")
		metricNameToTemporality, err = aH.reader.FetchTemporality(ctx, metricNames)
		if err != nil {
			return err
		}
	}

	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for name := range qp.CompositeQuery.BuilderQueries {
			query := qp.CompositeQuery.BuilderQueries[name]
			if query.DataSource == v3.DataSourceMetrics && query.Temporality == "" {
				if aH.preferDelta && metricNameToTemporality[query.AggregateAttribute.Key][v3.Delta] {
					query.Temporality = v3.Delta
				} else if metricNameToTemporality[query.AggregateAttribute.Key][v3.Cumulative] {
					query.Temporality = v3.Cumulative
				} else {
					query.Temporality = v3.Unspecified
				}
			}
		}
	}
	return nil
}

func (aH *APIHandler) QueryRangeMetricsV2(w http.ResponseWriter, r *http.Request) {
	metricsQueryRangeParams, apiErrorObj := parser.ParseMetricQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiErrorObj.Err))
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
					for _, p := range v.Floats {
						s.Points = append(s.Points, model.MetricPoint{Timestamp: p.T, Value: p.F})
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

// populateTemporality same as addTemporality but for v4 and better
func (aH *APIHandler) populateTemporality(ctx context.Context, qp *v3.QueryRangeParamsV3) error {

	missingTemporality := make([]string, 0)
	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)
	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for _, query := range qp.CompositeQuery.BuilderQueries {
			// if there is no temporality specified in the query but we have it in the map
			// then use the value from the map
			if query.Temporality == "" && aH.temporalityMap[query.AggregateAttribute.Key] != nil {
				// We prefer delta if it is available
				if aH.temporalityMap[query.AggregateAttribute.Key][v3.Delta] {
					query.Temporality = v3.Delta
				} else if aH.temporalityMap[query.AggregateAttribute.Key][v3.Cumulative] {
					query.Temporality = v3.Cumulative
				} else {
					query.Temporality = v3.Unspecified
				}
			}
			// we don't have temporality for this metric
			if query.DataSource == v3.DataSourceMetrics && query.Temporality == "" {
				missingTemporality = append(missingTemporality, query.AggregateAttribute.Key)
			}
			if _, ok := metricNameToTemporality[query.AggregateAttribute.Key]; !ok {
				metricNameToTemporality[query.AggregateAttribute.Key] = make(map[v3.Temporality]bool)
			}
		}
	}

	nameToTemporality, err := aH.reader.FetchTemporality(ctx, missingTemporality)
	if err != nil {
		return err
	}

	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for name := range qp.CompositeQuery.BuilderQueries {
			query := qp.CompositeQuery.BuilderQueries[name]
			if query.DataSource == v3.DataSourceMetrics && query.Temporality == "" {
				if nameToTemporality[query.AggregateAttribute.Key][v3.Delta] {
					query.Temporality = v3.Delta
				} else if nameToTemporality[query.AggregateAttribute.Key][v3.Cumulative] {
					query.Temporality = v3.Cumulative
				} else {
					query.Temporality = v3.Unspecified
				}
				aH.temporalityMap[query.AggregateAttribute.Key] = nameToTemporality[query.AggregateAttribute.Key]
			}
		}
	}
	return nil
}

func (aH *APIHandler) listRules(w http.ResponseWriter, r *http.Request) {

	rules, err := aH.ruleManager.ListRuleStates(r.Context())
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// todo(amol): need to add sorter

	aH.Respond(w, rules)
}

func (aH *APIHandler) getDashboards(w http.ResponseWriter, r *http.Request) {

	allDashboards, err := dashboards.GetDashboards(r.Context())
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	ic := aH.IntegrationsController
	installedIntegrationDashboards, err := ic.GetDashboardsForInstalledIntegrations(r.Context())
	allDashboards = append(allDashboards, installedIntegrationDashboards...)

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
	err := dashboards.DeleteDashboard(r.Context(), uuid, aH.featureFlags)

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

func prepareQuery(r *http.Request) (string, error) {
	var postData *model.DashboardVars

	if err := json.NewDecoder(r.Body).Decode(&postData); err != nil {
		return "", fmt.Errorf("failed to decode request body: %v", err)
	}

	query := strings.TrimSpace(postData.Query)

	if query == "" {
		return "", fmt.Errorf("query is required")
	}

	notAllowedOps := []string{
		"alter table",
		"drop table",
		"truncate table",
		"drop database",
		"drop view",
		"drop function",
	}

	for _, op := range notAllowedOps {
		if strings.Contains(strings.ToLower(query), op) {
			return "", fmt.Errorf("Operation %s is not allowed", op)
		}
	}

	vars := make(map[string]string)
	for k, v := range postData.Variables {
		vars[k] = metrics.FormattedValue(v)
	}
	tmpl := template.New("dashboard-vars")
	tmpl, tmplErr := tmpl.Parse(query)
	if tmplErr != nil {
		return "", tmplErr
	}
	var queryBuf bytes.Buffer
	tmplErr = tmpl.Execute(&queryBuf, vars)
	if tmplErr != nil {
		return "", tmplErr
	}
	return queryBuf.String(), nil
}

func (aH *APIHandler) queryDashboardVarsV2(w http.ResponseWriter, r *http.Request) {
	query, err := prepareQuery(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
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

	dashboard, apiError := dashboards.UpdateDashboard(r.Context(), uuid, postData, aH.featureFlags)
	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	aH.Respond(w, dashboard)

}

func (aH *APIHandler) getDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]

	dashboard, apiError := dashboards.GetDashboard(r.Context(), uuid)

	if apiError != nil {
		if apiError.Type() != model.ErrorNotFound {
			RespondError(w, apiError, nil)
			return
		}

		dashboard, apiError = aH.IntegrationsController.GetInstalledIntegrationDashboardById(
			r.Context(), uuid,
		)
		if apiError != nil {
			RespondError(w, apiError, nil)
			return
		}

	}

	aH.Respond(w, dashboard)

}

func (aH *APIHandler) saveAndReturn(w http.ResponseWriter, r *http.Request, signozDashboard model.DashboardData) {
	toSave := make(map[string]interface{})
	toSave["title"] = signozDashboard.Title
	toSave["description"] = signozDashboard.Description
	toSave["tags"] = signozDashboard.Tags
	toSave["layout"] = signozDashboard.Layout
	toSave["widgets"] = signozDashboard.Widgets
	toSave["variables"] = signozDashboard.Variables

	dashboard, apiError := dashboards.CreateDashboard(r.Context(), toSave, aH.featureFlags)
	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, dashboard)
	return
}

func (aH *APIHandler) createDashboardsTransform(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	b, err := io.ReadAll(r.Body)

	var importData model.GrafanaJSON

	err = json.Unmarshal(b, &importData)
	if err == nil {
		signozDashboard := dashboards.TransformGrafanaJSONToSignoz(importData)
		aH.saveAndReturn(w, r, signozDashboard)
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

	dash, apiErr := dashboards.CreateDashboard(r.Context(), postData, aH.featureFlags)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, dash)

}

func (aH *APIHandler) testRule(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("Error in getting req body in test rule API", zap.Error(err))
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

	err := aH.ruleManager.DeleteRule(r.Context(), id)

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
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("error in getting req body of patch rule API\n", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	gettableRule, err := aH.ruleManager.PatchRule(r.Context(), string(body), id)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, gettableRule)
}

func (aH *APIHandler) editRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("error in getting req body of edit rule API", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	err = aH.ruleManager.EditRule(r.Context(), string(body), id)

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
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("Error in getting req body of testChannel API", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.L().Error("Error in parsing req body of testChannel API\n", zap.Error(err))
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
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("Error in getting req body of editChannel API", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.L().Error("Error in parsing req body of editChannel API", zap.Error(err))
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
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("Error in getting req body of createChannel API", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.L().Error("Error in parsing req body of createChannel API", zap.Error(err))
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

func (aH *APIHandler) getAlerts(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()
	amEndpoint := constants.GetAlertManagerApiPrefix()
	resp, err := http.Get(amEndpoint + "v1/alerts" + "?" + params.Encode())
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, string(body))
}

func (aH *APIHandler) createRule(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("Error in getting req body for create rule API", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	rule, err := aH.ruleManager.CreateRule(r.Context(), string(body))
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	aH.Respond(w, rule)

}

func (aH *APIHandler) queryRangeMetricsFromClickhouse(w http.ResponseWriter, r *http.Request) {

}
func (aH *APIHandler) queryRangeMetrics(w http.ResponseWriter, r *http.Request) {

	query, apiErrorObj := parseQueryRangeRequest(r)

	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}

	// zap.L().Info(query, apiError)

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
		zap.L().Error("error in query range metrics", zap.Error(res.Err))
	}

	if res.Err != nil {
		switch res.Err.(type) {
		case promql.ErrQueryCanceled:
			RespondError(w, &model.ApiError{model.ErrorCanceled, res.Err}, nil)
		case promql.ErrQueryTimeout:
			RespondError(w, &model.ApiError{model.ErrorTimeout, res.Err}, nil)
		}
		RespondError(w, &model.ApiError{model.ErrorExec, res.Err}, nil)
		return
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

	// zap.L().Info(query, apiError)

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
		zap.L().Error("error in query range metrics", zap.Error(res.Err))
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
	userEmail, err := auth.GetEmailFromJwt(r.Context())
	if err == nil {
		telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_INPRODUCT_FEEDBACK, data, userEmail, true, false)
	}
}

func (aH *APIHandler) registerEvent(w http.ResponseWriter, r *http.Request) {

	request, err := parseRegisterEventRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}
	userEmail, err := auth.GetEmailFromJwt(r.Context())
	if err == nil {
		telemetry.GetInstance().SendEvent(request.EventName, request.Attributes, userEmail, true, true)
		aH.WriteJSON(w, r, map[string]string{"data": "Event Processed Successfully"})
	} else {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
	}
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

	result, apiErr := aH.reader.GetServiceOverview(r.Context(), query, aH.skipConfig)
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) getServicesTopLevelOps(w http.ResponseWriter, r *http.Request) {

	var start, end time.Time

	result, _, apiErr := aH.reader.GetTopLevelOperations(r.Context(), aH.skipConfig, start, end)
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

	result, apiErr := aH.reader.GetServices(r.Context(), query, aH.skipConfig)
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	data := map[string]interface{}{
		"number": len(*result),
	}
	userEmail, err := auth.GetEmailFromJwt(r.Context())
	if err == nil {
		telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_NUMBER_OF_SERVICES, data, userEmail, true, false)
	}

	if (data["number"] != 0) && (data["number"] != telemetry.DEFAULT_NUMBER_OF_SERVICES) {
		telemetry.GetInstance().AddActiveTracesUser()
	}

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
	versionResponse := model.GetVersionResponse{
		Version:        version,
		EE:             "Y",
		SetupCompleted: aH.SetupCompleted,
	}

	aH.WriteJSON(w, r, versionResponse)
}

func (aH *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet, err := aH.FF().GetFeatureFlags()
	if err != nil {
		aH.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	if aH.preferSpanMetrics {
		for idx := range featureSet {
			feature := &featureSet[idx]
			if feature.Name == model.UseSpanMetrics {
				featureSet[idx].Active = true
			}
		}
	}
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

// getHealth is used to check the health of the service.
// 'live' query param can be used to check liveliness of
// the service by checking the database connection.
func (aH *APIHandler) getHealth(w http.ResponseWriter, r *http.Request) {
	_, ok := r.URL.Query()["live"]
	if ok {
		err := aH.reader.CheckClickHouse(r.Context())
		if err != nil {
			RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorStatusServiceUnavailable}, nil)
			return
		}
	}

	aH.WriteJSON(w, r, map[string]string{"status": "ok"})
}

// inviteUser is used to invite a user. It is used by an admin api.
func (aH *APIHandler) inviteUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseInviteRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	resp, err := auth.Invite(r.Context(), req)
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

	if err := auth.RevokeInvite(r.Context(), email); err != nil {
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

	if !aH.SetupCompleted {
		// since the first user is now created, we can disable self-registration as
		// from here onwards, we expect admin (owner) to invite other users.
		aH.SetupCompleted = true
	}

	aH.Respond(w, nil)
}

func (aH *APIHandler) precheckLogin(w http.ResponseWriter, r *http.Request) {

	email := r.URL.Query().Get("email")
	sourceUrl := r.URL.Query().Get("ref")

	resp, apierr := aH.appDao.PrecheckLogin(context.Background(), email, sourceUrl)
	if apierr != nil {
		RespondError(w, apierr, resp)
		return
	}

	aH.Respond(w, resp)
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
		zap.L().Error("[listUsers] Failed to query list of users", zap.Error(err))
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
		zap.L().Error("[getUser] Failed to query user", zap.Error(err))
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
		zap.L().Error("[editUser] Failed to query user", zap.Error(err))
		RespondError(w, apiErr, nil)
		return
	}

	if len(update.Name) > 0 {
		old.Name = update.Name
	}
	if len(update.ProfilePictureURL) > 0 {
		old.ProfilePictureURL = update.ProfilePictureURL
	}

	_, apiErr = dao.DB().EditUser(ctx, &model.User{
		Id:                old.Id,
		Name:              old.Name,
		OrgId:             old.OrgId,
		Email:             old.Email,
		Password:          old.Password,
		CreatedAt:         old.CreatedAt,
		ProfilePictureURL: old.ProfilePictureURL,
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

// addUserFlag patches a user flags with the changes
func (aH *APIHandler) patchUserFlag(w http.ResponseWriter, r *http.Request) {
	// read user id from path var
	userId := mux.Vars(r)["id"]

	// read input into user flag
	defer r.Body.Close()
	b, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("failed read user flags from http request for userId ", zap.String("userId", userId), zap.Error(err))
		RespondError(w, model.BadRequestStr("received user flags in invalid format"), nil)
		return
	}
	flags := make(map[string]string, 0)

	err = json.Unmarshal(b, &flags)
	if err != nil {
		zap.L().Error("failed parsing user flags for userId ", zap.String("userId", userId), zap.Error(err))
		RespondError(w, model.BadRequestStr("received user flags in invalid format"), nil)
		return
	}

	newflags, apiError := dao.DB().UpdateUserFlags(r.Context(), userId, flags)
	if !apiError.IsNil() {
		RespondError(w, apiError, nil)
		return
	}

	aH.Respond(w, newflags)
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
	userEmail, err := auth.GetEmailFromJwt(r.Context())
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_ORG_SETTINGS, data, userEmail, true, false)

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
		zap.L().Error("resetPassword failed", zap.Error(err))
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

	if apiErr := auth.ChangePassword(context.Background(), req); apiErr != nil {
		RespondError(w, apiErr, nil)
		return

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
		zap.L().Error("HTTP handler, Internal Server Error", zap.Error(err))
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

// Integrations
func (ah *APIHandler) RegisterIntegrationRoutes(router *mux.Router, am *AuthMiddleware) {
	subRouter := router.PathPrefix("/api/v1/integrations").Subrouter()

	subRouter.HandleFunc(
		"/install", am.ViewAccess(ah.InstallIntegration),
	).Methods(http.MethodPost)

	subRouter.HandleFunc(
		"/uninstall", am.ViewAccess(ah.UninstallIntegration),
	).Methods(http.MethodPost)

	// Used for polling for status in v0
	subRouter.HandleFunc(
		"/{integrationId}/connection_status", am.ViewAccess(ah.GetIntegrationConnectionStatus),
	).Methods(http.MethodGet)

	subRouter.HandleFunc(
		"/{integrationId}", am.ViewAccess(ah.GetIntegration),
	).Methods(http.MethodGet)

	subRouter.HandleFunc(
		"", am.ViewAccess(ah.ListIntegrations),
	).Methods(http.MethodGet)
}

func (ah *APIHandler) ListIntegrations(
	w http.ResponseWriter, r *http.Request,
) {
	params := map[string]string{}
	for k, values := range r.URL.Query() {
		params[k] = values[0]
	}

	resp, apiErr := ah.IntegrationsController.ListIntegrations(
		r.Context(), params,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch integrations")
		return
	}
	ah.Respond(w, resp)
}

func (ah *APIHandler) GetIntegration(
	w http.ResponseWriter, r *http.Request,
) {
	integrationId := mux.Vars(r)["integrationId"]
	integration, apiErr := ah.IntegrationsController.GetIntegration(
		r.Context(), integrationId,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch integration details")
		return
	}

	ah.Respond(w, integration)
}

func (ah *APIHandler) GetIntegrationConnectionStatus(
	w http.ResponseWriter, r *http.Request,
) {
	integrationId := mux.Vars(r)["integrationId"]
	isInstalled, apiErr := ah.IntegrationsController.IsIntegrationInstalled(
		r.Context(), integrationId,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "failed to check if integration is installed")
		return
	}

	// Do not spend resources calculating connection status unless installed.
	if !isInstalled {
		ah.Respond(w, &integrations.IntegrationConnectionStatus{})
		return
	}

	connectionTests, apiErr := ah.IntegrationsController.GetIntegrationConnectionTests(
		r.Context(), integrationId,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "failed to fetch integration connection tests")
		return
	}

	lookbackSecondsStr := r.URL.Query().Get("lookback_seconds")
	lookbackSeconds, err := strconv.ParseInt(lookbackSecondsStr, 10, 64)
	if err != nil {
		lookbackSeconds = 15 * 60
	}

	connectionStatus, apiErr := ah.calculateConnectionStatus(
		r.Context(), connectionTests, lookbackSeconds,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to calculate integration connection status")
		return
	}

	ah.Respond(w, connectionStatus)
}

func (ah *APIHandler) calculateConnectionStatus(
	ctx context.Context,
	connectionTests *integrations.IntegrationConnectionTests,
	lookbackSeconds int64,
) (*integrations.IntegrationConnectionStatus, *model.ApiError) {
	// Calculate connection status for signals in parallel

	result := &integrations.IntegrationConnectionStatus{}
	errors := []*model.ApiError{}
	var resultLock sync.Mutex

	var wg sync.WaitGroup

	// Calculate logs connection status
	wg.Add(1)
	go func() {
		defer wg.Done()

		logsConnStatus, apiErr := ah.calculateLogsConnectionStatus(
			ctx, connectionTests.Logs, lookbackSeconds,
		)

		resultLock.Lock()
		defer resultLock.Unlock()

		if apiErr != nil {
			errors = append(errors, apiErr)
		} else {
			result.Logs = logsConnStatus
		}
	}()

	// Calculate metrics connection status
	wg.Add(1)
	go func() {
		defer wg.Done()

		if connectionTests.Metrics == nil || len(connectionTests.Metrics) < 1 {
			return
		}

		statusForLastReceivedMetric, apiErr := ah.reader.GetLatestReceivedMetric(
			ctx, connectionTests.Metrics,
		)

		resultLock.Lock()
		defer resultLock.Unlock()

		if apiErr != nil {
			errors = append(errors, apiErr)

		} else if statusForLastReceivedMetric != nil {
			resourceSummaryParts := []string{}
			for k, v := range statusForLastReceivedMetric.LastReceivedLabels {
				interestingLabels := []string{
					"container_name", "host_name", "node_name",
					"pod_name", "deployment_name", "cluster_name",
					"namespace_name", "job_name", "service_name",
				}
				isInterestingKey := !strings.HasPrefix(k, "_") && slices.ContainsFunc(
					interestingLabels, func(l string) bool { return strings.Contains(k, l) },
				)
				if isInterestingKey {
					resourceSummaryParts = append(resourceSummaryParts, fmt.Sprintf(
						"%s=%s", k, v,
					))
				}
			}

			result.Metrics = &integrations.SignalConnectionStatus{
				LastReceivedFrom:     strings.Join(resourceSummaryParts, ", "),
				LastReceivedTsMillis: statusForLastReceivedMetric.LastReceivedTsMillis,
			}
		}
	}()

	wg.Wait()

	if len(errors) > 0 {
		return nil, errors[0]
	}

	return result, nil
}

func (ah *APIHandler) calculateLogsConnectionStatus(
	ctx context.Context,
	logsConnectionTest *v3.FilterSet,
	lookbackSeconds int64,
) (*integrations.SignalConnectionStatus, *model.ApiError) {
	if logsConnectionTest == nil {
		return nil, nil
	}

	qrParams := &v3.QueryRangeParamsV3{
		Start: time.Now().UnixMilli() - (lookbackSeconds * 1000),
		End:   time.Now().UnixMilli(),
		CompositeQuery: &v3.CompositeQuery{
			PanelType: v3.PanelTypeList,
			QueryType: v3.QueryTypeBuilder,
			BuilderQueries: map[string]*v3.BuilderQuery{
				"A": {
					PageSize:          1,
					Filters:           logsConnectionTest,
					QueryName:         "A",
					DataSource:        v3.DataSourceLogs,
					Expression:        "A",
					AggregateOperator: v3.AggregateOperatorNoOp,
				},
			},
		},
	}
	queryRes, err, _ := ah.querier.QueryRange(
		ctx, qrParams, map[string]v3.AttributeKey{},
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query for integration connection status: %w", err,
		))
	}
	if len(queryRes) > 0 && queryRes[0].List != nil && len(queryRes[0].List) > 0 {
		lastLog := queryRes[0].List[0]

		resourceSummaryParts := []string{}
		lastLogResourceAttribs := lastLog.Data["resources_string"]
		if lastLogResourceAttribs != nil {
			resourceAttribs, ok := lastLogResourceAttribs.(*map[string]string)
			if !ok {
				return nil, model.InternalError(fmt.Errorf(
					"could not cast log resource attribs",
				))
			}
			for k, v := range *resourceAttribs {
				resourceSummaryParts = append(resourceSummaryParts, fmt.Sprintf(
					"%s=%s", k, v,
				))
			}
		}
		lastLogResourceSummary := strings.Join(resourceSummaryParts, ", ")

		return &integrations.SignalConnectionStatus{
			LastReceivedTsMillis: lastLog.Timestamp.UnixMilli(),
			LastReceivedFrom:     lastLogResourceSummary,
		}, nil
	}

	return nil, nil
}

func (ah *APIHandler) InstallIntegration(
	w http.ResponseWriter, r *http.Request,
) {
	req := integrations.InstallIntegrationRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	integration, apiErr := ah.IntegrationsController.Install(
		r.Context(), &req,
	)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	ah.Respond(w, integration)
}

func (ah *APIHandler) UninstallIntegration(
	w http.ResponseWriter, r *http.Request,
) {
	req := integrations.UninstallIntegrationRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	apiErr := ah.IntegrationsController.Uninstall(r.Context(), &req)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	ah.Respond(w, map[string]interface{}{})
}

// logs
func (aH *APIHandler) RegisterLogsRoutes(router *mux.Router, am *AuthMiddleware) {
	subRouter := router.PathPrefix("/api/v1/logs").Subrouter()
	subRouter.HandleFunc("", am.ViewAccess(aH.getLogs)).Methods(http.MethodGet)
	subRouter.HandleFunc("/tail", am.ViewAccess(aH.tailLogs)).Methods(http.MethodGet)
	subRouter.HandleFunc("/fields", am.ViewAccess(aH.logFields)).Methods(http.MethodGet)
	subRouter.HandleFunc("/fields", am.EditAccess(aH.logFieldUpdate)).Methods(http.MethodPost)
	subRouter.HandleFunc("/aggregate", am.ViewAccess(aH.logAggregate)).Methods(http.MethodGet)

	// log pipelines
	subRouter.HandleFunc("/pipelines/preview", am.ViewAccess(aH.PreviewLogsPipelinesHandler)).Methods(http.MethodPost)
	subRouter.HandleFunc("/pipelines/{version}", am.ViewAccess(aH.ListLogsPipelinesHandler)).Methods(http.MethodGet)
	subRouter.HandleFunc("/pipelines", am.EditAccess(aH.CreateLogsPipeline)).Methods(http.MethodPost)
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
	client := &model.LogsTailClient{Name: r.RemoteAddr, Logs: make(chan *model.SignozLog, 1000), Done: make(chan *bool), Error: make(chan error), Filter: *params}
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
	// flush the headers
	flusher.Flush()

	for {
		select {
		case log := <-client.Logs:
			var buf bytes.Buffer
			enc := json.NewEncoder(&buf)
			enc.Encode(log)
			fmt.Fprintf(w, "data: %v\n\n", buf.String())
			flusher.Flush()
		case <-client.Done:
			zap.L().Debug("done!")
			return
		case err := <-client.Error:
			zap.L().Error("error occured", zap.Error(err))
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

const logPipelines = "log_pipelines"

func parseAgentConfigVersion(r *http.Request) (int, *model.ApiError) {
	versionString := mux.Vars(r)["version"]

	if versionString == "latest" {
		return -1, nil
	}

	version64, err := strconv.ParseInt(versionString, 0, 8)

	if err != nil {
		return 0, model.BadRequestStr("invalid version number")
	}

	if version64 <= 0 {
		return 0, model.BadRequestStr("invalid version number")
	}

	return int(version64), nil
}

func (ah *APIHandler) PreviewLogsPipelinesHandler(w http.ResponseWriter, r *http.Request) {
	req := logparsingpipeline.PipelinesPreviewRequest{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	resultLogs, apiErr := ah.LogsParsingPipelineController.PreviewLogsPipelines(
		r.Context(), &req,
	)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	ah.Respond(w, resultLogs)
}

func (ah *APIHandler) ListLogsPipelinesHandler(w http.ResponseWriter, r *http.Request) {

	version, err := parseAgentConfigVersion(r)
	if err != nil {
		RespondError(w, model.WrapApiError(err, "Failed to parse agent config version"), nil)
		return
	}

	var payload *logparsingpipeline.PipelinesResponse
	var apierr *model.ApiError

	if version != -1 {
		payload, apierr = ah.listLogsPipelinesByVersion(context.Background(), version)
	} else {
		payload, apierr = ah.listLogsPipelines(context.Background())
	}

	if apierr != nil {
		RespondError(w, apierr, payload)
		return
	}
	ah.Respond(w, payload)
}

// listLogsPipelines lists logs piplines for latest version
func (ah *APIHandler) listLogsPipelines(ctx context.Context) (
	*logparsingpipeline.PipelinesResponse, *model.ApiError,
) {
	// get lateset agent config
	latestVersion := -1
	lastestConfig, err := agentConf.GetLatestVersion(ctx, logPipelines)
	if err != nil && err.Type() != model.ErrorNotFound {
		return nil, model.WrapApiError(err, "failed to get latest agent config version")
	}

	if lastestConfig != nil {
		latestVersion = lastestConfig.Version
	}

	payload, err := ah.LogsParsingPipelineController.GetPipelinesByVersion(ctx, latestVersion)
	if err != nil {
		return nil, model.WrapApiError(err, "failed to get pipelines")
	}

	// todo(Nitya): make a new API for history pagination
	limit := 10
	history, err := agentConf.GetConfigHistory(ctx, logPipelines, limit)
	if err != nil {
		return nil, model.WrapApiError(err, "failed to get config history")
	}
	payload.History = history
	return payload, nil
}

// listLogsPipelinesByVersion lists pipelines along with config version history
func (ah *APIHandler) listLogsPipelinesByVersion(ctx context.Context, version int) (
	*logparsingpipeline.PipelinesResponse, *model.ApiError,
) {
	payload, err := ah.LogsParsingPipelineController.GetPipelinesByVersion(ctx, version)
	if err != nil {
		return nil, model.WrapApiError(err, "failed to get pipelines by version")
	}

	// todo(Nitya): make a new API for history pagination
	limit := 10
	history, err := agentConf.GetConfigHistory(ctx, logPipelines, limit)
	if err != nil {
		return nil, model.WrapApiError(err, "failed to retrieve agent config history")
	}

	payload.History = history
	return payload, nil
}

func (ah *APIHandler) CreateLogsPipeline(w http.ResponseWriter, r *http.Request) {

	req := logparsingpipeline.PostablePipelines{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	createPipeline := func(
		ctx context.Context,
		postable []logparsingpipeline.PostablePipeline,
	) (*logparsingpipeline.PipelinesResponse, *model.ApiError) {
		if len(postable) == 0 {
			zap.L().Warn("found no pipelines in the http request, this will delete all the pipelines")
		}

		for _, p := range postable {
			if err := p.IsValid(); err != nil {
				return nil, model.BadRequestStr(err.Error())
			}
		}

		return ah.LogsParsingPipelineController.ApplyPipelines(ctx, postable)
	}

	res, err := createPipeline(r.Context(), req.Pipelines)
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	ah.Respond(w, res)
}

func (aH *APIHandler) getSavedViews(w http.ResponseWriter, r *http.Request) {
	// get sourcePage, name, and category from the query params
	sourcePage := r.URL.Query().Get("sourcePage")
	name := r.URL.Query().Get("name")
	category := r.URL.Query().Get("category")

	queries, err := explorer.GetViewsForFilters(sourcePage, name, category)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, queries)
}

func (aH *APIHandler) createSavedViews(w http.ResponseWriter, r *http.Request) {
	var view v3.SavedView
	err := json.NewDecoder(r.Body).Decode(&view)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	// validate the query
	if err := view.Validate(); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	uuid, err := explorer.CreateView(r.Context(), view)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, uuid)
}

func (aH *APIHandler) getSavedView(w http.ResponseWriter, r *http.Request) {
	viewID := mux.Vars(r)["viewId"]
	view, err := explorer.GetView(viewID)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, view)
}

func (aH *APIHandler) updateSavedView(w http.ResponseWriter, r *http.Request) {
	viewID := mux.Vars(r)["viewId"]
	var view v3.SavedView
	err := json.NewDecoder(r.Body).Decode(&view)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	// validate the query
	if err := view.Validate(); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	err = explorer.UpdateView(r.Context(), viewID, view)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, view)
}

func (aH *APIHandler) deleteSavedView(w http.ResponseWriter, r *http.Request) {

	viewID := mux.Vars(r)["viewId"]
	err := explorer.DeleteView(viewID)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, nil)
}

func (aH *APIHandler) autocompleteAggregateAttributes(w http.ResponseWriter, r *http.Request) {
	var response *v3.AggregateAttributeResponse
	req, err := parseAggregateAttributeRequest(r)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	switch req.DataSource {
	case v3.DataSourceMetrics:
		response, err = aH.reader.GetMetricAggregateAttributes(r.Context(), req)
	case v3.DataSourceLogs:
		response, err = aH.reader.GetLogAggregateAttributes(r.Context(), req)
	case v3.DataSourceTraces:
		response, err = aH.reader.GetTraceAggregateAttributes(r.Context(), req)
	default:
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("invalid data source")}, nil)
		return
	}

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	aH.Respond(w, response)
}

func (aH *APIHandler) autoCompleteAttributeKeys(w http.ResponseWriter, r *http.Request) {
	var response *v3.FilterAttributeKeyResponse
	req, err := parseFilterAttributeKeyRequest(r)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	switch req.DataSource {
	case v3.DataSourceMetrics:
		response, err = aH.reader.GetMetricAttributeKeys(r.Context(), req)
	case v3.DataSourceLogs:
		response, err = aH.reader.GetLogAttributeKeys(r.Context(), req)
	case v3.DataSourceTraces:
		response, err = aH.reader.GetTraceAttributeKeys(r.Context(), req)
	default:
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("invalid data source")}, nil)
		return
	}

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	aH.Respond(w, response)
}

func (aH *APIHandler) autoCompleteAttributeValues(w http.ResponseWriter, r *http.Request) {
	var response *v3.FilterAttributeValueResponse
	req, err := parseFilterAttributeValueRequest(r)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	switch req.DataSource {
	case v3.DataSourceMetrics:
		response, err = aH.reader.GetMetricAttributeValues(r.Context(), req)
	case v3.DataSourceLogs:
		response, err = aH.reader.GetLogAttributeValues(r.Context(), req)
	case v3.DataSourceTraces:
		response, err = aH.reader.GetTraceAttributeValues(r.Context(), req)
	default:
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("invalid data source")}, nil)
		return
	}

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	aH.Respond(w, response)
}

func (aH *APIHandler) execClickHouseGraphQueries(ctx context.Context, queries map[string]string) ([]*v3.Result, error, map[string]string) {
	type channelResult struct {
		Series []*v3.Series
		Err    error
		Name   string
		Query  string
	}

	ch := make(chan channelResult, len(queries))
	var wg sync.WaitGroup

	for name, query := range queries {
		wg.Add(1)
		go func(name, query string) {
			defer wg.Done()

			seriesList, err := aH.reader.GetTimeSeriesResultV3(ctx, query)

			if err != nil {
				ch <- channelResult{Err: fmt.Errorf("error in query-%s: %v", name, err), Name: name, Query: query}
				return
			}
			ch <- channelResult{Series: seriesList, Name: name, Query: query}
		}(name, query)
	}

	wg.Wait()
	close(ch)

	var errs []error
	errQuriesByName := make(map[string]string)
	res := make([]*v3.Result, 0)
	// read values from the channel
	for r := range ch {
		if r.Err != nil {
			errs = append(errs, r.Err)
			errQuriesByName[r.Name] = r.Query
			continue
		}
		res = append(res, &v3.Result{
			QueryName: r.Name,
			Series:    r.Series,
		})
	}
	if len(errs) != 0 {
		return nil, fmt.Errorf("encountered multiple errors: %s", multierr.Combine(errs...)), errQuriesByName
	}
	return res, nil, nil
}

func (aH *APIHandler) execClickHouseListQueries(ctx context.Context, queries map[string]string) ([]*v3.Result, error, map[string]string) {
	type channelResult struct {
		List  []*v3.Row
		Err   error
		Name  string
		Query string
	}

	ch := make(chan channelResult, len(queries))
	var wg sync.WaitGroup

	for name, query := range queries {
		wg.Add(1)
		go func(name, query string) {
			defer wg.Done()
			rowList, err := aH.reader.GetListResultV3(ctx, query)

			if err != nil {
				ch <- channelResult{Err: fmt.Errorf("error in query-%s: %v", name, err), Name: name, Query: query}
				return
			}
			ch <- channelResult{List: rowList, Name: name, Query: query}
		}(name, query)
	}

	wg.Wait()
	close(ch)

	var errs []error
	errQuriesByName := make(map[string]string)
	res := make([]*v3.Result, 0)
	// read values from the channel
	for r := range ch {
		if r.Err != nil {
			errs = append(errs, r.Err)
			errQuriesByName[r.Name] = r.Query
			continue
		}
		res = append(res, &v3.Result{
			QueryName: r.Name,
			List:      r.List,
		})
	}
	if len(errs) != 0 {
		return nil, fmt.Errorf("encountered multiple errors: %s", multierr.Combine(errs...)), errQuriesByName
	}
	return res, nil, nil
}

func (aH *APIHandler) execPromQueries(ctx context.Context, metricsQueryRangeParams *v3.QueryRangeParamsV3) ([]*v3.Result, error, map[string]string) {
	type channelResult struct {
		Series []*v3.Series
		Err    error
		Name   string
		Query  string
	}

	ch := make(chan channelResult, len(metricsQueryRangeParams.CompositeQuery.PromQueries))
	var wg sync.WaitGroup

	for name, query := range metricsQueryRangeParams.CompositeQuery.PromQueries {
		if query.Disabled {
			continue
		}
		wg.Add(1)
		go func(name string, query *v3.PromQuery) {
			var seriesList []*v3.Series
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
			promResult, _, err := aH.reader.GetQueryRangeResult(ctx, &queryModel)
			if err != nil {
				ch <- channelResult{Err: fmt.Errorf("error in query-%s: %v", name, err), Name: name, Query: query.Query}
				return
			}
			matrix, _ := promResult.Matrix()
			for _, v := range matrix {
				var s v3.Series
				s.Labels = v.Metric.Copy().Map()
				for _, p := range v.Floats {
					s.Points = append(s.Points, v3.Point{Timestamp: p.T, Value: p.F})
				}
				seriesList = append(seriesList, &s)
			}
			ch <- channelResult{Series: seriesList, Name: name, Query: query.Query}
		}(name, query)
	}

	wg.Wait()
	close(ch)

	var errs []error
	errQuriesByName := make(map[string]string)
	res := make([]*v3.Result, 0)
	// read values from the channel
	for r := range ch {
		if r.Err != nil {
			errs = append(errs, r.Err)
			errQuriesByName[r.Name] = r.Query
			continue
		}
		res = append(res, &v3.Result{
			QueryName: r.Name,
			Series:    r.Series,
		})
	}
	if len(errs) != 0 {
		return nil, fmt.Errorf("encountered multiple errors: %s", multierr.Combine(errs...)), errQuriesByName
	}
	return res, nil, nil
}

func (aH *APIHandler) getLogFieldsV3(ctx context.Context, queryRangeParams *v3.QueryRangeParamsV3) (map[string]v3.AttributeKey, error) {
	data := map[string]v3.AttributeKey{}
	for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
		if query.DataSource == v3.DataSourceLogs {
			fields, apiError := aH.reader.GetLogFields(ctx)
			if apiError != nil {
				return nil, apiError.Err
			}

			// top level fields meta will always be present in the frontend. (can be support for that as enchancement)
			getType := func(t string) (v3.AttributeKeyType, bool) {
				if t == "attributes" {
					return v3.AttributeKeyTypeTag, false
				} else if t == "resources" {
					return v3.AttributeKeyTypeResource, false
				}
				return "", true
			}

			for _, selectedField := range fields.Selected {
				fieldType, pass := getType(selectedField.Type)
				if pass {
					continue
				}
				data[selectedField.Name] = v3.AttributeKey{
					Key:      selectedField.Name,
					Type:     fieldType,
					DataType: v3.AttributeKeyDataType(strings.ToLower(selectedField.DataType)),
					IsColumn: true,
				}
			}
			for _, interestingField := range fields.Interesting {
				fieldType, pass := getType(interestingField.Type)
				if pass {
					continue
				}
				data[interestingField.Name] = v3.AttributeKey{
					Key:      interestingField.Name,
					Type:     fieldType,
					DataType: v3.AttributeKeyDataType(strings.ToLower(interestingField.DataType)),
					IsColumn: false,
				}
			}
			break
		}
	}
	return data, nil
}

func (aH *APIHandler) getSpanKeysV3(ctx context.Context, queryRangeParams *v3.QueryRangeParamsV3) (map[string]v3.AttributeKey, error) {
	data := map[string]v3.AttributeKey{}
	for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
		if query.DataSource == v3.DataSourceTraces {
			spanKeys, err := aH.reader.GetSpanAttributeKeys(ctx)
			if err != nil {
				return nil, err
			}
			// Add timestamp as a span key to allow ordering by timestamp
			spanKeys["timestamp"] = v3.AttributeKey{
				Key:      "timestamp",
				IsColumn: true,
			}
			return spanKeys, nil
		}
	}
	return data, nil
}

func (aH *APIHandler) QueryRangeV3Format(w http.ResponseWriter, r *http.Request) {
	queryRangeParams, apiErrorObj := ParseQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.L().Error(apiErrorObj.Err.Error())
		RespondError(w, apiErrorObj, nil)
		return
	}

	aH.Respond(w, queryRangeParams)
}

func (aH *APIHandler) queryRangeV3(ctx context.Context, queryRangeParams *v3.QueryRangeParamsV3, w http.ResponseWriter, r *http.Request) {

	var result []*v3.Result
	var err error
	var errQuriesByName map[string]string
	var spanKeys map[string]v3.AttributeKey
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		// check if any enrichment is required for logs if yes then enrich them
		if logsv3.EnrichmentRequired(queryRangeParams) {
			// get the fields if any logs query is present
			var fields map[string]v3.AttributeKey
			fields, err = aH.getLogFieldsV3(ctx, queryRangeParams)
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, errQuriesByName)
				return
			}
			logsv3.Enrich(queryRangeParams, fields)
		}

		spanKeys, err = aH.getSpanKeysV3(ctx, queryRangeParams)
		if err != nil {
			apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
			RespondError(w, apiErrObj, errQuriesByName)
			return
		}
	}

	result, err, errQuriesByName = aH.querier.QueryRange(ctx, queryRangeParams, spanKeys)

	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}

	applyMetricLimit(result, queryRangeParams)

	sendQueryResultEvents(r, result, queryRangeParams)
	// only adding applyFunctions instead of postProcess since experssion are
	// are executed in clickhouse directly and we wanted to add support for timeshift
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		applyFunctions(result, queryRangeParams)
	}

	resp := v3.QueryRangeResponse{
		Result: result,
	}

	// This checks if the time for context to complete has exceeded.
	// it adds flag to notify the user of incomplete response
	select {
	case <-ctx.Done():
		resp.ContextTimeout = true
		resp.ContextTimeoutMessage = "result might contain incomplete data due to context timeout, for custom timeout set the timeout header eg:- timeout:120"
	default:
		break
	}

	aH.Respond(w, resp)
}

func sendQueryResultEvents(r *http.Request, result []*v3.Result, queryRangeParams *v3.QueryRangeParamsV3) {
	referrer := r.Header.Get("Referer")

	dashboardMatched, err := regexp.MatchString(`/dashboard/[a-zA-Z0-9\-]+/(new|edit)(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the referrer", zap.Error(err))
	}
	alertMatched, err := regexp.MatchString(`/alerts/(new|edit)(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the alert: ", zap.Error(err))
	}

	if alertMatched || dashboardMatched {

		if len(result) > 0 && (len(result[0].Series) > 0 || len(result[0].List) > 0) {

			userEmail, err := auth.GetEmailFromJwt(r.Context())
			if err == nil {
				signozLogsUsed, signozMetricsUsed, signozTracesUsed := telemetry.GetInstance().CheckSigNozSignals(queryRangeParams)
				if signozLogsUsed || signozMetricsUsed || signozTracesUsed {

					if dashboardMatched {
						var dashboardID, widgetID string
						var dashboardIDMatch, widgetIDMatch []string
						dashboardIDRegex, err := regexp.Compile(`/dashboard/([a-f0-9\-]+)/`)
						if err == nil {
							dashboardIDMatch = dashboardIDRegex.FindStringSubmatch(referrer)
						} else {
							zap.S().Errorf("error while matching the dashboardIDRegex: %v", err)
						}
						widgetIDRegex, err := regexp.Compile(`widgetId=([a-f0-9\-]+)`)
						if err == nil {
							widgetIDMatch = widgetIDRegex.FindStringSubmatch(referrer)
						} else {
							zap.S().Errorf("error while matching the widgetIDRegex: %v", err)
						}

						if len(dashboardIDMatch) > 1 {
							dashboardID = dashboardIDMatch[1]
						}

						if len(widgetIDMatch) > 1 {
							widgetID = widgetIDMatch[1]
						}
						telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_SUCCESSFUL_DASHBOARD_PANEL_QUERY, map[string]interface{}{
							"queryType":   queryRangeParams.CompositeQuery.QueryType,
							"panelType":   queryRangeParams.CompositeQuery.PanelType,
							"tracesUsed":  signozTracesUsed,
							"logsUsed":    signozLogsUsed,
							"metricsUsed": signozMetricsUsed,
							"dashboardId": dashboardID,
							"widgetId":    widgetID,
						}, userEmail, true, false)
					}
					if alertMatched {
						var alertID string
						var alertIDMatch []string
						alertIDRegex, err := regexp.Compile(`ruleId=(\d+)`)
						if err != nil {
							zap.S().Errorf("error while matching the alertIDRegex: %v", err)
						} else {
							alertIDMatch = alertIDRegex.FindStringSubmatch(referrer)
						}

						if len(alertIDMatch) > 1 {
							alertID = alertIDMatch[1]
						}
						telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_SUCCESSFUL_ALERT_QUERY, map[string]interface{}{
							"queryType":   queryRangeParams.CompositeQuery.QueryType,
							"panelType":   queryRangeParams.CompositeQuery.PanelType,
							"tracesUsed":  signozTracesUsed,
							"logsUsed":    signozLogsUsed,
							"metricsUsed": signozMetricsUsed,
							"alertId":     alertID,
						}, userEmail, true, false)
					}
				}
			}
		}
	}
}

func (aH *APIHandler) QueryRangeV3(w http.ResponseWriter, r *http.Request) {
	queryRangeParams, apiErrorObj := ParseQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiErrorObj.Err))
		RespondError(w, apiErrorObj, nil)
		return
	}

	// add temporality for each metric

	temporalityErr := aH.addTemporality(r.Context(), queryRangeParams)
	if temporalityErr != nil {
		zap.L().Error("Error while adding temporality for metrics", zap.Error(temporalityErr))
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: temporalityErr}, nil)
		return
	}

	aH.queryRangeV3(r.Context(), queryRangeParams, w, r)
}

func (aH *APIHandler) liveTailLogs(w http.ResponseWriter, r *http.Request) {

	// get the param from url and add it to body
	stringReader := strings.NewReader(r.URL.Query().Get("q"))
	r.Body = io.NopCloser(stringReader)

	queryRangeParams, apiErrorObj := ParseQueryRangeParams(r)
	if apiErrorObj != nil {
		zap.L().Error(apiErrorObj.Err.Error())
		RespondError(w, apiErrorObj, nil)
		return
	}

	var err error
	var queryString string
	switch queryRangeParams.CompositeQuery.QueryType {
	case v3.QueryTypeBuilder:
		// check if any enrichment is required for logs if yes then enrich them
		if logsv3.EnrichmentRequired(queryRangeParams) {
			// get the fields if any logs query is present
			var fields map[string]v3.AttributeKey
			fields, err = aH.getLogFieldsV3(r.Context(), queryRangeParams)
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, nil)
				return
			}
			logsv3.Enrich(queryRangeParams, fields)
		}

		queryString, err = aH.queryBuilder.PrepareLiveTailQuery(queryRangeParams)
		if err != nil {
			RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
			return
		}

	default:
		err = fmt.Errorf("invalid query type")
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	// create the client
	client := &v3.LogsLiveTailClient{Name: r.RemoteAddr, Logs: make(chan *model.SignozLog, 1000), Done: make(chan *bool), Error: make(chan error)}
	go aH.reader.LiveTailLogsV3(r.Context(), queryString, uint64(queryRangeParams.Start), "", client)

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
	// flush the headers
	flusher.Flush()
	for {
		select {
		case log := <-client.Logs:
			var buf bytes.Buffer
			enc := json.NewEncoder(&buf)
			enc.Encode(log)
			fmt.Fprintf(w, "data: %v\n\n", buf.String())
			flusher.Flush()
		case <-client.Done:
			zap.L().Debug("done!")
			return
		case err := <-client.Error:
			zap.L().Error("error occurred", zap.Error(err))
			fmt.Fprintf(w, "event: error\ndata: %v\n\n", err.Error())
			flusher.Flush()
			return
		}
	}
}

func (aH *APIHandler) getMetricMetadata(w http.ResponseWriter, r *http.Request) {
	metricName := r.URL.Query().Get("metricName")
	serviceName := r.URL.Query().Get("serviceName")
	metricMetadata, err := aH.reader.GetMetricMetadata(r.Context(), metricName, serviceName)
	if err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, metricMetadata)
}

func (aH *APIHandler) queryRangeV4(ctx context.Context, queryRangeParams *v3.QueryRangeParamsV3, w http.ResponseWriter, r *http.Request) {

	var result []*v3.Result
	var err error
	var errQuriesByName map[string]string
	var spanKeys map[string]v3.AttributeKey
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		// check if any enrichment is required for logs if yes then enrich them
		if logsv3.EnrichmentRequired(queryRangeParams) {
			// get the fields if any logs query is present
			var fields map[string]v3.AttributeKey
			fields, err = aH.getLogFieldsV3(ctx, queryRangeParams)
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, errQuriesByName)
				return
			}
			logsv3.Enrich(queryRangeParams, fields)
		}

		spanKeys, err = aH.getSpanKeysV3(ctx, queryRangeParams)
		if err != nil {
			apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
			RespondError(w, apiErrObj, errQuriesByName)
			return
		}
	}

	result, err, errQuriesByName = aH.querierV2.QueryRange(ctx, queryRangeParams, spanKeys)

	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}

	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		result, err = postProcessResult(result, queryRangeParams)
	}

	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}
	sendQueryResultEvents(r, result, queryRangeParams)
	resp := v3.QueryRangeResponse{
		Result: result,
	}

	aH.Respond(w, resp)
}

func (aH *APIHandler) QueryRangeV4(w http.ResponseWriter, r *http.Request) {
	queryRangeParams, apiErrorObj := ParseQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiErrorObj.Err))
		RespondError(w, apiErrorObj, nil)
		return
	}

	// add temporality for each metric
	temporalityErr := aH.populateTemporality(r.Context(), queryRangeParams)
	if temporalityErr != nil {
		zap.L().Error("Error while adding temporality for metrics", zap.Error(temporalityErr))
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: temporalityErr}, nil)
		return
	}

	aH.queryRangeV4(r.Context(), queryRangeParams, w, r)
}

// postProcessResult applies having clause, metric limit, reduce function to the result
// This function is effective for metrics data source for now, but it can be extended to other data sources
// if needed
// Much of this work can be done in the ClickHouse query, but we decided to do it here because:
// 1. Effective use of caching
// 2. Easier to add new functions
func postProcessResult(result []*v3.Result, queryRangeParams *v3.QueryRangeParamsV3) ([]*v3.Result, error) {
	// Having clause is not part of the clickhouse query, so we need to apply it here
	// It's not included in the query because it doesn't work nicely with caching
	// With this change, if you have a query with a having clause, and then you change the having clause
	// to something else, the query will still be cached.
	applyHavingClause(result, queryRangeParams)
	// We apply the metric limit here because it's not part of the clickhouse query
	// The limit in the context of the time series query is the number of time series
	// So for the limit to work, we need to know what series to keep and what to discard
	// For us to know that, we need to execute the query first, and then apply the limit
	// which we found expensive, because we are executing the query twice on the same data
	// So we decided to apply the limit here, after the query is executed
	// The function is named applyMetricLimit because it only applies to metrics data source
	// In traces and logs, the limit is achieved using subqueries
	applyMetricLimit(result, queryRangeParams)
	// Each series in the result produces N number of points, where N is (end - start) / step
	// For the panel type table, we need to show one point for each series in the row
	// We do that by applying a reduce function to each series
	applyReduceTo(result, queryRangeParams)
	// We apply the functions here it's easier to add new functions
	applyFunctions(result, queryRangeParams)

	for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
		// The way we distinguish between a formula and a query is by checking if the expression
		// is the same as the query name
		// TODO(srikanthccv): Update the UI to send a flag to distinguish between a formula and a query
		if query.Expression != query.QueryName {
			expression, err := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, evalFuncs())
			// This shouldn't happen here, because it should have been caught earlier in validation
			if err != nil {
				zap.L().Error("error in expression", zap.Error(err))
				return nil, err
			}
			formulaResult, err := processResults(result, expression)
			if err != nil {
				zap.L().Error("error in expression", zap.Error(err))
				return nil, err
			}
			formulaResult.QueryName = query.QueryName
			result = append(result, formulaResult)
		}
	}
	// we are done with the formula calculations, only send the results for enabled queries
	removeDisabledQueries := func(result []*v3.Result) []*v3.Result {
		var newResult []*v3.Result
		for _, res := range result {
			if queryRangeParams.CompositeQuery.BuilderQueries[res.QueryName].Disabled {
				continue
			}
			newResult = append(newResult, res)
		}
		return newResult
	}
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		result = removeDisabledQueries(result)
	}
	return result, nil
}

// applyFunctions applies functions for each query in the composite query
// The functions can be more than one, and they are applied in the order they are defined
func applyFunctions(results []*v3.Result, queryRangeParams *v3.QueryRangeParamsV3) {
	for idx, result := range results {
		builderQueries := queryRangeParams.CompositeQuery.BuilderQueries

		if builderQueries != nil {
			functions := builderQueries[result.QueryName].Functions

			for _, function := range functions {
				results[idx] = queryBuilder.ApplyFunction(function, result)
			}
		}
	}
}
