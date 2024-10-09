package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	jsoniter "github.com/json-iterator/go"
	_ "github.com/mattn/go-sqlite3"
	"github.com/prometheus/prometheus/promql"

	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/app/explorer"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/app/logs"
	logsv3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	logsv4 "go.signoz.io/signoz/pkg/query-service/app/logs/v4"
	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	metricsv3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/app/preferences"
	"go.signoz.io/signoz/pkg/query-service/app/querier"
	querierV2 "go.signoz.io/signoz/pkg/query-service/app/querier/v2"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/contextlinks"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"

	"go.uber.org/zap"

	mq "go.signoz.io/signoz/pkg/query-service/app/integrations/messagingQueues/kafka"
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

// APIHandler implements the query service public API
type APIHandler struct {
	reader            interfaces.Reader
	skipConfig        *model.SkipConfig
	appDao            dao.ModelDao
	alertManager      am.Manager
	ruleManager       *rules.Manager
	featureFlags      interfaces.FeatureLookup
	querier           interfaces.Querier
	querierV2         interfaces.Querier
	queryBuilder      *queryBuilder.QueryBuilder
	preferSpanMetrics bool

	// temporalityMap is a map of metric name to temporality
	// to avoid fetching temporality for the same metric multiple times
	// querying the v4 table on low cardinal temporality column
	// should be fast but we can still avoid the query if we have the data in memory
	temporalityMap map[string]map[v3.Temporality]bool
	temporalityMux sync.Mutex

	maxIdleConns int
	maxOpenConns int
	dialTimeout  time.Duration

	IntegrationsController *integrations.Controller

	LogsParsingPipelineController *logparsingpipeline.LogParsingPipelineController

	// SetupCompleted indicates if SigNoz is ready for general use.
	// at the moment, we mark the app ready when the first user
	// is registers.
	SetupCompleted bool

	// Websocket connection upgrader
	Upgrader *websocket.Upgrader

	UseLogsNewSchema bool
}

type APIHandlerOpts struct {

	// business data reader e.g. clickhouse
	Reader interfaces.Reader

	SkipConfig *model.SkipConfig

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

	// Use Logs New schema
	UseLogsNewSchema bool
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(opts APIHandlerOpts) (*APIHandler, error) {

	alertManager, err := am.New()
	if err != nil {
		return nil, err
	}

	querierOpts := querier.QuerierOptions{
		Reader:           opts.Reader,
		Cache:            opts.Cache,
		KeyGenerator:     queryBuilder.NewKeyGenerator(),
		FluxInterval:     opts.FluxInterval,
		FeatureLookup:    opts.FeatureFlags,
		UseLogsNewSchema: opts.UseLogsNewSchema,
	}

	querierOptsV2 := querierV2.QuerierOptions{
		Reader:           opts.Reader,
		Cache:            opts.Cache,
		KeyGenerator:     queryBuilder.NewKeyGenerator(),
		FluxInterval:     opts.FluxInterval,
		FeatureLookup:    opts.FeatureFlags,
		UseLogsNewSchema: opts.UseLogsNewSchema,
	}

	querier := querier.NewQuerier(querierOpts)
	querierv2 := querierV2.NewQuerier(querierOptsV2)

	aH := &APIHandler{
		reader:                        opts.Reader,
		appDao:                        opts.AppDao,
		skipConfig:                    opts.SkipConfig,
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
		UseLogsNewSchema:              opts.UseLogsNewSchema,
	}

	logsQueryBuilder := logsv3.PrepareLogsQuery
	if opts.UseLogsNewSchema {
		logsQueryBuilder = logsv4.PrepareLogsQuery
	}

	builderOpts := queryBuilder.QueryBuilderOptions{
		BuildMetricQuery: metricsv3.PrepareMetricQuery,
		BuildTraceQuery:  tracesV3.PrepareTracesQuery,
		BuildLogQuery:    logsQueryBuilder,
	}
	aH.queryBuilder = queryBuilder.NewQueryBuilder(builderOpts, aH.featureFlags)

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

	aH.Upgrader = &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	return aH, nil
}

// todo(remove): Implemented at render package (go.signoz.io/signoz/pkg/http/render) with the new error structure
type structuredResponse struct {
	Data   interface{}       `json:"data"`
	Total  int               `json:"total"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
	Errors []structuredError `json:"errors"`
}

// todo(remove): Implemented at render package (go.signoz.io/signoz/pkg/http/render) with the new error structure
type structuredError struct {
	Code int    `json:"code,omitempty"`
	Msg  string `json:"msg"`
}

// todo(remove): Implemented at render package (go.signoz.io/signoz/pkg/http/render) with the new error structure
type ApiResponse struct {
	Status    status          `json:"status"`
	Data      interface{}     `json:"data,omitempty"`
	ErrorType model.ErrorType `json:"errorType,omitempty"`
	Error     string          `json:"error,omitempty"`
}

// todo(remove): Implemented at render package (go.signoz.io/signoz/pkg/http/render) with the new error structure
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

// todo(remove): Implemented at render package (go.signoz.io/signoz/pkg/http/render) with the new error structure
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

	subRouter.HandleFunc("/filter_suggestions", am.ViewAccess(aH.getQueryBuilderSuggestions)).Methods(http.MethodGet)

	// TODO(Raj): Remove this handler after /ws based path has been completely rolled out.
	subRouter.HandleFunc("/query_progress", am.ViewAccess(aH.GetQueryProgressUpdates)).Methods(http.MethodGet)

	// live logs
	subRouter.HandleFunc("/logs/livetail", am.ViewAccess(aH.liveTailLogs)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterWebSocketPaths(router *mux.Router, am *AuthMiddleware) {
	subRouter := router.PathPrefix("/ws").Subrouter()
	subRouter.HandleFunc("/query_progress", am.ViewAccess(aH.GetQueryProgressUpdates)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterQueryRangeV4Routes(router *mux.Router, am *AuthMiddleware) {
	subRouter := router.PathPrefix("/api/v4").Subrouter()
	subRouter.HandleFunc("/query_range", am.ViewAccess(aH.QueryRangeV4)).Methods(http.MethodPost)
	subRouter.HandleFunc("/metric/metric_metadata", am.ViewAccess(aH.getMetricMetadata)).Methods(http.MethodGet)
}

// todo(remove): Implemented at render package (go.signoz.io/signoz/pkg/http/render) with the new error structure
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
	router.HandleFunc("/api/v1/rules/{id}/history/stats", am.ViewAccess(aH.getRuleStats)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/rules/{id}/history/timeline", am.ViewAccess(aH.getRuleStateHistory)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/rules/{id}/history/top_contributors", am.ViewAccess(aH.getRuleStateHistoryTopContributors)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/rules/{id}/history/overall_status", am.ViewAccess(aH.getOverallStateTransitions)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/downtime_schedules", am.OpenAccess(aH.listDowntimeSchedules)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/downtime_schedules/{id}", am.OpenAccess(aH.getDowntimeSchedule)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/downtime_schedules", am.OpenAccess(aH.createDowntimeSchedule)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/downtime_schedules/{id}", am.OpenAccess(aH.editDowntimeSchedule)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/downtime_schedules/{id}", am.OpenAccess(aH.deleteDowntimeSchedule)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/dashboards", am.ViewAccess(aH.getDashboards)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards", am.EditAccess(aH.createDashboards)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/dashboards/{uuid}", am.ViewAccess(aH.getDashboard)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards/{uuid}", am.EditAccess(aH.updateDashboard)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/dashboards/{uuid}", am.EditAccess(aH.deleteDashboard)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v2/variables/query", am.ViewAccess(aH.queryDashboardVarsV2)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/explorer/views", am.ViewAccess(aH.getSavedViews)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/explorer/views", am.EditAccess(aH.createSavedViews)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.ViewAccess(aH.getSavedView)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.EditAccess(aH.updateSavedView)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.EditAccess(aH.deleteSavedView)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/feedback", am.OpenAccess(aH.submitFeedback)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/event", am.ViewAccess(aH.registerEvent)).Methods(http.MethodPost)

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

	// === Preference APIs ===

	// user actions
	router.HandleFunc("/api/v1/user/preferences", am.ViewAccess(aH.getAllUserPreferences)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/user/preferences/{preferenceId}", am.ViewAccess(aH.getUserPreference)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/user/preferences/{preferenceId}", am.ViewAccess(aH.updateUserPreference)).Methods(http.MethodPut)

	// org actions
	router.HandleFunc("/api/v1/org/preferences", am.AdminAccess(aH.getAllOrgPreferences)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/org/preferences/{preferenceId}", am.AdminAccess(aH.getOrgPreference)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/org/preferences/{preferenceId}", am.AdminAccess(aH.updateOrgPreference)).Methods(http.MethodPut)

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

// populateTemporality adds the temporality to the query if it is not present
func (aH *APIHandler) PopulateTemporality(ctx context.Context, qp *v3.QueryRangeParamsV3) error {

	aH.temporalityMux.Lock()
	defer aH.temporalityMux.Unlock()

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

func (aH *APIHandler) listDowntimeSchedules(w http.ResponseWriter, r *http.Request) {
	schedules, err := aH.ruleManager.RuleDB().GetAllPlannedMaintenance(r.Context())
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// The schedules are stored as JSON in the database, so we need to filter them here
	// Since the number of schedules is expected to be small, this should be fine

	if r.URL.Query().Get("active") != "" {
		activeSchedules := make([]rules.PlannedMaintenance, 0)
		active, _ := strconv.ParseBool(r.URL.Query().Get("active"))
		for _, schedule := range schedules {
			now := time.Now().In(time.FixedZone(schedule.Schedule.Timezone, 0))
			if schedule.IsActive(now) == active {
				activeSchedules = append(activeSchedules, schedule)
			}
		}
		schedules = activeSchedules
	}

	if r.URL.Query().Get("recurring") != "" {
		recurringSchedules := make([]rules.PlannedMaintenance, 0)
		recurring, _ := strconv.ParseBool(r.URL.Query().Get("recurring"))
		for _, schedule := range schedules {
			if schedule.IsRecurring() == recurring {
				recurringSchedules = append(recurringSchedules, schedule)
			}
		}
		schedules = recurringSchedules
	}

	aH.Respond(w, schedules)
}

func (aH *APIHandler) getDowntimeSchedule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	schedule, err := aH.ruleManager.RuleDB().GetPlannedMaintenanceByID(r.Context(), id)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, schedule)
}

func (aH *APIHandler) createDowntimeSchedule(w http.ResponseWriter, r *http.Request) {
	var schedule rules.PlannedMaintenance
	err := json.NewDecoder(r.Body).Decode(&schedule)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	if err := schedule.Validate(); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	_, err = aH.ruleManager.RuleDB().CreatePlannedMaintenance(r.Context(), schedule)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, nil)
}

func (aH *APIHandler) editDowntimeSchedule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var schedule rules.PlannedMaintenance
	err := json.NewDecoder(r.Body).Decode(&schedule)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	if err := schedule.Validate(); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	_, err = aH.ruleManager.RuleDB().EditPlannedMaintenance(r.Context(), schedule, id)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, nil)
}

func (aH *APIHandler) deleteDowntimeSchedule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	_, err := aH.ruleManager.RuleDB().DeletePlannedMaintenance(r.Context(), id)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, nil)
}

func (aH *APIHandler) getRuleStats(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	params := model.QueryRuleStateHistory{}
	err := json.NewDecoder(r.Body).Decode(&params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	totalCurrentTriggers, err := aH.reader.GetTotalTriggers(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	currentTriggersSeries, err := aH.reader.GetTriggersByInterval(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	currentAvgResolutionTime, err := aH.reader.GetAvgResolutionTime(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	currentAvgResolutionTimeSeries, err := aH.reader.GetAvgResolutionTimeByInterval(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	if params.End-params.Start >= 86400000 {
		days := int64(math.Ceil(float64(params.End-params.Start) / 86400000))
		params.Start -= days * 86400000
		params.End -= days * 86400000
	} else {
		params.Start -= 86400000
		params.End -= 86400000
	}

	totalPastTriggers, err := aH.reader.GetTotalTriggers(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	pastTriggersSeries, err := aH.reader.GetTriggersByInterval(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	pastAvgResolutionTime, err := aH.reader.GetAvgResolutionTime(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	pastAvgResolutionTimeSeries, err := aH.reader.GetAvgResolutionTimeByInterval(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	if math.IsNaN(currentAvgResolutionTime) || math.IsInf(currentAvgResolutionTime, 0) {
		currentAvgResolutionTime = 0
	}
	if math.IsNaN(pastAvgResolutionTime) || math.IsInf(pastAvgResolutionTime, 0) {
		pastAvgResolutionTime = 0
	}

	stats := model.Stats{
		TotalCurrentTriggers:           totalCurrentTriggers,
		TotalPastTriggers:              totalPastTriggers,
		CurrentTriggersSeries:          currentTriggersSeries,
		PastTriggersSeries:             pastTriggersSeries,
		CurrentAvgResolutionTime:       strconv.FormatFloat(currentAvgResolutionTime, 'f', -1, 64),
		PastAvgResolutionTime:          strconv.FormatFloat(pastAvgResolutionTime, 'f', -1, 64),
		CurrentAvgResolutionTimeSeries: currentAvgResolutionTimeSeries,
		PastAvgResolutionTimeSeries:    pastAvgResolutionTimeSeries,
	}

	aH.Respond(w, stats)
}

func (aH *APIHandler) getOverallStateTransitions(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	params := model.QueryRuleStateHistory{}
	err := json.NewDecoder(r.Body).Decode(&params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	stateItems, err := aH.reader.GetOverallStateTransitions(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, stateItems)
}

func (aH *APIHandler) metaForLinks(ctx context.Context, rule *rules.GettableRule) ([]v3.FilterItem, []v3.AttributeKey, map[string]v3.AttributeKey) {
	filterItems := []v3.FilterItem{}
	groupBy := []v3.AttributeKey{}
	keys := make(map[string]v3.AttributeKey)

	if rule.AlertType == rules.AlertTypeLogs {
		logFields, err := aH.reader.GetLogFields(ctx)
		if err == nil {
			params := &v3.QueryRangeParamsV3{
				CompositeQuery: rule.RuleCondition.CompositeQuery,
			}
			keys = model.GetLogFieldsV3(ctx, params, logFields)
		} else {
			zap.L().Error("failed to get log fields using empty keys; the link might not work as expected", zap.Error(err))
		}
	} else if rule.AlertType == rules.AlertTypeTraces {
		traceFields, err := aH.reader.GetSpanAttributeKeys(ctx)
		if err == nil {
			keys = traceFields
		} else {
			zap.L().Error("failed to get span attributes using empty keys; the link might not work as expected", zap.Error(err))
		}
	}

	if rule.AlertType == rules.AlertTypeLogs || rule.AlertType == rules.AlertTypeTraces {
		if rule.RuleCondition.CompositeQuery != nil {
			if rule.RuleCondition.QueryType() == v3.QueryTypeBuilder {
				selectedQuery := rule.RuleCondition.GetSelectedQueryName()
				if rule.RuleCondition.CompositeQuery.BuilderQueries[selectedQuery] != nil &&
					rule.RuleCondition.CompositeQuery.BuilderQueries[selectedQuery].Filters != nil {
					filterItems = rule.RuleCondition.CompositeQuery.BuilderQueries[selectedQuery].Filters.Items
				}
				if rule.RuleCondition.CompositeQuery.BuilderQueries[selectedQuery] != nil &&
					rule.RuleCondition.CompositeQuery.BuilderQueries[selectedQuery].GroupBy != nil {
					groupBy = rule.RuleCondition.CompositeQuery.BuilderQueries[selectedQuery].GroupBy
				}
			}
		}
	}
	return filterItems, groupBy, keys
}

func (aH *APIHandler) getRuleStateHistory(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	params := model.QueryRuleStateHistory{}
	err := json.NewDecoder(r.Body).Decode(&params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	if err := params.Validate(); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	res, err := aH.reader.ReadRuleStateHistoryByRuleID(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	rule, err := aH.ruleManager.GetRule(r.Context(), ruleID)
	if err == nil {
		for idx := range res.Items {
			lbls := make(map[string]string)
			err := json.Unmarshal([]byte(res.Items[idx].Labels), &lbls)
			if err != nil {
				continue
			}
			filterItems, groupBy, keys := aH.metaForLinks(r.Context(), rule)
			newFilters := contextlinks.PrepareFilters(lbls, filterItems, groupBy, keys)
			end := time.Unix(res.Items[idx].UnixMilli/1000, 0)
			// why are we subtracting 3 minutes?
			// the query range is calculated based on the rule's evalWindow and evalDelay
			// alerts have 2 minutes delay built in, so we need to subtract that from the start time
			// to get the correct query range
			start := end.Add(-time.Duration(rule.EvalWindow)).Add(-3 * time.Minute)
			if rule.AlertType == rules.AlertTypeLogs {
				res.Items[idx].RelatedLogsLink = contextlinks.PrepareLinksToLogs(start, end, newFilters)
			} else if rule.AlertType == rules.AlertTypeTraces {
				res.Items[idx].RelatedTracesLink = contextlinks.PrepareLinksToTraces(start, end, newFilters)
			}
		}
	}

	aH.Respond(w, res)
}

func (aH *APIHandler) getRuleStateHistoryTopContributors(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	params := model.QueryRuleStateHistory{}
	err := json.NewDecoder(r.Body).Decode(&params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	res, err := aH.reader.ReadRuleStateHistoryTopContributorsByRuleID(r.Context(), ruleID, &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	rule, err := aH.ruleManager.GetRule(r.Context(), ruleID)
	if err == nil {
		for idx := range res {
			lbls := make(map[string]string)
			err := json.Unmarshal([]byte(res[idx].Labels), &lbls)
			if err != nil {
				continue
			}
			filterItems, groupBy, keys := aH.metaForLinks(r.Context(), rule)
			newFilters := contextlinks.PrepareFilters(lbls, filterItems, groupBy, keys)
			end := time.Unix(params.End/1000, 0)
			start := time.Unix(params.Start/1000, 0)
			if rule.AlertType == rules.AlertTypeLogs {
				res[idx].RelatedLogsLink = contextlinks.PrepareLinksToLogs(start, end, newFilters)
			} else if rule.AlertType == rules.AlertTypeTraces {
				res[idx].RelatedTracesLink = contextlinks.PrepareLinksToTraces(start, end, newFilters)
			}
		}
	}

	aH.Respond(w, res)
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
	if err != nil {
		zap.L().Error("failed to get dashboards for installed integrations", zap.Error(err))
	}
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
			return "", fmt.Errorf("operation %s is not allowed", op)
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
	channel, apiErrorObj := aH.ruleManager.RuleDB().GetChannel(id)
	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}
	aH.Respond(w, channel)
}

func (aH *APIHandler) deleteChannel(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	apiErrorObj := aH.ruleManager.RuleDB().DeleteChannel(id)
	if apiErrorObj != nil {
		RespondError(w, apiErrorObj, nil)
		return
	}
	aH.Respond(w, "notification channel successfully deleted")
}

func (aH *APIHandler) listChannels(w http.ResponseWriter, r *http.Request) {
	channels, apiErrorObj := aH.ruleManager.RuleDB().GetChannels()
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

	_, apiErrorObj := aH.ruleManager.RuleDB().EditChannel(receiver, id)

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

	_, apiErrorObj := aH.ruleManager.RuleDB().CreateChannel(receiver)

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
			RespondError(w, &model.ApiError{Typ: model.ErrorCanceled, Err: res.Err}, nil)
		case promql.ErrQueryTimeout:
			RespondError(w, &model.ApiError{Typ: model.ErrorTimeout, Err: res.Err}, nil)
		}
		RespondError(w, &model.ApiError{Typ: model.ErrorExec, Err: res.Err}, nil)
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
			RespondError(w, &model.ApiError{Typ: model.ErrorCanceled, Err: res.Err}, nil)
		case promql.ErrQueryTimeout:
			RespondError(w, &model.ApiError{Typ: model.ErrorTimeout, Err: res.Err}, nil)
		}
		RespondError(w, &model.ApiError{Typ: model.ErrorExec, Err: res.Err}, nil)
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
		telemetry.GetInstance().SendEvent(request.EventName, request.Attributes, userEmail, request.RateLimited, true)
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
	var services []string

	type topLevelOpsParams struct {
		Service string `json:"service"`
		Start   string `json:"start"`
		End     string `json:"end"`
	}

	var params topLevelOpsParams
	err := json.NewDecoder(r.Body).Decode(&params)
	if err != nil {
		zap.L().Error("Error in getting req body for get top operations API", zap.Error(err))
	}

	if params.Service != "" {
		services = []string{params.Service}
	}

	startEpoch := params.Start
	if startEpoch != "" {
		startEpochInt, err := strconv.ParseInt(startEpoch, 10, 64)
		if err != nil {
			RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading start time")
			return
		}
		start = time.Unix(0, startEpochInt)
	}
	endEpoch := params.End
	if endEpoch != "" {
		endEpochInt, err := strconv.ParseInt(endEpoch, 10, 64)
		if err != nil {
			RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading end time")
			return
		}
		end = time.Unix(0, endEpochInt)
	}

	result, apiErr := aH.reader.GetTopLevelOperations(r.Context(), aH.skipConfig, start, end, services)
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

	params, err := ParseSearchTracesParams(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading params")
		return
	}

	result, err := aH.reader.SearchTraces(r.Context(), params, nil)
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
			Err: errors.New("user not found"),
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
			Err: errors.New("no user found"),
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
			Err: errors.New("no user found"),
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
				Err: errors.New("cannot demote the last admin"),
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
	if err != nil {
		zap.L().Error("failed to get user email from jwt", zap.Error(err))
	}
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

// RegisterMessagingQueuesRoutes adds messaging-queues routes
func (aH *APIHandler) RegisterMessagingQueuesRoutes(router *mux.Router, am *AuthMiddleware) {

	// SubRouter for kafka
	kafkaRouter := router.PathPrefix("/api/v1/messaging-queues/kafka").Subrouter()

	consumerLagRouter := kafkaRouter.PathPrefix("/consumer-lag").Subrouter()
	consumerLagRouter.HandleFunc("/producer-details", am.ViewAccess(aH.getProducerData)).Methods(http.MethodPost)
	consumerLagRouter.HandleFunc("/consumer-details", am.ViewAccess(aH.getConsumerData)).Methods(http.MethodPost)
	consumerLagRouter.HandleFunc("/network-latency", am.ViewAccess(aH.getNetworkData)).Methods(http.MethodPost)

	onboardingRouter := kafkaRouter.PathPrefix("/onboarding").Subrouter()
	onboardingRouter.HandleFunc("/producers", am.ViewAccess(aH.onboardProducers)).Methods(http.MethodPost)
	onboardingRouter.HandleFunc("/consumers", am.ViewAccess(aH.onboardConsumers)).Methods(http.MethodPost)
	onboardingRouter.HandleFunc("/kafka", am.ViewAccess(aH.onboardKafka)).Methods(http.MethodPost)

	// for other messaging queues, add SubRouters here
}

// not using md5 hashing as the plain string would work
func uniqueIdentifier(clientID, serviceInstanceID, serviceName, separator string) string {
	return clientID + separator + serviceInstanceID + separator + serviceName
}

func (aH *APIHandler) onboardProducers(

	w http.ResponseWriter, r *http.Request,

) {
	messagingQueue, apiErr := ParseMessagingQueueBody(r)
	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	chq, err := mq.BuildClickHouseQuery(messagingQueue, mq.KafkaQueue, "onboard_producers")

	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)

	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, err)
		return
	}

	var entries []mq.OnboardingResponse

	for _, result := range results {

		for key, value := range result.Data {
			var message, attribute, status string

			intValue := int(*value.(*uint8))

			if key == "entries" {
				attribute = "telemetry ingestion"
				if intValue != 0 {
					entries = nil
					entry := mq.OnboardingResponse{
						Attribute: attribute,
						Message:   "No data available in the given time range",
						Status:    "0",
					}
					entries = append(entries, entry)
					break
				} else {
					status = "1"
				}
			} else if key == "queue" {
				attribute = "messaging.system"
				if intValue != 0 {
					status = "0"
					message = "messaging.system attribute is not present or not equal to kafka in your spans"
				} else {
					status = "1"
				}
			} else if key == "kind" {
				attribute = "kind"
				if intValue != 0 {
					status = "0"
					message = "check if your producer spans has kind=4 as attribute"
				} else {
					status = "1"
				}
			} else if key == "destination" {
				attribute = "messaging.destination.name"
				if intValue != 0 {
					status = "0"
					message = "messaging.destination.name attribute is not present in your spans"
				} else {
					status = "1"
				}
			} else if key == "partition" {
				attribute = "messaging.destination.partition.id"
				if intValue != 0 {
					status = "0"
					message = "messaging.destination.partition.id attribute is not present in your spans"
				} else {
					status = "1"
				}
			}

			entry := mq.OnboardingResponse{
				Attribute: attribute,
				Message:   message,
				Status:    status,
			}

			entries = append(entries, entry)
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Attribute < entries[j].Attribute
	})

	aH.Respond(w, entries)
}

func (aH *APIHandler) onboardConsumers(

	w http.ResponseWriter, r *http.Request,

) {
	messagingQueue, apiErr := ParseMessagingQueueBody(r)
	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	chq, err := mq.BuildClickHouseQuery(messagingQueue, mq.KafkaQueue, "onboard_consumers")

	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	result, err := aH.reader.GetListResultV3(r.Context(), chq.Query)

	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, err)
		return
	}

	var entries []mq.OnboardingResponse

	for _, result := range result {
		for key, value := range result.Data {
			var message, attribute, status string

			intValue := int(*value.(*uint8))

			if key == "entries" {
				attribute = "telemetry ingestion"
				if intValue != 0 {
					entries = nil
					entry := mq.OnboardingResponse{
						Attribute: attribute,
						Message:   "No data available in the given time range",
						Status:    "0",
					}
					entries = append(entries, entry)
					break
				} else {
					status = "1"
				}
			} else if key == "queue" {
				attribute = "messaging.system"
				if intValue != 0 {
					status = "0"
					message = "messaging.system attribute is not present or not equal to kafka in your spans"
				} else {
					status = "1"
				}
			} else if key == "kind" {
				attribute = "kind"
				if intValue != 0 {
					status = "0"
					message = "check if your consumer spans has kind=5 as attribute"
				} else {
					status = "1"
				}
			} else if key == "destination" {
				attribute = "messaging.destination.name"
				if intValue != 0 {
					status = "0"
					message = "messaging.destination.name attribute is not present in your spans"
				} else {
					status = "1"
				}
			} else if key == "partition" {
				attribute = "messaging.destination.partition.id"
				if intValue != 0 {
					status = "0"
					message = "messaging.destination.partition.id attribute is not present in your spans"
				} else {
					status = "1"
				}
			} else if key == "svc" {
				attribute = "service_name"
				if intValue != 0 {
					status = "0"
					message = "service_name attribute is not present in your spans"
				} else {
					status = "1"
				}
			} else if key == "cgroup" {
				attribute = "messaging.kafka.consumer.group"
				if intValue != 0 {
					status = "0"
					message = "messaging.kafka.consumer.group attribute is not present in your spans"
				} else {
					status = "1"
				}
			} else if key == "bodysize" {
				attribute = "messaging.message.body.size"
				if intValue != 0 {
					status = "0"
					message = "messaging.message.body.size attribute is not present in your spans"
				} else {
					status = "1"
				}
			} else if key == "clientid" {
				attribute = "messaging.client_id"
				if intValue != 0 {
					status = "0"
					message = "messaging.client_id attribute is not present in your spans"
				} else {
					status = "1"
				}
			} else if key == "instanceid" {
				attribute = "service.instance.id"
				if intValue != 0 {
					status = "0"
					message = "service.instance.id attribute is not present in your spans"
				} else {
					status = "1"
				}
			}

			entry := mq.OnboardingResponse{
				Attribute: attribute,
				Message:   message,
				Status:    status,
			}
			entries = append(entries, entry)
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Attribute < entries[j].Attribute
	})

	aH.Respond(w, entries)
}

func (aH *APIHandler) onboardKafka(

	w http.ResponseWriter, r *http.Request,

) {
	messagingQueue, apiErr := ParseMessagingQueueBody(r)
	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	chq, err := mq.BuildClickHouseQuery(messagingQueue, mq.KafkaQueue, "onboard_kafka")

	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	result, err := aH.reader.GetListResultV3(r.Context(), chq.Query)

	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, err)
		return
	}

	var entries []mq.OnboardingResponse

	for _, result := range result {
		for key, value := range result.Data {
			var message, attribute, status string

			intValue := int(*value.(*uint8))

			if key == "entries" {
				attribute = "telemetry ingestion"
				if intValue != 0 {
					entries = nil
					entry := mq.OnboardingResponse{
						Attribute: attribute,
						Message:   "No data available in the given time range",
						Status:    "0",
					}
					entries = append(entries, entry)
					break
				} else {
					status = "1"
				}
			} else if key == "fetchlatency" {
				attribute = "kafka_consumer_fetch_latency_avg"
				if intValue != 0 {
					status = "0"
					message = "Metric kafka_consumer_fetch_latency_avg is not present in the given time range."
				} else {
					status = "1"
				}
			} else if key == "grouplag" {
				attribute = "kafka_consumer_group_lag"
				if intValue != 0 {
					status = "0"
					message = "Metric kafka_consumer_group_lag is not present in the given time range."
				} else {
					status = "1"
				}
			}

			entry := mq.OnboardingResponse{
				Attribute: attribute,
				Message:   message,
				Status:    status,
			}
			entries = append(entries, entry)
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Attribute < entries[j].Attribute
	})

	aH.Respond(w, entries)
}

func (aH *APIHandler) getNetworkData(
	w http.ResponseWriter, r *http.Request,
) {
	attributeCache := &mq.Clients{
		Hash: make(map[string]struct{}),
	}
	messagingQueue, apiErr := ParseMessagingQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := mq.BuildQRParamsNetwork(messagingQueue, "throughput", attributeCache)
	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}
	if err := validateQueryRangeParamsV3(queryRangeParams); err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	var result []*v3.Result
	var errQueriesByName map[string]error

	result, errQueriesByName, err = aH.querierV2.QueryRange(r.Context(), queryRangeParams)
	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQueriesByName)
		return
	}

	for _, res := range result {
		for _, series := range res.Series {
			clientID, clientIDOk := series.Labels["client_id"]
			serviceInstanceID, serviceInstanceIDOk := series.Labels["service_instance_id"]
			serviceName, serviceNameOk := series.Labels["service_name"]
			hashKey := uniqueIdentifier(clientID, serviceInstanceID, serviceName, "#")
			_, ok := attributeCache.Hash[hashKey]
			if clientIDOk && serviceInstanceIDOk && serviceNameOk && !ok {
				attributeCache.Hash[hashKey] = struct{}{}
				attributeCache.ClientID = append(attributeCache.ClientID, clientID)
				attributeCache.ServiceInstanceID = append(attributeCache.ServiceInstanceID, serviceInstanceID)
				attributeCache.ServiceName = append(attributeCache.ServiceName, serviceName)
			}
		}
	}

	queryRangeParams, err = mq.BuildQRParamsNetwork(messagingQueue, "fetch-latency", attributeCache)
	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}
	if err := validateQueryRangeParamsV3(queryRangeParams); err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	resultFetchLatency, errQueriesByNameFetchLatency, err := aH.querierV2.QueryRange(r.Context(), queryRangeParams)
	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQueriesByNameFetchLatency)
		return
	}

	latencyColumn := &v3.Result{QueryName: "latency"}
	var latencySeries []*v3.Series
	for _, res := range resultFetchLatency {
		for _, series := range res.Series {
			clientID, clientIDOk := series.Labels["client_id"]
			serviceInstanceID, serviceInstanceIDOk := series.Labels["service_instance_id"]
			serviceName, serviceNameOk := series.Labels["service_name"]
			hashKey := uniqueIdentifier(clientID, serviceInstanceID, serviceName, "#")
			_, ok := attributeCache.Hash[hashKey]
			if clientIDOk && serviceInstanceIDOk && serviceNameOk && ok {
				latencySeries = append(latencySeries, series)
			}
		}
	}

	latencyColumn.Series = latencySeries
	result = append(result, latencyColumn)

	resultFetchLatency = postprocess.TransformToTableForBuilderQueries(result, queryRangeParams)

	resp := v3.QueryRangeResponse{
		Result: resultFetchLatency,
	}
	aH.Respond(w, resp)
}

func (aH *APIHandler) getProducerData(
	w http.ResponseWriter, r *http.Request,
) {
	// parse the query params to retrieve the messaging queue struct
	messagingQueue, apiErr := ParseMessagingQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := mq.BuildQueryRangeParams(messagingQueue, "producer")
	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	if err := validateQueryRangeParamsV3(queryRangeParams); err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	var result []*v3.Result
	var errQuriesByName map[string]error

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), queryRangeParams)
	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}
	result = postprocess.TransformToTableForClickHouseQueries(result)

	resp := v3.QueryRangeResponse{
		Result: result,
	}
	aH.Respond(w, resp)
}

func (aH *APIHandler) getConsumerData(
	w http.ResponseWriter, r *http.Request,
) {
	messagingQueue, apiErr := ParseMessagingQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := mq.BuildQueryRangeParams(messagingQueue, "consumer")
	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	if err := validateQueryRangeParamsV3(queryRangeParams); err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	var result []*v3.Result
	var errQuriesByName map[string]error

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), queryRangeParams)
	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}
	result = postprocess.TransformToTableForClickHouseQueries(result)

	resp := v3.QueryRangeResponse{
		Result: result,
	}
	aH.Respond(w, resp)
}

// ParseMessagingQueueBody parse for messaging queue params
func ParseMessagingQueueBody(r *http.Request) (*mq.MessagingQueue, *model.ApiError) {
	messagingQueue := new(mq.MessagingQueue)
	if err := json.NewDecoder(r.Body).Decode(messagingQueue); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}
	return messagingQueue, nil
}

// Preferences

func (aH *APIHandler) getUserPreference(
	w http.ResponseWriter, r *http.Request,
) {
	preferenceId := mux.Vars(r)["preferenceId"]
	user := common.GetUserFromContext(r.Context())

	preference, apiErr := preferences.GetUserPreference(
		r.Context(), preferenceId, user.User.OrgId, user.User.Id,
	)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, preference)
}

func (aH *APIHandler) updateUserPreference(
	w http.ResponseWriter, r *http.Request,
) {
	preferenceId := mux.Vars(r)["preferenceId"]
	user := common.GetUserFromContext(r.Context())
	req := preferences.UpdatePreference{}

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}
	preference, apiErr := preferences.UpdateUserPreference(r.Context(), preferenceId, req.PreferenceValue, user.User.Id)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, preference)
}

func (aH *APIHandler) getAllUserPreferences(
	w http.ResponseWriter, r *http.Request,
) {
	user := common.GetUserFromContext(r.Context())
	preference, apiErr := preferences.GetAllUserPreferences(
		r.Context(), user.User.OrgId, user.User.Id,
	)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, preference)
}

func (aH *APIHandler) getOrgPreference(
	w http.ResponseWriter, r *http.Request,
) {
	preferenceId := mux.Vars(r)["preferenceId"]
	user := common.GetUserFromContext(r.Context())
	preference, apiErr := preferences.GetOrgPreference(
		r.Context(), preferenceId, user.User.OrgId,
	)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, preference)
}

func (aH *APIHandler) updateOrgPreference(
	w http.ResponseWriter, r *http.Request,
) {
	preferenceId := mux.Vars(r)["preferenceId"]
	req := preferences.UpdatePreference{}
	user := common.GetUserFromContext(r.Context())

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}
	preference, apiErr := preferences.UpdateOrgPreference(r.Context(), preferenceId, req.PreferenceValue, user.User.OrgId)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, preference)
}

func (aH *APIHandler) getAllOrgPreferences(
	w http.ResponseWriter, r *http.Request,
) {
	user := common.GetUserFromContext(r.Context())
	preference, apiErr := preferences.GetAllOrgPreferences(
		r.Context(), user.User.OrgId,
	)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, preference)
}

// RegisterIntegrationRoutes Registers all Integrations
func (aH *APIHandler) RegisterIntegrationRoutes(router *mux.Router, am *AuthMiddleware) {
	subRouter := router.PathPrefix("/api/v1/integrations").Subrouter()

	subRouter.HandleFunc(
		"/install", am.ViewAccess(aH.InstallIntegration),
	).Methods(http.MethodPost)

	subRouter.HandleFunc(
		"/uninstall", am.ViewAccess(aH.UninstallIntegration),
	).Methods(http.MethodPost)

	// Used for polling for status in v0
	subRouter.HandleFunc(
		"/{integrationId}/connection_status", am.ViewAccess(aH.GetIntegrationConnectionStatus),
	).Methods(http.MethodGet)

	subRouter.HandleFunc(
		"/{integrationId}", am.ViewAccess(aH.GetIntegration),
	).Methods(http.MethodGet)

	subRouter.HandleFunc(
		"", am.ViewAccess(aH.ListIntegrations),
	).Methods(http.MethodGet)
}

func (aH *APIHandler) ListIntegrations(
	w http.ResponseWriter, r *http.Request,
) {
	params := map[string]string{}
	for k, values := range r.URL.Query() {
		params[k] = values[0]
	}

	resp, apiErr := aH.IntegrationsController.ListIntegrations(
		r.Context(), params,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch integrations")
		return
	}
	aH.Respond(w, resp)
}

func (aH *APIHandler) GetIntegration(
	w http.ResponseWriter, r *http.Request,
) {
	integrationId := mux.Vars(r)["integrationId"]
	integration, apiErr := aH.IntegrationsController.GetIntegration(
		r.Context(), integrationId,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch integration details")
		return
	}

	aH.Respond(w, integration)
}

func (aH *APIHandler) GetIntegrationConnectionStatus(
	w http.ResponseWriter, r *http.Request,
) {
	integrationId := mux.Vars(r)["integrationId"]
	isInstalled, apiErr := aH.IntegrationsController.IsIntegrationInstalled(
		r.Context(), integrationId,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "failed to check if integration is installed")
		return
	}

	// Do not spend resources calculating connection status unless installed.
	if !isInstalled {
		aH.Respond(w, &integrations.IntegrationConnectionStatus{})
		return
	}

	connectionTests, apiErr := aH.IntegrationsController.GetIntegrationConnectionTests(
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

	connectionStatus, apiErr := aH.calculateConnectionStatus(
		r.Context(), connectionTests, lookbackSeconds,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to calculate integration connection status")
		return
	}

	aH.Respond(w, connectionStatus)
}

func (aH *APIHandler) calculateConnectionStatus(
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

		logsConnStatus, apiErr := aH.calculateLogsConnectionStatus(
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

		statusForLastReceivedMetric, apiErr := aH.reader.GetLatestReceivedMetric(
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

func (aH *APIHandler) calculateLogsConnectionStatus(
	ctx context.Context,
	logsConnectionTest *integrations.LogsConnectionTest,
	lookbackSeconds int64,
) (*integrations.SignalConnectionStatus, *model.ApiError) {
	if logsConnectionTest == nil {
		return nil, nil
	}

	logsConnTestFilter := &v3.FilterSet{
		Operator: "AND",
		Items: []v3.FilterItem{
			{
				Key: v3.AttributeKey{
					Key:      logsConnectionTest.AttributeKey,
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeTag,
				},
				Operator: "=",
				Value:    logsConnectionTest.AttributeValue,
			},
		},
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
					Filters:           logsConnTestFilter,
					QueryName:         "A",
					DataSource:        v3.DataSourceLogs,
					Expression:        "A",
					AggregateOperator: v3.AggregateOperatorNoOp,
				},
			},
		},
	}
	queryRes, _, err := aH.querier.QueryRange(
		ctx, qrParams,
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

func (aH *APIHandler) InstallIntegration(
	w http.ResponseWriter, r *http.Request,
) {
	req := integrations.InstallIntegrationRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	integration, apiErr := aH.IntegrationsController.Install(
		r.Context(), &req,
	)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, integration)
}

func (aH *APIHandler) UninstallIntegration(
	w http.ResponseWriter, r *http.Request,
) {
	req := integrations.UninstallIntegrationRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	apiErr := aH.IntegrationsController.Uninstall(r.Context(), &req)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, map[string]interface{}{})
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
		RespondError(w, apiErr, "Failed to update field in the DB")
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

func (aH *APIHandler) PreviewLogsPipelinesHandler(w http.ResponseWriter, r *http.Request) {
	req := logparsingpipeline.PipelinesPreviewRequest{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	resultLogs, apiErr := aH.LogsParsingPipelineController.PreviewLogsPipelines(
		r.Context(), &req,
	)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, resultLogs)
}

func (aH *APIHandler) ListLogsPipelinesHandler(w http.ResponseWriter, r *http.Request) {

	version, err := parseAgentConfigVersion(r)
	if err != nil {
		RespondError(w, model.WrapApiError(err, "Failed to parse agent config version"), nil)
		return
	}

	var payload *logparsingpipeline.PipelinesResponse
	var apierr *model.ApiError

	if version != -1 {
		payload, apierr = aH.listLogsPipelinesByVersion(context.Background(), version)
	} else {
		payload, apierr = aH.listLogsPipelines(context.Background())
	}

	if apierr != nil {
		RespondError(w, apierr, payload)
		return
	}
	aH.Respond(w, payload)
}

// listLogsPipelines lists logs piplines for latest version
func (aH *APIHandler) listLogsPipelines(ctx context.Context) (
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

	payload, err := aH.LogsParsingPipelineController.GetPipelinesByVersion(ctx, latestVersion)
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
func (aH *APIHandler) listLogsPipelinesByVersion(ctx context.Context, version int) (
	*logparsingpipeline.PipelinesResponse, *model.ApiError,
) {
	payload, err := aH.LogsParsingPipelineController.GetPipelinesByVersion(ctx, version)
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

func (aH *APIHandler) CreateLogsPipeline(w http.ResponseWriter, r *http.Request) {

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

		return aH.LogsParsingPipelineController.ApplyPipelines(ctx, postable)
	}

	res, err := createPipeline(r.Context(), req.Pipelines)
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	aH.Respond(w, res)
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

func (aH *APIHandler) getQueryBuilderSuggestions(w http.ResponseWriter, r *http.Request) {
	req, err := parseQBFilterSuggestionsRequest(r)
	if err != nil {
		RespondError(w, err, nil)
		return
	}

	if req.DataSource != v3.DataSourceLogs {
		// Support for traces and metrics might come later
		RespondError(w, model.BadRequest(
			fmt.Errorf("suggestions not supported for %s", req.DataSource),
		), nil)
		return
	}

	response, err := aH.reader.GetQBFilterSuggestionsForLogs(r.Context(), req)
	if err != nil {
		RespondError(w, err, nil)
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
	queryRangeParams.Version = "v3"

	aH.Respond(w, queryRangeParams)
}

func (aH *APIHandler) queryRangeV3(ctx context.Context, queryRangeParams *v3.QueryRangeParamsV3, w http.ResponseWriter, r *http.Request) {

	var result []*v3.Result
	var err error
	var errQuriesByName map[string]error
	var spanKeys map[string]v3.AttributeKey
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		// check if any enrichment is required for logs if yes then enrich them
		if logsv3.EnrichmentRequired(queryRangeParams) {
			logsFields, err := aH.reader.GetLogFields(ctx)
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, errQuriesByName)
				return
			}
			// get the fields if any logs query is present
			fields := model.GetLogFieldsV3(ctx, queryRangeParams, logsFields)
			logsv3.Enrich(queryRangeParams, fields)
		}

		spanKeys, err = aH.getSpanKeysV3(ctx, queryRangeParams)
		if err != nil {
			apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
			RespondError(w, apiErrObj, errQuriesByName)
			return
		}
		tracesV3.Enrich(queryRangeParams, spanKeys)
	}

	// WARN: Only works for AND operator in traces query
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		// check if traceID is used as filter (with equal/similar operator) in traces query if yes add timestamp filter to queryRange params
		isUsed, traceIDs := tracesV3.TraceIdFilterUsedWithEqual(queryRangeParams)
		if isUsed && len(traceIDs) > 0 {
			zap.L().Debug("traceID used as filter in traces query")
			// query signoz_spans table with traceID to get min and max timestamp
			min, max, err := aH.reader.GetMinAndMaxTimestampForTraceID(ctx, traceIDs)
			if err == nil {
				// add timestamp filter to queryRange params
				tracesV3.AddTimestampFilters(min, max, queryRangeParams)
				zap.L().Debug("post adding timestamp filter in traces query", zap.Any("queryRangeParams", queryRangeParams))
			}
		}
	}

	// Hook up query progress tracking if requested
	queryIdHeader := r.Header.Get("X-SIGNOZ-QUERY-ID")
	if len(queryIdHeader) > 0 {
		onQueryFinished, err := aH.reader.ReportQueryStartForProgressTracking(queryIdHeader)

		if err != nil {
			zap.L().Error(
				"couldn't report query start for progress tracking",
				zap.String("queryId", queryIdHeader), zap.Error(err),
			)

		} else {
			// Adding queryId to the context signals clickhouse queries to report progress
			//lint:ignore SA1029 ignore for now
			ctx = context.WithValue(ctx, "queryId", queryIdHeader)

			defer func() {
				go onQueryFinished()
			}()
		}
	}

	result, errQuriesByName, err = aH.querier.QueryRange(ctx, queryRangeParams)

	if err != nil {
		queryErrors := map[string]string{}
		for name, err := range errQuriesByName {
			queryErrors[fmt.Sprintf("Query-%s", name)] = err.Error()
		}
		apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
		RespondError(w, apiErrObj, queryErrors)
		return
	}

	postprocess.ApplyHavingClause(result, queryRangeParams)
	postprocess.ApplyMetricLimit(result, queryRangeParams)

	sendQueryResultEvents(r, result, queryRangeParams)
	// only adding applyFunctions instead of postProcess since experssion are
	// are executed in clickhouse directly and we wanted to add support for timeshift
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		postprocess.ApplyFunctions(result, queryRangeParams)
	}

	if queryRangeParams.CompositeQuery.FillGaps {
		postprocess.FillGaps(result, queryRangeParams)
	}

	if queryRangeParams.CompositeQuery.PanelType == v3.PanelTypeTable && queryRangeParams.FormatForWeb {
		if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL {
			result = postprocess.TransformToTableForClickHouseQueries(result)
		} else if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
			result = postprocess.TransformToTableForBuilderQueries(result, queryRangeParams)
		}
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
	temporalityErr := aH.PopulateTemporality(r.Context(), queryRangeParams)
	if temporalityErr != nil {
		zap.L().Error("Error while adding temporality for metrics", zap.Error(temporalityErr))
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: temporalityErr}, nil)
		return
	}

	aH.queryRangeV3(r.Context(), queryRangeParams, w, r)
}

func (aH *APIHandler) GetQueryProgressUpdates(w http.ResponseWriter, r *http.Request) {
	// Upgrade connection to websocket, sending back the requested protocol
	// value for sec-websocket-protocol
	//
	// Since js websocket API doesn't allow setting headers, this header is often
	// used for passing auth tokens. As per websocket spec the connection will only
	// succeed if the requested `Sec-Websocket-Protocol` is sent back as a header
	// in the upgrade response (signifying that the protocol is supported by the server).
	upgradeResponseHeaders := http.Header{}
	requestedProtocol := r.Header.Get("Sec-WebSocket-Protocol")
	if len(requestedProtocol) > 0 {
		upgradeResponseHeaders.Add("Sec-WebSocket-Protocol", requestedProtocol)
	}

	c, err := aH.Upgrader.Upgrade(w, r, upgradeResponseHeaders)
	if err != nil {
		RespondError(w, model.InternalError(fmt.Errorf(
			"couldn't upgrade connection: %w", err,
		)), nil)
		return
	}
	defer c.Close()

	// Websocket upgrade complete. Subscribe to query progress and send updates to client
	//
	// Note: we handle any subscription problems (queryId query param missing or query already complete etc)
	// after the websocket connection upgrade by closing the channel.
	// The other option would be to handle the errors before websocket upgrade by sending an
	// error response instead of the upgrade response, but that leads to a generic websocket
	// connection failure on the client.

	queryId := r.URL.Query().Get("q")

	progressCh, unsubscribe, apiErr := aH.reader.SubscribeToQueryProgress(queryId)
	if apiErr != nil {
		// Shouldn't happen unless query progress requested after query finished
		zap.L().Warn(
			"couldn't subscribe to query progress",
			zap.String("queryId", queryId), zap.Any("error", apiErr),
		)
		return
	}
	defer func() { go unsubscribe() }()

	for queryProgress := range progressCh {
		msg, err := json.Marshal(queryProgress)
		if err != nil {
			zap.L().Error(
				"failed to serialize progress message",
				zap.String("queryId", queryId), zap.Any("progress", queryProgress), zap.Error(err),
			)
			continue
		}

		err = c.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			zap.L().Error(
				"failed to write progress msg to websocket",
				zap.String("queryId", queryId), zap.String("msg", string(msg)), zap.Error(err),
			)
			break

		} else {
			zap.L().Debug(
				"wrote progress msg to websocket",
				zap.String("queryId", queryId), zap.String("msg", string(msg)), zap.Error(err),
			)
		}
	}
}

func (aH *APIHandler) liveTailLogsV2(w http.ResponseWriter, r *http.Request) {

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
			logsFields, err := aH.reader.GetLogFields(r.Context())
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, nil)
				return
			}
			fields := model.GetLogFieldsV3(r.Context(), queryRangeParams, logsFields)
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

	// create the client
	client := &model.LogsLiveTailClientV2{Name: r.RemoteAddr, Logs: make(chan *model.SignozLogV2, 1000), Done: make(chan *bool), Error: make(chan error)}
	go aH.reader.LiveTailLogsV4(r.Context(), queryString, uint64(queryRangeParams.Start), "", client)
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

func (aH *APIHandler) liveTailLogs(w http.ResponseWriter, r *http.Request) {
	if aH.UseLogsNewSchema {
		aH.liveTailLogsV2(w, r)
		return
	}

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
			logsFields, err := aH.reader.GetLogFields(r.Context())
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, nil)
				return
			}
			// get the fields if any logs query is present
			fields := model.GetLogFieldsV3(r.Context(), queryRangeParams, logsFields)
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
	client := &model.LogsLiveTailClient{Name: r.RemoteAddr, Logs: make(chan *model.SignozLog, 1000), Done: make(chan *bool), Error: make(chan error)}
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
	var errQuriesByName map[string]error
	var spanKeys map[string]v3.AttributeKey
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		// check if any enrichment is required for logs if yes then enrich them
		if logsv3.EnrichmentRequired(queryRangeParams) {
			// get the fields if any logs query is present
			logsFields, err := aH.reader.GetLogFields(r.Context())
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, nil)
				return
			}
			fields := model.GetLogFieldsV3(r.Context(), queryRangeParams, logsFields)
			logsv3.Enrich(queryRangeParams, fields)
		}

		spanKeys, err = aH.getSpanKeysV3(ctx, queryRangeParams)
		if err != nil {
			apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
			RespondError(w, apiErrObj, errQuriesByName)
			return
		}
		tracesV3.Enrich(queryRangeParams, spanKeys)
	}

	// WARN: Only works for AND operator in traces query
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		// check if traceID is used as filter (with equal/similar operator) in traces query if yes add timestamp filter to queryRange params
		isUsed, traceIDs := tracesV3.TraceIdFilterUsedWithEqual(queryRangeParams)
		if isUsed && len(traceIDs) > 0 {
			zap.L().Debug("traceID used as filter in traces query")
			// query signoz_spans table with traceID to get min and max timestamp
			min, max, err := aH.reader.GetMinAndMaxTimestampForTraceID(ctx, traceIDs)
			if err == nil {
				// add timestamp filter to queryRange params
				tracesV3.AddTimestampFilters(min, max, queryRangeParams)
				zap.L().Debug("post adding timestamp filter in traces query", zap.Any("queryRangeParams", queryRangeParams))
			}
		}
	}

	result, errQuriesByName, err = aH.querierV2.QueryRange(ctx, queryRangeParams)

	if err != nil {
		queryErrors := map[string]string{}
		for name, err := range errQuriesByName {
			queryErrors[fmt.Sprintf("Query-%s", name)] = err.Error()
		}
		apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
		RespondError(w, apiErrObj, queryErrors)
		return
	}

	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		result, err = postprocess.PostProcessResult(result, queryRangeParams)
	} else if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL &&
		queryRangeParams.CompositeQuery.PanelType == v3.PanelTypeTable && queryRangeParams.FormatForWeb {
		result = postprocess.TransformToTableForClickHouseQueries(result)
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
	queryRangeParams.Version = "v4"

	// add temporality for each metric
	temporalityErr := aH.PopulateTemporality(r.Context(), queryRangeParams)
	if temporalityErr != nil {
		zap.L().Error("Error while adding temporality for metrics", zap.Error(temporalityErr))
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: temporalityErr}, nil)
		return
	}

	aH.queryRangeV4(r.Context(), queryRangeParams, w, r)
}
