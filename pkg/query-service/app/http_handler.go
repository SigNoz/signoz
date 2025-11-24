package app

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/thirdpartyapi"

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

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/apis/fields"
	errorsV2 "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/prometheus/promql"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	jsoniter "github.com/json-iterator/go"
	_ "modernc.org/sqlite"

	"github.com/SigNoz/signoz/pkg/contextlinks"
	traceFunnelsModule "github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/inframetrics"
	queues2 "github.com/SigNoz/signoz/pkg/query-service/app/integrations/messagingQueues/queues"
	"github.com/SigNoz/signoz/pkg/query-service/app/logs"
	logsv3 "github.com/SigNoz/signoz/pkg/query-service/app/logs/v3"
	logsv4 "github.com/SigNoz/signoz/pkg/query-service/app/logs/v4"
	"github.com/SigNoz/signoz/pkg/query-service/app/metrics"
	metricsv3 "github.com/SigNoz/signoz/pkg/query-service/app/metrics/v3"
	"github.com/SigNoz/signoz/pkg/query-service/app/querier"
	querierV2 "github.com/SigNoz/signoz/pkg/query-service/app/querier/v2"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	tracesV3 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v3"
	tracesV4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/postprocess"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"

	"go.uber.org/zap"

	"github.com/SigNoz/signoz/pkg/query-service/app/integrations/messagingQueues/kafka"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/version"

	querierAPI "github.com/SigNoz/signoz/pkg/querier"
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

// APIHandler implements the query service public API
type APIHandler struct {
	reader       interfaces.Reader
	ruleManager  *rules.Manager
	querier      interfaces.Querier
	querierV2    interfaces.Querier
	queryBuilder *queryBuilder.QueryBuilder

	// temporalityMap is a map of metric name to temporality
	// to avoid fetching temporality for the same metric multiple times
	// querying the v4 table on low cardinal temporality column
	// should be fast but we can still avoid the query if we have the data in memory
	temporalityMap map[string]map[v3.Temporality]bool
	temporalityMux sync.Mutex

	IntegrationsController *integrations.Controller

	CloudIntegrationsController *cloudintegrations.Controller

	LogsParsingPipelineController *logparsingpipeline.LogParsingPipelineController

	// SetupCompleted indicates if SigNoz is ready for general use.
	// at the moment, we mark the app ready when the first user
	// is registers.
	SetupCompleted bool

	// Websocket connection upgrader
	Upgrader *websocket.Upgrader

	hostsRepo      *inframetrics.HostsRepo
	processesRepo  *inframetrics.ProcessesRepo
	podsRepo       *inframetrics.PodsRepo
	nodesRepo      *inframetrics.NodesRepo
	namespacesRepo *inframetrics.NamespacesRepo
	clustersRepo   *inframetrics.ClustersRepo
	// workloads
	deploymentsRepo  *inframetrics.DeploymentsRepo
	daemonsetsRepo   *inframetrics.DaemonSetsRepo
	statefulsetsRepo *inframetrics.StatefulSetsRepo
	jobsRepo         *inframetrics.JobsRepo

	SummaryService *metricsexplorer.SummaryService

	pvcsRepo *inframetrics.PvcsRepo

	AlertmanagerAPI *alertmanager.API

	LicensingAPI licensing.API

	FieldsAPI *fields.API

	QuerierAPI *querierAPI.API

	Signoz *signoz.SigNoz
}

type APIHandlerOpts struct {
	// business data reader e.g. clickhouse
	Reader interfaces.Reader

	// rule manager handles rule crud operations
	RuleManager *rules.Manager

	// Integrations
	IntegrationsController *integrations.Controller

	// Cloud Provider Integrations
	CloudIntegrationsController *cloudintegrations.Controller

	// Log parsing pipelines
	LogsParsingPipelineController *logparsingpipeline.LogParsingPipelineController

	// Flux Interval
	FluxInterval time.Duration

	AlertmanagerAPI *alertmanager.API

	LicensingAPI licensing.API

	FieldsAPI *fields.API

	QuerierAPI *querierAPI.API

	Signoz *signoz.SigNoz
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(opts APIHandlerOpts) (*APIHandler, error) {
	querierOpts := querier.QuerierOptions{
		Reader:       opts.Reader,
		Cache:        opts.Signoz.Cache,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
		FluxInterval: opts.FluxInterval,
	}

	querierOptsV2 := querierV2.QuerierOptions{
		Reader:       opts.Reader,
		Cache:        opts.Signoz.Cache,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
		FluxInterval: opts.FluxInterval,
	}

	querier := querier.NewQuerier(querierOpts)
	querierv2 := querierV2.NewQuerier(querierOptsV2)

	hostsRepo := inframetrics.NewHostsRepo(opts.Reader, querierv2)
	processesRepo := inframetrics.NewProcessesRepo(opts.Reader, querierv2)
	podsRepo := inframetrics.NewPodsRepo(opts.Reader, querierv2)
	nodesRepo := inframetrics.NewNodesRepo(opts.Reader, querierv2)
	namespacesRepo := inframetrics.NewNamespacesRepo(opts.Reader, querierv2)
	clustersRepo := inframetrics.NewClustersRepo(opts.Reader, querierv2)
	deploymentsRepo := inframetrics.NewDeploymentsRepo(opts.Reader, querierv2)
	daemonsetsRepo := inframetrics.NewDaemonSetsRepo(opts.Reader, querierv2)
	statefulsetsRepo := inframetrics.NewStatefulSetsRepo(opts.Reader, querierv2)
	jobsRepo := inframetrics.NewJobsRepo(opts.Reader, querierv2)
	pvcsRepo := inframetrics.NewPvcsRepo(opts.Reader, querierv2)
	summaryService := metricsexplorer.NewSummaryService(opts.Reader, opts.RuleManager, opts.Signoz.Modules.Dashboard)
	//quickFilterModule := quickfilter.NewAPI(opts.QuickFilterModule)

	aH := &APIHandler{
		reader:                        opts.Reader,
		temporalityMap:                make(map[string]map[v3.Temporality]bool),
		ruleManager:                   opts.RuleManager,
		IntegrationsController:        opts.IntegrationsController,
		CloudIntegrationsController:   opts.CloudIntegrationsController,
		LogsParsingPipelineController: opts.LogsParsingPipelineController,
		querier:                       querier,
		querierV2:                     querierv2,
		hostsRepo:                     hostsRepo,
		processesRepo:                 processesRepo,
		podsRepo:                      podsRepo,
		nodesRepo:                     nodesRepo,
		namespacesRepo:                namespacesRepo,
		clustersRepo:                  clustersRepo,
		deploymentsRepo:               deploymentsRepo,
		daemonsetsRepo:                daemonsetsRepo,
		statefulsetsRepo:              statefulsetsRepo,
		jobsRepo:                      jobsRepo,
		pvcsRepo:                      pvcsRepo,
		SummaryService:                summaryService,
		AlertmanagerAPI:               opts.AlertmanagerAPI,
		LicensingAPI:                  opts.LicensingAPI,
		Signoz:                        opts.Signoz,
		FieldsAPI:                     opts.FieldsAPI,
		QuerierAPI:                    opts.QuerierAPI,
	}

	logsQueryBuilder := logsv4.PrepareLogsQuery
	tracesQueryBuilder := tracesV4.PrepareTracesQuery

	builderOpts := queryBuilder.QueryBuilderOptions{
		BuildMetricQuery: metricsv3.PrepareMetricQuery,
		BuildTraceQuery:  tracesQueryBuilder,
		BuildLogQuery:    logsQueryBuilder,
	}
	aH.queryBuilder = queryBuilder.NewQueryBuilder(builderOpts)

	// TODO(nitya): remote this in later for multitenancy.
	orgs, err := opts.Signoz.Modules.OrgGetter.ListByOwnedKeyRange(context.Background())
	if err != nil {
		zap.L().Warn("unexpected error while fetching orgs  while initializing base api handler", zap.Error(err))
	}
	// if the first org with the first user is created then the setup is complete.
	if len(orgs) == 1 {
		count, err := opts.Signoz.Modules.UserGetter.CountByOrgID(context.Background(), orgs[0].ID)
		if err != nil {
			zap.L().Warn("unexpected error while fetch user count while initializing base api handler", zap.Error(err))
		}

		if count > 0 {
			aH.SetupCompleted = true
		}
	}

	aH.Upgrader = &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	return aH, nil
}

// todo(remove): Implemented at render package (github.com/SigNoz/signoz/pkg/http/render) with the new error structure
type structuredResponse struct {
	Data   interface{}       `json:"data"`
	Total  int               `json:"total"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
	Errors []structuredError `json:"errors"`
}

// todo(remove): Implemented at render package (github.com/SigNoz/signoz/pkg/http/render) with the new error structure
type structuredError struct {
	Code int    `json:"code,omitempty"`
	Msg  string `json:"msg"`
}

// todo(remove): Implemented at render package (github.com/SigNoz/signoz/pkg/http/render) with the new error structure
type ApiResponse struct {
	Status    status          `json:"status"`
	Data      interface{}     `json:"data,omitempty"`
	ErrorType model.ErrorType `json:"errorType,omitempty"`
	Error     string          `json:"error,omitempty"`
}

// todo(remove): Implemented at render package (github.com/SigNoz/signoz/pkg/http/render) with the new error structure
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
	case model.ErrorConflict:
		code = http.StatusConflict
	default:
		code = http.StatusInternalServerError
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if n, err := w.Write(b); err != nil {
		zap.L().Error("error writing response", zap.Int("bytesWritten", n), zap.Error(err))
	}
}

// todo(remove): Implemented at render package (github.com/SigNoz/signoz/pkg/http/render) with the new error structure
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

func (aH *APIHandler) RegisterQueryRangeV3Routes(router *mux.Router, am *middleware.AuthZ) {
	subRouter := router.PathPrefix("/api/v3").Subrouter()
	subRouter.HandleFunc("/autocomplete/aggregate_attributes", am.ViewAccess(
		withCacheControl(AutoCompleteCacheControlAge, aH.autocompleteAggregateAttributes))).Methods(http.MethodGet)
	subRouter.HandleFunc("/autocomplete/attribute_keys", am.ViewAccess(
		withCacheControl(AutoCompleteCacheControlAge, aH.autoCompleteAttributeKeys))).Methods(http.MethodGet)
	subRouter.HandleFunc("/autocomplete/attribute_values", am.ViewAccess(
		withCacheControl(AutoCompleteCacheControlAge, aH.autoCompleteAttributeValues))).Methods(http.MethodGet)

	// autocomplete with filters using new endpoints
	// Note: eventually all autocomplete APIs should be migrated to new endpoint with appropriate filters, deprecating the older ones

	subRouter.HandleFunc("/auto_complete/attribute_values", am.ViewAccess(aH.autoCompleteAttributeValuesPost)).Methods(http.MethodPost)

	subRouter.HandleFunc("/query_range", am.ViewAccess(aH.QueryRangeV3)).Methods(http.MethodPost)
	subRouter.HandleFunc("/query_range/format", am.ViewAccess(aH.QueryRangeV3Format)).Methods(http.MethodPost)

	subRouter.HandleFunc("/filter_suggestions", am.ViewAccess(aH.getQueryBuilderSuggestions)).Methods(http.MethodGet)

	// TODO(Raj): Remove this handler after /ws based path has been completely rolled out.
	subRouter.HandleFunc("/query_progress", am.ViewAccess(aH.GetQueryProgressUpdates)).Methods(http.MethodGet)

	// live logs
	subRouter.HandleFunc("/logs/livetail", am.ViewAccess(aH.QuerierAPI.QueryRawStream)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterFieldsRoutes(router *mux.Router, am *middleware.AuthZ) {
	subRouter := router.PathPrefix("/api/v1").Subrouter()

	subRouter.HandleFunc("/fields/keys", am.ViewAccess(aH.FieldsAPI.GetFieldsKeys)).Methods(http.MethodGet)
	subRouter.HandleFunc("/fields/values", am.ViewAccess(aH.FieldsAPI.GetFieldsValues)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterInfraMetricsRoutes(router *mux.Router, am *middleware.AuthZ) {
	hostsSubRouter := router.PathPrefix("/api/v1/hosts").Subrouter()
	hostsSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getHostAttributeKeys)).Methods(http.MethodGet)
	hostsSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getHostAttributeValues)).Methods(http.MethodGet)
	hostsSubRouter.HandleFunc("/list", am.ViewAccess(aH.getHostList)).Methods(http.MethodPost)

	processesSubRouter := router.PathPrefix("/api/v1/processes").Subrouter()
	processesSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getProcessAttributeKeys)).Methods(http.MethodGet)
	processesSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getProcessAttributeValues)).Methods(http.MethodGet)
	processesSubRouter.HandleFunc("/list", am.ViewAccess(aH.getProcessList)).Methods(http.MethodPost)

	podsSubRouter := router.PathPrefix("/api/v1/pods").Subrouter()
	podsSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getPodAttributeKeys)).Methods(http.MethodGet)
	podsSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getPodAttributeValues)).Methods(http.MethodGet)
	podsSubRouter.HandleFunc("/list", am.ViewAccess(aH.getPodList)).Methods(http.MethodPost)

	pvcsSubRouter := router.PathPrefix("/api/v1/pvcs").Subrouter()
	pvcsSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getPvcAttributeKeys)).Methods(http.MethodGet)
	pvcsSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getPvcAttributeValues)).Methods(http.MethodGet)
	pvcsSubRouter.HandleFunc("/list", am.ViewAccess(aH.getPvcList)).Methods(http.MethodPost)

	nodesSubRouter := router.PathPrefix("/api/v1/nodes").Subrouter()
	nodesSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getNodeAttributeKeys)).Methods(http.MethodGet)
	nodesSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getNodeAttributeValues)).Methods(http.MethodGet)
	nodesSubRouter.HandleFunc("/list", am.ViewAccess(aH.getNodeList)).Methods(http.MethodPost)

	namespacesSubRouter := router.PathPrefix("/api/v1/namespaces").Subrouter()
	namespacesSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getNamespaceAttributeKeys)).Methods(http.MethodGet)
	namespacesSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getNamespaceAttributeValues)).Methods(http.MethodGet)
	namespacesSubRouter.HandleFunc("/list", am.ViewAccess(aH.getNamespaceList)).Methods(http.MethodPost)

	clustersSubRouter := router.PathPrefix("/api/v1/clusters").Subrouter()
	clustersSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getClusterAttributeKeys)).Methods(http.MethodGet)
	clustersSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getClusterAttributeValues)).Methods(http.MethodGet)
	clustersSubRouter.HandleFunc("/list", am.ViewAccess(aH.getClusterList)).Methods(http.MethodPost)

	deploymentsSubRouter := router.PathPrefix("/api/v1/deployments").Subrouter()
	deploymentsSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getDeploymentAttributeKeys)).Methods(http.MethodGet)
	deploymentsSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getDeploymentAttributeValues)).Methods(http.MethodGet)
	deploymentsSubRouter.HandleFunc("/list", am.ViewAccess(aH.getDeploymentList)).Methods(http.MethodPost)

	daemonsetsSubRouter := router.PathPrefix("/api/v1/daemonsets").Subrouter()
	daemonsetsSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getDaemonSetAttributeKeys)).Methods(http.MethodGet)
	daemonsetsSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getDaemonSetAttributeValues)).Methods(http.MethodGet)
	daemonsetsSubRouter.HandleFunc("/list", am.ViewAccess(aH.getDaemonSetList)).Methods(http.MethodPost)

	statefulsetsSubRouter := router.PathPrefix("/api/v1/statefulsets").Subrouter()
	statefulsetsSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getStatefulSetAttributeKeys)).Methods(http.MethodGet)
	statefulsetsSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getStatefulSetAttributeValues)).Methods(http.MethodGet)
	statefulsetsSubRouter.HandleFunc("/list", am.ViewAccess(aH.getStatefulSetList)).Methods(http.MethodPost)

	jobsSubRouter := router.PathPrefix("/api/v1/jobs").Subrouter()
	jobsSubRouter.HandleFunc("/attribute_keys", am.ViewAccess(aH.getJobAttributeKeys)).Methods(http.MethodGet)
	jobsSubRouter.HandleFunc("/attribute_values", am.ViewAccess(aH.getJobAttributeValues)).Methods(http.MethodGet)
	jobsSubRouter.HandleFunc("/list", am.ViewAccess(aH.getJobList)).Methods(http.MethodPost)

	infraOnboardingSubRouter := router.PathPrefix("/api/v1/infra_onboarding").Subrouter()
	infraOnboardingSubRouter.HandleFunc("/k8s/status", am.ViewAccess(aH.getK8sInfraOnboardingStatus)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterWebSocketPaths(router *mux.Router, am *middleware.AuthZ) {
	subRouter := router.PathPrefix("/ws").Subrouter()
	subRouter.HandleFunc("/query_progress", am.ViewAccess(aH.GetQueryProgressUpdates)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterQueryRangeV4Routes(router *mux.Router, am *middleware.AuthZ) {
	subRouter := router.PathPrefix("/api/v4").Subrouter()
	subRouter.HandleFunc("/query_range", am.ViewAccess(aH.QueryRangeV4)).Methods(http.MethodPost)
	subRouter.HandleFunc("/metric/metric_metadata", am.ViewAccess(aH.getMetricMetadata)).Methods(http.MethodGet)
}

func (aH *APIHandler) RegisterQueryRangeV5Routes(router *mux.Router, am *middleware.AuthZ) {
	subRouter := router.PathPrefix("/api/v5").Subrouter()
	subRouter.HandleFunc("/query_range", am.ViewAccess(aH.QuerierAPI.QueryRange)).Methods(http.MethodPost)
	subRouter.HandleFunc("/substitute_vars", am.ViewAccess(aH.QuerierAPI.ReplaceVariables)).Methods(http.MethodPost)
}

// todo(remove): Implemented at render package (github.com/SigNoz/signoz/pkg/http/render) with the new error structure
func (aH *APIHandler) Respond(w http.ResponseWriter, data interface{}) {
	writeHttpResponse(w, data)
}

// RegisterRoutes registers routes for this handler on the given router
func (aH *APIHandler) RegisterRoutes(router *mux.Router, am *middleware.AuthZ) {
	router.HandleFunc("/api/v1/query_range", am.ViewAccess(aH.queryRangeMetrics)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/query", am.ViewAccess(aH.queryMetrics)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels", am.ViewAccess(aH.AlertmanagerAPI.ListChannels)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", am.ViewAccess(aH.AlertmanagerAPI.GetChannelByID)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", am.AdminAccess(aH.AlertmanagerAPI.UpdateChannelByID)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/channels/{id}", am.AdminAccess(aH.AlertmanagerAPI.DeleteChannelByID)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/channels", am.EditAccess(aH.AlertmanagerAPI.CreateChannel)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/testChannel", am.EditAccess(aH.AlertmanagerAPI.TestReceiver)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/route_policies", am.ViewAccess(aH.AlertmanagerAPI.GetAllRoutePolicies)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/route_policies/{id}", am.ViewAccess(aH.AlertmanagerAPI.GetRoutePolicyByID)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/route_policies", am.AdminAccess(aH.AlertmanagerAPI.CreateRoutePolicy)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/route_policies/{id}", am.AdminAccess(aH.AlertmanagerAPI.DeleteRoutePolicyByID)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/route_policies/{id}", am.AdminAccess(aH.AlertmanagerAPI.UpdateRoutePolicy)).Methods(http.MethodPut)

	router.HandleFunc("/api/v1/alerts", am.ViewAccess(aH.AlertmanagerAPI.GetAlerts)).Methods(http.MethodGet)

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

	router.HandleFunc("/api/v1/downtime_schedules", am.ViewAccess(aH.listDowntimeSchedules)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/downtime_schedules/{id}", am.ViewAccess(aH.getDowntimeSchedule)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/downtime_schedules", am.EditAccess(aH.createDowntimeSchedule)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/downtime_schedules/{id}", am.EditAccess(aH.editDowntimeSchedule)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/downtime_schedules/{id}", am.EditAccess(aH.deleteDowntimeSchedule)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/dashboards", am.ViewAccess(aH.List)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards", am.EditAccess(aH.Signoz.Handlers.Dashboard.Create)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/dashboards/{id}", am.ViewAccess(aH.Get)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards/{id}", am.EditAccess(aH.Signoz.Handlers.Dashboard.Update)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/dashboards/{id}", am.EditAccess(aH.Signoz.Handlers.Dashboard.Delete)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/dashboards/{id}/lock", am.EditAccess(aH.Signoz.Handlers.Dashboard.LockUnlock)).Methods(http.MethodPut)
	router.HandleFunc("/api/v2/variables/query", am.ViewAccess(aH.queryDashboardVarsV2)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/explorer/views", am.ViewAccess(aH.Signoz.Handlers.SavedView.List)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/explorer/views", am.EditAccess(aH.Signoz.Handlers.SavedView.Create)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.ViewAccess(aH.Signoz.Handlers.SavedView.Get)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.EditAccess(aH.Signoz.Handlers.SavedView.Update)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/explorer/views/{viewId}", am.EditAccess(aH.Signoz.Handlers.SavedView.Delete)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/event", am.ViewAccess(aH.registerEvent)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/services", am.ViewAccess(aH.getServices)).Methods(http.MethodPost) // Deprecated Usage, use the below endpoint /v2/services
	router.HandleFunc("/api/v2/services", am.ViewAccess(aH.Signoz.Handlers.Services.Get)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/services/list", am.ViewAccess(aH.getServicesList)).Methods(http.MethodGet)

	router.HandleFunc("/api/v2/service/top_operations", am.ViewAccess(aH.Signoz.Handlers.Services.GetTopOperations)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/service/top_operations", am.ViewAccess(aH.getTopOperations)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/service/top_level_operations", am.ViewAccess(aH.getServicesTopLevelOps)).Methods(http.MethodPost)

	router.HandleFunc("/api/v2/service/entry_point_operations", am.ViewAccess(aH.Signoz.Handlers.Services.GetEntryPointOperations)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/service/entry_point_operations", am.ViewAccess(aH.getEntryPointOps)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/traces/{traceId}", am.ViewAccess(aH.SearchTraces)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/usage", am.ViewAccess(aH.getUsage)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dependency_graph", am.ViewAccess(aH.dependencyGraph)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/ttl", am.AdminAccess(aH.setTTL)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/ttl", am.ViewAccess(aH.getTTL)).Methods(http.MethodGet)
	router.HandleFunc("/api/v2/settings/ttl", am.AdminAccess(aH.setCustomRetentionTTL)).Methods(http.MethodPost)
	router.HandleFunc("/api/v2/settings/ttl", am.ViewAccess(aH.getCustomRetentionTTL)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/settings/apdex", am.AdminAccess(aH.Signoz.Handlers.Apdex.Set)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/apdex", am.ViewAccess(aH.Signoz.Handlers.Apdex.Get)).Methods(http.MethodGet)

	router.HandleFunc("/api/v2/traces/fields", am.ViewAccess(aH.traceFields)).Methods(http.MethodGet)
	router.HandleFunc("/api/v2/traces/fields", am.EditAccess(aH.updateTraceField)).Methods(http.MethodPost)
	router.HandleFunc("/api/v2/traces/flamegraph/{traceId}", am.ViewAccess(aH.GetFlamegraphSpansForTrace)).Methods(http.MethodPost)
	router.HandleFunc("/api/v2/traces/waterfall/{traceId}", am.ViewAccess(aH.GetWaterfallSpansForTraceWithMetadata)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/version", am.OpenAccess(aH.getVersion)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/features", am.ViewAccess(aH.getFeatureFlags)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/health", am.OpenAccess(aH.getHealth)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/listErrors", am.ViewAccess(aH.listErrors)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/countErrors", am.ViewAccess(aH.countErrors)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/errorFromErrorID", am.ViewAccess(aH.getErrorFromErrorID)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/errorFromGroupID", am.ViewAccess(aH.getErrorFromGroupID)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/nextPrevErrorIDs", am.ViewAccess(aH.getNextPrevErrorIDs)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/disks", am.ViewAccess(aH.getDisks)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/user/preferences", am.ViewAccess(aH.Signoz.Handlers.Preference.ListByUser)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/preferences/{name}", am.ViewAccess(aH.Signoz.Handlers.Preference.GetByUser)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/preferences/{name}", am.ViewAccess(aH.Signoz.Handlers.Preference.UpdateByUser)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/org/preferences", am.AdminAccess(aH.Signoz.Handlers.Preference.ListByOrg)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/org/preferences/{name}", am.AdminAccess(aH.Signoz.Handlers.Preference.GetByOrg)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/org/preferences/{name}", am.AdminAccess(aH.Signoz.Handlers.Preference.UpdateByOrg)).Methods(http.MethodPut)

	// Quick Filters
	router.HandleFunc("/api/v1/orgs/me/filters", am.ViewAccess(aH.Signoz.Handlers.QuickFilter.GetQuickFilters)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/orgs/me/filters/{signal}", am.ViewAccess(aH.Signoz.Handlers.QuickFilter.GetSignalFilters)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/orgs/me/filters", am.AdminAccess(aH.Signoz.Handlers.QuickFilter.UpdateQuickFilters)).Methods(http.MethodPut)

	// === Authentication APIs ===
	router.HandleFunc("/api/v1/invite", am.AdminAccess(aH.Signoz.Handlers.User.CreateInvite)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/invite/bulk", am.AdminAccess(aH.Signoz.Handlers.User.CreateBulkInvite)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/invite/{token}", am.OpenAccess(aH.Signoz.Handlers.User.GetInvite)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/invite/{id}", am.AdminAccess(aH.Signoz.Handlers.User.DeleteInvite)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/invite", am.AdminAccess(aH.Signoz.Handlers.User.ListInvite)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/invite/accept", am.OpenAccess(aH.Signoz.Handlers.User.AcceptInvite)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/register", am.OpenAccess(aH.registerUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/login", am.OpenAccess(aH.Signoz.Handlers.Session.DeprecatedCreateSessionByEmailPassword)).Methods(http.MethodPost)
	router.HandleFunc("/api/v2/sessions/email_password", am.OpenAccess(aH.Signoz.Handlers.Session.CreateSessionByEmailPassword)).Methods(http.MethodPost)
	router.HandleFunc("/api/v2/sessions/context", am.OpenAccess(aH.Signoz.Handlers.Session.GetSessionContext)).Methods(http.MethodGet)
	router.HandleFunc("/api/v2/sessions/rotate", am.OpenAccess(aH.Signoz.Handlers.Session.RotateSession)).Methods(http.MethodPost)
	router.HandleFunc("/api/v2/sessions", am.OpenAccess(aH.Signoz.Handlers.Session.DeleteSession)).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/complete/google", am.OpenAccess(aH.Signoz.Handlers.Session.CreateSessionByGoogleCallback)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/domains", am.AdminAccess(aH.Signoz.Handlers.AuthDomain.List)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/domains", am.AdminAccess(aH.Signoz.Handlers.AuthDomain.Create)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/domains/{id}", am.AdminAccess(aH.Signoz.Handlers.AuthDomain.Update)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/domains/{id}", am.AdminAccess(aH.Signoz.Handlers.AuthDomain.Delete)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/pats", am.AdminAccess(aH.Signoz.Handlers.User.CreateAPIKey)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/pats", am.AdminAccess(aH.Signoz.Handlers.User.ListAPIKeys)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/pats/{id}", am.AdminAccess(aH.Signoz.Handlers.User.UpdateAPIKey)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/pats/{id}", am.AdminAccess(aH.Signoz.Handlers.User.RevokeAPIKey)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/user", am.AdminAccess(aH.Signoz.Handlers.User.ListUsers)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/me", am.OpenAccess(aH.Signoz.Handlers.User.GetMyUser)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/{id}", am.SelfAccess(aH.Signoz.Handlers.User.GetUser)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/{id}", am.SelfAccess(aH.Signoz.Handlers.User.UpdateUser)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/user/{id}", am.AdminAccess(aH.Signoz.Handlers.User.DeleteUser)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v2/orgs/me", am.AdminAccess(aH.Signoz.Handlers.Organization.Get)).Methods(http.MethodGet)
	router.HandleFunc("/api/v2/orgs/me", am.AdminAccess(aH.Signoz.Handlers.Organization.Update)).Methods(http.MethodPut)

	router.HandleFunc("/api/v1/getResetPasswordToken/{id}", am.AdminAccess(aH.Signoz.Handlers.User.GetResetPasswordToken)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/resetPassword", am.OpenAccess(aH.Signoz.Handlers.User.ResetPassword)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/changePassword/{id}", am.SelfAccess(aH.Signoz.Handlers.User.ChangePassword)).Methods(http.MethodPost)

	router.HandleFunc("/api/v3/licenses", am.ViewAccess(func(rw http.ResponseWriter, req *http.Request) {
		render.Success(rw, http.StatusOK, []any{})
	})).Methods(http.MethodGet)
	router.HandleFunc("/api/v3/licenses/active", am.ViewAccess(func(rw http.ResponseWriter, req *http.Request) {
		aH.LicensingAPI.Activate(rw, req)
	})).Methods(http.MethodGet)

	// Export
	router.HandleFunc("/api/v1/export_raw_data", am.ViewAccess(aH.Signoz.Handlers.RawDataExport.ExportRawData)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/span_percentile", am.ViewAccess(aH.Signoz.Handlers.SpanPercentile.GetSpanPercentileDetails)).Methods(http.MethodPost)

}

func (ah *APIHandler) MetricExplorerRoutes(router *mux.Router, am *middleware.AuthZ) {
	router.HandleFunc("/api/v1/metrics/filters/keys",
		am.ViewAccess(ah.FilterKeysSuggestion)).
		Methods(http.MethodGet)
	router.HandleFunc("/api/v1/metrics/filters/values",
		am.ViewAccess(ah.FilterValuesSuggestion)).
		Methods(http.MethodPost)
	router.HandleFunc("/api/v1/metrics/{metric_name}/metadata",
		am.ViewAccess(ah.GetMetricsDetails)).
		Methods(http.MethodGet)
	router.HandleFunc("/api/v1/metrics",
		am.ViewAccess(ah.ListMetrics)).
		Methods(http.MethodPost)
	router.HandleFunc("/api/v1/metrics/treemap",
		am.ViewAccess(ah.GetTreeMap)).
		Methods(http.MethodPost)
	router.HandleFunc("/api/v1/metrics/related",
		am.ViewAccess(ah.GetRelatedMetrics)).
		Methods(http.MethodPost)
	router.HandleFunc("/api/v1/metrics/inspect",
		am.ViewAccess(ah.GetInspectMetricsData)).
		Methods(http.MethodPost)
	router.HandleFunc("/api/v1/metrics/{metric_name}/metadata",
		am.ViewAccess(ah.UpdateMetricsMetadata)).
		Methods(http.MethodPost)
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
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	ruleResponse, err := aH.ruleManager.GetRule(r.Context(), id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("rule not found")}, nil)
			return
		}
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, ruleResponse)
}

// populateTemporality adds the temporality to the query if it is not present
func (aH *APIHandler) PopulateTemporality(ctx context.Context, orgID valuer.UUID, qp *v3.QueryRangeParamsV3) error {

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

	nameToTemporality, err := aH.reader.FetchTemporality(ctx, orgID, missingTemporality)
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
	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	schedules, err := aH.ruleManager.MaintenanceStore().GetAllPlannedMaintenance(r.Context(), claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	// The schedules are stored as JSON in the database, so we need to filter them here
	// Since the number of schedules is expected to be small, this should be fine

	if r.URL.Query().Get("active") != "" {
		activeSchedules := make([]*ruletypes.GettablePlannedMaintenance, 0)
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
		recurringSchedules := make([]*ruletypes.GettablePlannedMaintenance, 0)
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
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error()))
		return
	}

	schedule, err := aH.ruleManager.MaintenanceStore().GetPlannedMaintenanceByID(r.Context(), id)
	if err != nil {
		render.Error(w, err)
		return
	}
	aH.Respond(w, schedule)
}

func (aH *APIHandler) createDowntimeSchedule(w http.ResponseWriter, r *http.Request) {
	var schedule ruletypes.GettablePlannedMaintenance
	err := json.NewDecoder(r.Body).Decode(&schedule)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	if err := schedule.Validate(); err != nil {
		render.Error(w, err)
		return
	}

	_, err = aH.ruleManager.MaintenanceStore().CreatePlannedMaintenance(r.Context(), schedule)
	if err != nil {
		render.Error(w, err)
		return
	}
	aH.Respond(w, nil)
}

func (aH *APIHandler) editDowntimeSchedule(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error()))
		return
	}

	var schedule ruletypes.GettablePlannedMaintenance
	err = json.NewDecoder(r.Body).Decode(&schedule)
	if err != nil {
		render.Error(w, err)
		return
	}
	if err := schedule.Validate(); err != nil {
		render.Error(w, err)
		return
	}

	err = aH.ruleManager.MaintenanceStore().EditPlannedMaintenance(r.Context(), schedule, id)
	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, nil)
}

func (aH *APIHandler) deleteDowntimeSchedule(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error()))
		return
	}

	err = aH.ruleManager.MaintenanceStore().DeletePlannedMaintenance(r.Context(), id)
	if err != nil {
		render.Error(w, err)
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

func (aH *APIHandler) metaForLinks(ctx context.Context, rule *ruletypes.GettableRule) ([]v3.FilterItem, []v3.AttributeKey, map[string]v3.AttributeKey) {
	filterItems := []v3.FilterItem{}
	groupBy := []v3.AttributeKey{}
	keys := make(map[string]v3.AttributeKey)

	if rule.AlertType == ruletypes.AlertTypeLogs {
		logFields, err := aH.reader.GetLogFieldsFromNames(ctx, logsv3.GetFieldNames(rule.PostableRule.RuleCondition.CompositeQuery))
		if err == nil {
			params := &v3.QueryRangeParamsV3{
				CompositeQuery: rule.RuleCondition.CompositeQuery,
			}
			keys = model.GetLogFieldsV3(ctx, params, logFields)
		} else {
			zap.L().Error("failed to get log fields using empty keys; the link might not work as expected", zap.Error(err))
		}
	} else if rule.AlertType == ruletypes.AlertTypeTraces {
		traceFields, err := aH.reader.GetSpanAttributeKeysByNames(ctx, logsv3.GetFieldNames(rule.PostableRule.RuleCondition.CompositeQuery))
		if err == nil {
			keys = traceFields
		} else {
			zap.L().Error("failed to get span attributes using empty keys; the link might not work as expected", zap.Error(err))
		}
	}

	if rule.AlertType == ruletypes.AlertTypeLogs || rule.AlertType == ruletypes.AlertTypeTraces {
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
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	params := model.QueryRuleStateHistory{}
	err = json.NewDecoder(r.Body).Decode(&params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}
	if err := params.Validate(); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	res, err := aH.reader.ReadRuleStateHistoryByRuleID(r.Context(), id.StringValue(), &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	rule, err := aH.ruleManager.GetRule(r.Context(), id)
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
			if rule.AlertType == ruletypes.AlertTypeLogs {
				if rule.Version != "v5" {
					res.Items[idx].RelatedLogsLink = contextlinks.PrepareLinksToLogs(start, end, newFilters)
				} else {
					// TODO(srikanthccv): re-visit this and support multiple queries
					var q qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]

					for _, query := range rule.RuleCondition.CompositeQuery.Queries {
						if query.Type == qbtypes.QueryTypeBuilder {
							switch spec := query.Spec.(type) {
							case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
								q = spec
							}
						}
					}

					filterExpr := ""
					if q.Filter != nil && q.Filter.Expression != "" {
						filterExpr = q.Filter.Expression
					}

					whereClause := contextlinks.PrepareFilterExpression(lbls, filterExpr, q.GroupBy)

					res.Items[idx].RelatedLogsLink = contextlinks.PrepareLinksToLogsV5(start, end, whereClause)
				}
			} else if rule.AlertType == ruletypes.AlertTypeTraces {
				if rule.Version != "v5" {
					res.Items[idx].RelatedTracesLink = contextlinks.PrepareLinksToTraces(start, end, newFilters)
				} else {
					// TODO(srikanthccv): re-visit this and support multiple queries
					var q qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]

					for _, query := range rule.RuleCondition.CompositeQuery.Queries {
						if query.Type == qbtypes.QueryTypeBuilder {
							switch spec := query.Spec.(type) {
							case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
								q = spec
							}
						}
					}

					filterExpr := ""
					if q.Filter != nil && q.Filter.Expression != "" {
						filterExpr = q.Filter.Expression
					}

					whereClause := contextlinks.PrepareFilterExpression(lbls, filterExpr, q.GroupBy)
					res.Items[idx].RelatedTracesLink = contextlinks.PrepareLinksToTracesV5(start, end, whereClause)
				}
			}
		}
	}

	aH.Respond(w, res)
}

func (aH *APIHandler) getRuleStateHistoryTopContributors(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	params := model.QueryRuleStateHistory{}
	err = json.NewDecoder(r.Body).Decode(&params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	res, err := aH.reader.ReadRuleStateHistoryTopContributorsByRuleID(r.Context(), id.StringValue(), &params)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	rule, err := aH.ruleManager.GetRule(r.Context(), id)
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
			if rule.AlertType == ruletypes.AlertTypeLogs {
				res[idx].RelatedLogsLink = contextlinks.PrepareLinksToLogs(start, end, newFilters)
			} else if rule.AlertType == ruletypes.AlertTypeTraces {
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

	if !constants.IsDotMetricsEnabled {
		return queryBuf.String(), nil
	}

	query = queryBuf.String()

	// Now handle $var replacements (simple string replace)
	keys := make([]string, 0, len(vars))
	for k := range vars {
		keys = append(keys, k)
	}

	sort.Slice(keys, func(i, j int) bool {
		return len(keys[i]) > len(keys[j])
	})

	newQuery := query
	for _, k := range keys {
		placeholder := "$" + k
		v := vars[k]
		newQuery = strings.ReplaceAll(newQuery, placeholder, v)
	}

	return newQuery, nil
}

func (aH *APIHandler) Get(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id := mux.Vars(r)["id"]
	if id == "" {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "id is missing in the path"))
		return
	}

	dashboard := new(dashboardtypes.Dashboard)
	if aH.CloudIntegrationsController.IsCloudIntegrationDashboardUuid(id) {
		cloudintegrationDashboard, apiErr := aH.CloudIntegrationsController.GetDashboardById(ctx, orgID, id)
		if apiErr != nil {
			render.Error(rw, errorsV2.Wrapf(apiErr, errorsV2.TypeInternal, errorsV2.CodeInternal, "failed to get dashboard"))
			return
		}
		dashboard = cloudintegrationDashboard
	} else if aH.IntegrationsController.IsInstalledIntegrationDashboardID(id) {
		integrationDashboard, apiErr := aH.IntegrationsController.GetInstalledIntegrationDashboardById(ctx, orgID, id)
		if apiErr != nil {
			render.Error(rw, errorsV2.Wrapf(apiErr, errorsV2.TypeInternal, errorsV2.CodeInternal, "failed to get dashboard"))
			return
		}
		dashboard = integrationDashboard
	} else {
		dashboardID, err := valuer.NewUUID(id)
		if err != nil {
			render.Error(rw, err)
			return
		}
		sqlDashboard, err := aH.Signoz.Modules.Dashboard.Get(ctx, orgID, dashboardID)
		if err != nil {
			render.Error(rw, err)
			return
		}
		dashboard = sqlDashboard
	}

	gettableDashboard, err := dashboardtypes.NewGettableDashboardFromDashboard(dashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, gettableDashboard)
}

func (aH *APIHandler) List(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboards := make([]*dashboardtypes.Dashboard, 0)
	sqlDashboards, err := aH.Signoz.Modules.Dashboard.List(ctx, orgID)
	if err != nil && !errorsV2.Ast(err, errorsV2.TypeNotFound) {
		render.Error(rw, err)
		return
	}
	if sqlDashboards != nil {
		dashboards = append(dashboards, sqlDashboards...)
	}

	installedIntegrationDashboards, apiErr := aH.IntegrationsController.GetDashboardsForInstalledIntegrations(ctx, orgID)
	if apiErr != nil {
		zap.L().Error("failed to get dashboards for installed integrations", zap.Error(apiErr))
	} else {
		dashboards = append(dashboards, installedIntegrationDashboards...)
	}

	cloudIntegrationDashboards, apiErr := aH.CloudIntegrationsController.AvailableDashboards(ctx, orgID)
	if apiErr != nil {
		zap.L().Error("failed to get dashboards for cloud integrations", zap.Error(apiErr))
	} else {
		dashboards = append(dashboards, cloudIntegrationDashboards...)
	}

	gettableDashboards, err := dashboardtypes.NewGettableDashboardsFromDashboards(dashboards)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, gettableDashboards)
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

func (aH *APIHandler) testRule(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}
	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("Error in getting req body in test rule API", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
	defer cancel()

	alertCount, apiRrr := aH.ruleManager.TestNotification(ctx, orgID, string(body))
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
		if errors.Is(err, sql.ErrNoRows) {
			RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("rule not found")}, nil)
			return
		}
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, "rule successfully deleted")

}

// patchRule updates only requested changes in the rule
func (aH *APIHandler) patchRule(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("error in getting req body of patch rule API\n", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	gettableRule, err := aH.ruleManager.PatchRule(r.Context(), string(body), id)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("rule not found")}, nil)
			return
		}
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, gettableRule)
}

func (aH *APIHandler) editRule(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		zap.L().Error("error in getting req body of edit rule API", zap.Error(err))
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	err = aH.ruleManager.EditRule(r.Context(), string(body), id)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("rule not found")}, nil)
			return
		}
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, "rule successfully edited")

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

func (aH *APIHandler) registerEvent(w http.ResponseWriter, r *http.Request) {
	request, err := parseRegisterEventRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}
	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 == nil {
		switch request.EventType {
		case model.TrackEvent:
			aH.Signoz.Analytics.TrackUser(r.Context(), claims.OrgID, claims.UserID, request.EventName, request.Attributes)
		}
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

func (aH *APIHandler) getEntryPointOps(w http.ResponseWriter, r *http.Request) {
	query, err := parseGetTopOperationsRequest(r)
	if err != nil {
		render.Error(w, err)
		return
	}

	result, apiErr := aH.reader.GetEntryPointOperations(r.Context(), query)
	if apiErr != nil {
		render.Error(w, apiErr)
		return
	}

	render.Success(w, http.StatusOK, result)
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

	result, apiErr := aH.reader.GetTopLevelOperations(r.Context(), start, end, services)
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

	result, err := aH.reader.SearchTraces(r.Context(), params)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) GetWaterfallSpansForTraceWithMetadata(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}
	traceID := mux.Vars(r)["traceId"]
	if traceID == "" {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "traceID is required"))
		return
	}

	req := new(model.GetWaterfallSpansForTraceWithMetadataParams)
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	result, apiErr := aH.reader.GetWaterfallSpansForTraceWithMetadata(r.Context(), orgID, traceID, req)
	if apiErr != nil {
		render.Error(w, apiErr)
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) GetFlamegraphSpansForTrace(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	traceID := mux.Vars(r)["traceId"]
	if traceID == "" {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "traceID is required"))
		return
	}

	req := new(model.GetFlamegraphSpansForTraceParams)
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	result, apiErr := aH.reader.GetFlamegraphSpansForTrace(r.Context(), orgID, traceID, req)
	if apiErr != nil {
		render.Error(w, apiErr)
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

func (aH *APIHandler) setTTL(w http.ResponseWriter, r *http.Request) {
	ttlParams, err := parseTTLParams(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, errors.NewInternalf(errors.CodeInternal, "failed to get org id from context"))
		return
	}

	// Context is not used here as TTL is long duration DB operation
	result, apiErr := aH.reader.SetTTL(context.Background(), claims.OrgID, ttlParams)
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

func (aH *APIHandler) setCustomRetentionTTL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, errv2 := authtypes.ClaimsFromContext(ctx)
	if errv2 != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "failed to get org id from context"))
		return
	}

	var params model.CustomRetentionTTLParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "Invalid data"))
		return
	}

	// Context is not used here as TTL is long duration DB operation
	result, apiErr := aH.reader.SetTTLV2(context.Background(), claims.OrgID, &params)
	if apiErr != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInternal, apiErr.Error()))
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getCustomRetentionTTL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, errv2 := authtypes.ClaimsFromContext(ctx)
	if errv2 != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInternal, errorsV2.CodeInternal, "failed to get org id from context"))
		return
	}

	result, apiErr := aH.reader.GetCustomRetentionTTL(r.Context(), claims.OrgID)
	if apiErr != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInternal, apiErr.Error()))
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getTTL(w http.ResponseWriter, r *http.Request) {
	ttlParams, err := parseGetTTL(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}
	result, apiErr := aH.reader.GetTTL(r.Context(), claims.OrgID, ttlParams)
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
	versionResponse := model.GetVersionResponse{
		Version:        version.Info.Version(),
		EE:             "Y",
		SetupCompleted: aH.SetupCompleted,
	}

	aH.WriteJSON(w, r, versionResponse)
}

func (aH *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet, err := aH.Signoz.Licensing.GetFeatureFlags(r.Context(), valuer.GenerateUUID())
	if err != nil {
		aH.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	if constants.PreferSpanMetrics {
		for idx, feature := range featureSet {
			if feature.Name == licensetypes.UseSpanMetrics {
				featureSet[idx].Active = true
			}
		}
	}
	if constants.IsDotMetricsEnabled {
		for idx, feature := range featureSet {
			if feature.Name == licensetypes.DotMetricsEnabled {
				featureSet[idx].Active = true
			}
		}
	}
	aH.Respond(w, featureSet)
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

func (aH *APIHandler) registerUser(w http.ResponseWriter, r *http.Request) {
	if aH.SetupCompleted {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "self-registration is disabled"))
		return
	}

	var req types.PostableRegisterOrgAndAdmin
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(w, err)
		return
	}

	organization := types.NewOrganization(req.OrgDisplayName)
	user, errv2 := aH.Signoz.Modules.User.CreateFirstUser(r.Context(), organization, req.Name, req.Email, req.Password)
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	// since the first user is now created, we can disable self-registration as
	// from here onwards, we expect admin (owner) to invite other users.
	aH.SetupCompleted = true

	aH.Respond(w, user)
}

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
func (aH *APIHandler) RegisterMessagingQueuesRoutes(router *mux.Router, am *middleware.AuthZ) {

	// Main messaging queues router
	messagingQueuesRouter := router.PathPrefix("/api/v1/messaging-queues").Subrouter()

	// Queue Overview route
	messagingQueuesRouter.HandleFunc("/queue-overview", am.ViewAccess(aH.getQueueOverview)).Methods(http.MethodPost)

	// -------------------------------------------------
	// Kafka-specific routes
	kafkaRouter := messagingQueuesRouter.PathPrefix("/kafka").Subrouter()

	onboardingRouter := kafkaRouter.PathPrefix("/onboarding").Subrouter()

	onboardingRouter.HandleFunc("/producers", am.ViewAccess(aH.onboardProducers)).Methods(http.MethodPost)
	onboardingRouter.HandleFunc("/consumers", am.ViewAccess(aH.onboardConsumers)).Methods(http.MethodPost)
	onboardingRouter.HandleFunc("/kafka", am.ViewAccess(aH.onboardKafka)).Methods(http.MethodPost)

	partitionLatency := kafkaRouter.PathPrefix("/partition-latency").Subrouter()

	partitionLatency.HandleFunc("/overview", am.ViewAccess(aH.getPartitionOverviewLatencyData)).Methods(http.MethodPost)
	partitionLatency.HandleFunc("/consumer", am.ViewAccess(aH.getConsumerPartitionLatencyData)).Methods(http.MethodPost)

	consumerLagRouter := kafkaRouter.PathPrefix("/consumer-lag").Subrouter()

	consumerLagRouter.HandleFunc("/producer-details", am.ViewAccess(aH.getProducerData)).Methods(http.MethodPost)
	consumerLagRouter.HandleFunc("/consumer-details", am.ViewAccess(aH.getConsumerData)).Methods(http.MethodPost)
	consumerLagRouter.HandleFunc("/network-latency", am.ViewAccess(aH.getNetworkData)).Methods(http.MethodPost)

	topicThroughput := kafkaRouter.PathPrefix("/topic-throughput").Subrouter()

	topicThroughput.HandleFunc("/producer", am.ViewAccess(aH.getProducerThroughputOverview)).Methods(http.MethodPost)
	topicThroughput.HandleFunc("/producer-details", am.ViewAccess(aH.getProducerThroughputDetails)).Methods(http.MethodPost)
	topicThroughput.HandleFunc("/consumer", am.ViewAccess(aH.getConsumerThroughputOverview)).Methods(http.MethodPost)
	topicThroughput.HandleFunc("/consumer-details", am.ViewAccess(aH.getConsumerThroughputDetails)).Methods(http.MethodPost)

	spanEvaluation := kafkaRouter.PathPrefix("/span").Subrouter()

	spanEvaluation.HandleFunc("/evaluation", am.ViewAccess(aH.getProducerConsumerEval)).Methods(http.MethodPost)
}

// RegisterThirdPartyApiRoutes adds third-party-api integration routes
func (aH *APIHandler) RegisterThirdPartyApiRoutes(router *mux.Router, am *middleware.AuthZ) {

	// Main messaging queues router
	thirdPartyApiRouter := router.PathPrefix("/api/v1/third-party-apis").Subrouter()

	// Domain Overview route
	overviewRouter := thirdPartyApiRouter.PathPrefix("/overview").Subrouter()

	overviewRouter.HandleFunc("/list", am.ViewAccess(aH.getDomainList)).Methods(http.MethodPost)
	overviewRouter.HandleFunc("/domain", am.ViewAccess(aH.getDomainInfo)).Methods(http.MethodPost)
}

// not using md5 hashing as the plain string would work
func uniqueIdentifier(params []string, separator string) string {
	return strings.Join(params, separator)
}

func (aH *APIHandler) onboardProducers(

	w http.ResponseWriter, r *http.Request,

) {
	messagingQueue, apiErr := ParseKafkaQueueBody(r)
	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	chq, err := kafka.BuildClickHouseQuery(messagingQueue, kafka.KafkaQueue, "onboard_producers")

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

	var entries []kafka.OnboardingResponse

	for _, result := range results {

		for key, value := range result.Data {
			var message, attribute, status string

			intValue := int(*value.(*uint8))

			if key == "entries" {
				attribute = "telemetry ingestion"
				if intValue != 0 {
					entries = nil
					entry := kafka.OnboardingResponse{
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

			entry := kafka.OnboardingResponse{
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
	messagingQueue, apiErr := ParseKafkaQueueBody(r)
	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	chq, err := kafka.BuildClickHouseQuery(messagingQueue, kafka.KafkaQueue, "onboard_consumers")

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

	var entries []kafka.OnboardingResponse

	for _, result := range result {
		for key, value := range result.Data {
			var message, attribute, status string

			intValue := int(*value.(*uint8))

			if key == "entries" {
				attribute = "telemetry ingestion"
				if intValue != 0 {
					entries = nil
					entry := kafka.OnboardingResponse{
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

			entry := kafka.OnboardingResponse{
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

func (aH *APIHandler) onboardKafka(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)
	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildBuilderQueriesKafkaOnboarding(messagingQueue)

	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	results, errQueriesByName, err := aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQueriesByName)
		return
	}

	var entries []kafka.OnboardingResponse

	var fetchLatencyState, consumerLagState bool

	for _, result := range results {
		for _, series := range result.Series {
			for _, point := range series.Points {
				pointValue := point.Value
				if pointValue > 0 {
					if result.QueryName == "fetch_latency" {
						fetchLatencyState = true
						break
					}
					if result.QueryName == "consumer_lag" {
						consumerLagState = true
						break
					}
				}

			}
		}
	}
	var kafkaConsumerFetchLatencyAvg string = "kafka_consumer_fetch_latency_avg"
	var kafkaConsumerLag string = "kafka_consumer_group_lag"
	if constants.IsDotMetricsEnabled {
		kafkaConsumerLag = "kafka.consumer_group.lag"
		kafkaConsumerFetchLatencyAvg = "kafka.consumer.fetch_latency_avg"
	}

	if !fetchLatencyState && !consumerLagState {
		entries = append(entries, kafka.OnboardingResponse{
			Attribute: "telemetry ingestion",
			Message:   "No data available in the given time range",
			Status:    "0",
		})
	}

	if !fetchLatencyState {

		entries = append(entries, kafka.OnboardingResponse{
			Attribute: kafkaConsumerFetchLatencyAvg,
			Message:   "Metric kafka_consumer_fetch_latency_avg is not present in the given time range.",
			Status:    "0",
		})
	} else {
		entries = append(entries, kafka.OnboardingResponse{
			Attribute: kafkaConsumerFetchLatencyAvg,
			Status:    "1",
		})
	}

	if !consumerLagState {
		entries = append(entries, kafka.OnboardingResponse{
			Attribute: kafkaConsumerLag,
			Message:   "Metric kafka_consumer_group_lag is not present in the given time range.",
			Status:    "0",
		})
	} else {
		entries = append(entries, kafka.OnboardingResponse{
			Attribute: kafkaConsumerLag,
			Status:    "1",
		})
	}

	aH.Respond(w, entries)
}

func (aH *APIHandler) getNetworkData(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	attributeCache := &kafka.Clients{
		Hash: make(map[string]struct{}),
	}
	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQRParamsWithCache(messagingQueue, "throughput", attributeCache)
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

	result, errQueriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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
			params := []string{clientID, serviceInstanceID, serviceName}
			hashKey := uniqueIdentifier(params, "#")
			_, ok := attributeCache.Hash[hashKey]
			if clientIDOk && serviceInstanceIDOk && serviceNameOk && !ok {
				attributeCache.Hash[hashKey] = struct{}{}
				attributeCache.ClientID = append(attributeCache.ClientID, clientID)
				attributeCache.ServiceInstanceID = append(attributeCache.ServiceInstanceID, serviceInstanceID)
				attributeCache.ServiceName = append(attributeCache.ServiceName, serviceName)
			}
		}
	}

	queryRangeParams, err = kafka.BuildQRParamsWithCache(messagingQueue, "fetch-latency", attributeCache)
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

	resultFetchLatency, errQueriesByNameFetchLatency, err := aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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
			params := []string{clientID, serviceInstanceID, serviceName}
			hashKey := uniqueIdentifier(params, "#")
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

func (aH *APIHandler) getProducerData(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	// parse the query params to retrieve the messaging queue struct
	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQueryRangeParams(messagingQueue, "producer")
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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

func (aH *APIHandler) getConsumerData(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQueryRangeParams(messagingQueue, "consumer")
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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

// s1
func (aH *APIHandler) getPartitionOverviewLatencyData(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQueryRangeParams(messagingQueue, "producer-topic-throughput")
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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

// s1
func (aH *APIHandler) getConsumerPartitionLatencyData(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQueryRangeParams(messagingQueue, "consumer_partition_latency")
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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

// s3 p overview
// fetch traces
// cache attributes
// fetch byte rate metrics
func (aH *APIHandler) getProducerThroughputOverview(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)
	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	attributeCache := &kafka.Clients{
		Hash: make(map[string]struct{}),
	}

	producerQueryRangeParams, err := kafka.BuildQRParamsWithCache(messagingQueue, "producer-throughput-overview", attributeCache)
	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	if err := validateQueryRangeParamsV3(producerQueryRangeParams); err != nil {
		zap.L().Error(err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	var result []*v3.Result
	var errQuriesByName map[string]error

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, producerQueryRangeParams)
	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}

	for _, res := range result {
		for _, series := range res.Series {
			serviceName, serviceNameOk := series.Labels["service_name"]
			topicName, topicNameOk := series.Labels["topic"]
			params := []string{serviceName, topicName}
			hashKey := uniqueIdentifier(params, "#")
			_, ok := attributeCache.Hash[hashKey]
			if topicNameOk && serviceNameOk && !ok {
				attributeCache.Hash[hashKey] = struct{}{}
				attributeCache.TopicName = append(attributeCache.TopicName, topicName)
				attributeCache.ServiceName = append(attributeCache.ServiceName, serviceName)
			}
		}
	}

	queryRangeParams, err := kafka.BuildQRParamsWithCache(messagingQueue, "producer-throughput-overview-byte-rate", attributeCache)
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

	resultFetchLatency, errQueriesByNameFetchLatency, err := aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQueriesByNameFetchLatency)
		return
	}

	byteRateColumn := &v3.Result{QueryName: "byte_rate"}
	var byteRateSeries []*v3.Series
	for _, res := range resultFetchLatency {
		for _, series := range res.Series {
			topic, topicOk := series.Labels["topic"]
			serviceName, serviceNameOk := series.Labels["service_name"]
			params := []string{serviceName, topic}
			hashKey := uniqueIdentifier(params, "#")
			_, ok := attributeCache.Hash[hashKey]
			if topicOk && serviceNameOk && ok {
				byteRateSeries = append(byteRateSeries, series)
			}
		}
	}

	byteRateColumn.Series = byteRateSeries
	var latencyColumnResult []*v3.Result
	latencyColumnResult = append(latencyColumnResult, byteRateColumn)

	resultFetchLatency = postprocess.TransformToTableForBuilderQueries(latencyColumnResult, queryRangeParams)

	result = postprocess.TransformToTableForClickHouseQueries(result)

	result = append(result, resultFetchLatency[0])
	resp := v3.QueryRangeResponse{
		Result: result,
	}
	aH.Respond(w, resp)
}

// s3 p details
func (aH *APIHandler) getProducerThroughputDetails(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQueryRangeParams(messagingQueue, "producer-throughput-details")
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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

// s3 c overview
func (aH *APIHandler) getConsumerThroughputOverview(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQueryRangeParams(messagingQueue, "consumer-throughput-overview")
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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

// s3 c details
func (aH *APIHandler) getConsumerThroughputDetails(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQueryRangeParams(messagingQueue, "consumer-throughput-details")
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
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

// s4
// needs logic to parse duration
// needs logic to get the percentage
// show 10 traces
func (aH *APIHandler) getProducerConsumerEval(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	messagingQueue, apiErr := ParseKafkaQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	queryRangeParams, err := kafka.BuildQueryRangeParams(messagingQueue, "producer-consumer-eval")
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(r.Context(), orgID, queryRangeParams)
	if err != nil {
		apiErrObj := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}

	resp := v3.QueryRangeResponse{
		Result: result,
	}
	aH.Respond(w, resp)
}

// RegisterIntegrationRoutes Registers all Integrations
func (aH *APIHandler) RegisterIntegrationRoutes(router *mux.Router, am *middleware.AuthZ) {
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
	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	resp, apiErr := aH.IntegrationsController.ListIntegrations(
		r.Context(), claims.OrgID, params,
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
	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}
	integration, apiErr := aH.IntegrationsController.GetIntegration(
		r.Context(), claims.OrgID, integrationId,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to fetch integration details")
		return
	}

	aH.Respond(w, integration)
}

func (aH *APIHandler) GetIntegrationConnectionStatus(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	integrationId := mux.Vars(r)["integrationId"]
	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}
	isInstalled, apiErr := aH.IntegrationsController.IsIntegrationInstalled(
		r.Context(), claims.OrgID, integrationId,
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
		r.Context(), claims.OrgID, integrationId,
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
		r.Context(), orgID, connectionTests, lookbackSeconds,
	)
	if apiErr != nil {
		RespondError(w, apiErr, "Failed to calculate integration connection status")
		return
	}

	aH.Respond(w, connectionStatus)
}

func (aH *APIHandler) calculateConnectionStatus(
	ctx context.Context,
	orgID valuer.UUID,
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

		logsConnStatus, apiErr := aH.calculateLogsConnectionStatus(ctx, orgID, connectionTests.Logs, lookbackSeconds)

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

		if len(connectionTests.Metrics) < 1 {
			return
		}

		statusForLastReceivedMetric, apiErr := aH.reader.GetLatestReceivedMetric(
			ctx, connectionTests.Metrics, nil,
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

func (aH *APIHandler) calculateLogsConnectionStatus(ctx context.Context, orgID valuer.UUID, logsConnectionTest *integrations.LogsConnectionTest, lookbackSeconds int64) (*integrations.SignalConnectionStatus, *model.ApiError) {
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
	queryRes, _, err := aH.querier.QueryRange(ctx, orgID, qrParams)
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

func (aH *APIHandler) InstallIntegration(w http.ResponseWriter, r *http.Request) {
	req := integrations.InstallIntegrationRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	integration, apiErr := aH.IntegrationsController.Install(
		r.Context(), claims.OrgID, &req,
	)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, integration)
}

func (aH *APIHandler) UninstallIntegration(w http.ResponseWriter, r *http.Request) {
	req := integrations.UninstallIntegrationRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	apiErr := aH.IntegrationsController.Uninstall(r.Context(), claims.OrgID, &req)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, map[string]interface{}{})
}

// cloud provider integrations
func (aH *APIHandler) RegisterCloudIntegrationsRoutes(router *mux.Router, am *middleware.AuthZ) {
	subRouter := router.PathPrefix("/api/v1/cloud-integrations").Subrouter()

	subRouter.HandleFunc(
		"/{cloudProvider}/accounts/generate-connection-url", am.EditAccess(aH.CloudIntegrationsGenerateConnectionUrl),
	).Methods(http.MethodPost)

	subRouter.HandleFunc(
		"/{cloudProvider}/accounts", am.ViewAccess(aH.CloudIntegrationsListConnectedAccounts),
	).Methods(http.MethodGet)

	subRouter.HandleFunc(
		"/{cloudProvider}/accounts/{accountId}/status", am.ViewAccess(aH.CloudIntegrationsGetAccountStatus),
	).Methods(http.MethodGet)

	subRouter.HandleFunc(
		"/{cloudProvider}/accounts/{accountId}/config", am.EditAccess(aH.CloudIntegrationsUpdateAccountConfig),
	).Methods(http.MethodPost)

	subRouter.HandleFunc(
		"/{cloudProvider}/accounts/{accountId}/disconnect", am.EditAccess(aH.CloudIntegrationsDisconnectAccount),
	).Methods(http.MethodPost)

	subRouter.HandleFunc(
		"/{cloudProvider}/agent-check-in", am.ViewAccess(aH.CloudIntegrationsAgentCheckIn),
	).Methods(http.MethodPost)

	subRouter.HandleFunc(
		"/{cloudProvider}/services", am.ViewAccess(aH.CloudIntegrationsListServices),
	).Methods(http.MethodGet)

	subRouter.HandleFunc(
		"/{cloudProvider}/services/{serviceId}", am.ViewAccess(aH.CloudIntegrationsGetServiceDetails),
	).Methods(http.MethodGet)

	subRouter.HandleFunc(
		"/{cloudProvider}/services/{serviceId}/config", am.EditAccess(aH.CloudIntegrationsUpdateServiceConfig),
	).Methods(http.MethodPost)

}

func (aH *APIHandler) CloudIntegrationsListConnectedAccounts(
	w http.ResponseWriter, r *http.Request,
) {
	cloudProvider := mux.Vars(r)["cloudProvider"]

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	resp, apiErr := aH.CloudIntegrationsController.ListConnectedAccounts(
		r.Context(), claims.OrgID, cloudProvider,
	)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}
	aH.Respond(w, resp)
}

func (aH *APIHandler) CloudIntegrationsGenerateConnectionUrl(
	w http.ResponseWriter, r *http.Request,
) {
	cloudProvider := mux.Vars(r)["cloudProvider"]

	req := cloudintegrations.GenerateConnectionUrlRequest{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	result, apiErr := aH.CloudIntegrationsController.GenerateConnectionUrl(
		r.Context(), claims.OrgID, cloudProvider, req,
	)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, result)
}

func (aH *APIHandler) CloudIntegrationsGetAccountStatus(
	w http.ResponseWriter, r *http.Request,
) {
	cloudProvider := mux.Vars(r)["cloudProvider"]
	accountId := mux.Vars(r)["accountId"]

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	resp, apiErr := aH.CloudIntegrationsController.GetAccountStatus(
		r.Context(), claims.OrgID, cloudProvider, accountId,
	)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}
	aH.Respond(w, resp)
}

func (aH *APIHandler) CloudIntegrationsAgentCheckIn(
	w http.ResponseWriter, r *http.Request,
) {
	cloudProvider := mux.Vars(r)["cloudProvider"]

	req := cloudintegrations.AgentCheckInRequest{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	result, err := aH.CloudIntegrationsController.CheckInAsAgent(
		r.Context(), claims.OrgID, cloudProvider, req,
	)

	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, result)
}

func (aH *APIHandler) CloudIntegrationsUpdateAccountConfig(
	w http.ResponseWriter, r *http.Request,
) {
	cloudProvider := mux.Vars(r)["cloudProvider"]
	accountId := mux.Vars(r)["accountId"]

	req := cloudintegrations.UpdateAccountConfigRequest{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	result, apiErr := aH.CloudIntegrationsController.UpdateAccountConfig(
		r.Context(), claims.OrgID, cloudProvider, accountId, req,
	)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, result)
}

func (aH *APIHandler) CloudIntegrationsDisconnectAccount(
	w http.ResponseWriter, r *http.Request,
) {
	cloudProvider := mux.Vars(r)["cloudProvider"]
	accountId := mux.Vars(r)["accountId"]

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	result, apiErr := aH.CloudIntegrationsController.DisconnectAccount(
		r.Context(), claims.OrgID, cloudProvider, accountId,
	)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.Respond(w, result)
}

func (aH *APIHandler) CloudIntegrationsListServices(
	w http.ResponseWriter, r *http.Request,
) {
	cloudProvider := mux.Vars(r)["cloudProvider"]

	var cloudAccountId *string

	cloudAccountIdQP := r.URL.Query().Get("cloud_account_id")
	if len(cloudAccountIdQP) > 0 {
		cloudAccountId = &cloudAccountIdQP
	}

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	resp, apiErr := aH.CloudIntegrationsController.ListServices(
		r.Context(), claims.OrgID, cloudProvider, cloudAccountId,
	)

	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}
	aH.Respond(w, resp)
}

func (aH *APIHandler) CloudIntegrationsGetServiceDetails(
	w http.ResponseWriter, r *http.Request,
) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	cloudProvider := mux.Vars(r)["cloudProvider"]
	serviceId := mux.Vars(r)["serviceId"]

	var cloudAccountId *string

	cloudAccountIdQP := r.URL.Query().Get("cloud_account_id")
	if len(cloudAccountIdQP) > 0 {
		cloudAccountId = &cloudAccountIdQP
	}

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	resp, err := aH.CloudIntegrationsController.GetServiceDetails(
		r.Context(), claims.OrgID, cloudProvider, serviceId, cloudAccountId,
	)
	if err != nil {
		render.Error(w, err)
		return
	}

	// Add connection status for the 2 signals.
	if cloudAccountId != nil {
		connStatus, apiErr := aH.calculateCloudIntegrationServiceConnectionStatus(
			r.Context(), orgID, cloudProvider, *cloudAccountId, resp,
		)
		if apiErr != nil {
			RespondError(w, apiErr, nil)
			return
		}
		resp.ConnectionStatus = connStatus
	}

	aH.Respond(w, resp)
}

func (aH *APIHandler) calculateCloudIntegrationServiceConnectionStatus(
	ctx context.Context,
	orgID valuer.UUID,
	cloudProvider string,
	cloudAccountId string,
	svcDetails *cloudintegrations.ServiceDetails,
) (*cloudintegrations.ServiceConnectionStatus, *model.ApiError) {
	if cloudProvider != "aws" {
		// TODO(Raj): Make connection check generic for all providers in a follow up change
		return nil, model.BadRequest(
			fmt.Errorf("unsupported cloud provider: %s", cloudProvider),
		)
	}

	telemetryCollectionStrategy := svcDetails.Strategy
	if telemetryCollectionStrategy == nil {
		return nil, model.InternalError(fmt.Errorf(
			"service doesn't have telemetry collection strategy: %s", svcDetails.Id,
		))
	}

	result := &cloudintegrations.ServiceConnectionStatus{}
	errors := []*model.ApiError{}
	var resultLock sync.Mutex

	var wg sync.WaitGroup

	// Calculate metrics connection status
	if telemetryCollectionStrategy.AWSMetrics != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()

			metricsConnStatus, apiErr := aH.calculateAWSIntegrationSvcMetricsConnectionStatus(
				ctx, cloudAccountId, telemetryCollectionStrategy.AWSMetrics, svcDetails.DataCollected.Metrics,
			)

			resultLock.Lock()
			defer resultLock.Unlock()

			if apiErr != nil {
				errors = append(errors, apiErr)
			} else {
				result.Metrics = metricsConnStatus
			}
		}()
	}

	// Calculate logs connection status
	if telemetryCollectionStrategy.AWSLogs != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()

			logsConnStatus, apiErr := aH.calculateAWSIntegrationSvcLogsConnectionStatus(
				ctx, orgID, cloudAccountId, telemetryCollectionStrategy.AWSLogs,
			)

			resultLock.Lock()
			defer resultLock.Unlock()

			if apiErr != nil {
				errors = append(errors, apiErr)
			} else {
				result.Logs = logsConnStatus
			}
		}()
	}

	wg.Wait()

	if len(errors) > 0 {
		return nil, errors[0]
	}

	return result, nil

}
func (aH *APIHandler) calculateAWSIntegrationSvcMetricsConnectionStatus(
	ctx context.Context,
	cloudAccountId string,
	strategy *services.AWSMetricsStrategy,
	metricsCollectedBySvc []services.CollectedMetric,
) (*cloudintegrations.SignalConnectionStatus, *model.ApiError) {
	if strategy == nil || len(strategy.StreamFilters) < 1 {
		return nil, nil
	}

	expectedLabelValues := map[string]string{
		"cloud_provider":   "aws",
		"cloud_account_id": cloudAccountId,
	}

	metricsNamespace := strategy.StreamFilters[0].Namespace
	metricsNamespaceParts := strings.Split(metricsNamespace, "/")

	if len(metricsNamespaceParts) >= 2 {
		expectedLabelValues["service_namespace"] = metricsNamespaceParts[0]
		expectedLabelValues["service_name"] = metricsNamespaceParts[1]
	} else {
		// metrics for single word namespaces like "CWAgent" do not
		// have the service_namespace label populated
		expectedLabelValues["service_name"] = metricsNamespaceParts[0]
	}

	metricNamesCollectedBySvc := []string{}
	for _, cm := range metricsCollectedBySvc {
		metricNamesCollectedBySvc = append(metricNamesCollectedBySvc, cm.Name)
	}

	statusForLastReceivedMetric, apiErr := aH.reader.GetLatestReceivedMetric(
		ctx, metricNamesCollectedBySvc, expectedLabelValues,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	if statusForLastReceivedMetric != nil {
		return &cloudintegrations.SignalConnectionStatus{
			LastReceivedTsMillis: statusForLastReceivedMetric.LastReceivedTsMillis,
			LastReceivedFrom:     "signoz-aws-integration",
		}, nil
	}

	return nil, nil
}

func (aH *APIHandler) calculateAWSIntegrationSvcLogsConnectionStatus(
	ctx context.Context,
	orgID valuer.UUID,
	cloudAccountId string,
	strategy *services.AWSLogsStrategy,
) (*cloudintegrations.SignalConnectionStatus, *model.ApiError) {
	if strategy == nil || len(strategy.Subscriptions) < 1 {
		return nil, nil
	}

	logGroupNamePrefix := strategy.Subscriptions[0].LogGroupNamePrefix
	if len(logGroupNamePrefix) < 1 {
		return nil, nil
	}

	logsConnTestFilter := &v3.FilterSet{
		Operator: "AND",
		Items: []v3.FilterItem{
			{
				Key: v3.AttributeKey{
					Key:      "cloud.account.id",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeResource,
				},
				Operator: "=",
				Value:    cloudAccountId,
			},
			{
				Key: v3.AttributeKey{
					Key:      "aws.cloudwatch.log_group_name",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeResource,
				},
				Operator: "like",
				Value:    logGroupNamePrefix + "%",
			},
		},
	}

	// TODO(Raj): Receive this as a param from UI in the future.
	lookbackSeconds := int64(30 * 60)

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
		ctx, orgID, qrParams,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query for integration connection status: %w", err,
		))
	}
	if len(queryRes) > 0 && queryRes[0].List != nil && len(queryRes[0].List) > 0 {
		lastLog := queryRes[0].List[0]

		return &cloudintegrations.SignalConnectionStatus{
			LastReceivedTsMillis: lastLog.Timestamp.UnixMilli(),
			LastReceivedFrom:     "signoz-aws-integration",
		}, nil
	}

	return nil, nil
}

func (aH *APIHandler) CloudIntegrationsUpdateServiceConfig(
	w http.ResponseWriter, r *http.Request,
) {
	cloudProvider := mux.Vars(r)["cloudProvider"]
	serviceId := mux.Vars(r)["serviceId"]

	req := cloudintegrations.UpdateServiceConfigRequest{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	result, err := aH.CloudIntegrationsController.UpdateServiceConfig(
		r.Context(), claims.OrgID, cloudProvider, serviceId, &req,
	)

	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, result)
}

// logs
func (aH *APIHandler) RegisterLogsRoutes(router *mux.Router, am *middleware.AuthZ) {
	subRouter := router.PathPrefix("/api/v1/logs").Subrouter()
	subRouter.HandleFunc("", am.ViewAccess(aH.getLogs)).Methods(http.MethodGet)
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
	aH.WriteJSON(w, r, map[string]interface{}{"results": []interface{}{}})
}

func (aH *APIHandler) logAggregate(w http.ResponseWriter, r *http.Request) {
	aH.WriteJSON(w, r, model.GetLogsAggregatesResponse{})
}

func parseAgentConfigVersion(r *http.Request) (int, error) {
	versionString := mux.Vars(r)["version"]

	if versionString == "latest" {
		return -1, nil
	}

	version64, err := strconv.ParseInt(versionString, 0, 8)

	if err != nil {
		return 0, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid version number")
	}

	if version64 <= 0 {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid version number")
	}

	return int(version64), nil
}

func (aH *APIHandler) PreviewLogsPipelinesHandler(w http.ResponseWriter, r *http.Request) {
	req := logparsingpipeline.PipelinesPreviewRequest{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to decode request body"))
		return
	}

	resultLogs, err := aH.LogsParsingPipelineController.PreviewLogsPipelines(r.Context(), &req)
	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, resultLogs)
}

func (aH *APIHandler) ListLogsPipelinesHandler(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	orgID, errv2 := valuer.NewUUID(claims.OrgID)
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	version, err := parseAgentConfigVersion(r)
	if err != nil {
		render.Error(w, err)
		return
	}

	var payload *logparsingpipeline.PipelinesResponse
	if version != -1 {
		payload, err = aH.listLogsPipelinesByVersion(r.Context(), orgID, version)
	} else {
		payload, err = aH.listLogsPipelines(r.Context(), orgID)
	}
	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, payload)
}

// listLogsPipelines lists logs piplines for latest version
func (aH *APIHandler) listLogsPipelines(ctx context.Context, orgID valuer.UUID) (
	*logparsingpipeline.PipelinesResponse, error,
) {
	// get lateset agent config
	latestVersion := -1
	lastestConfig, err := agentConf.GetLatestVersion(ctx, orgID, opamptypes.ElementTypeLogPipelines)
	if err != nil && !errorsV2.Ast(err, errorsV2.TypeNotFound) {
		return nil, err
	}

	if lastestConfig != nil {
		latestVersion = lastestConfig.Version
	}

	payload, err := aH.LogsParsingPipelineController.GetPipelinesByVersion(ctx, orgID, latestVersion)
	if err != nil {
		return nil, err
	}

	// todo(Nitya): make a new API for history pagination
	limit := 10
	history, err := agentConf.GetConfigHistory(ctx, orgID, opamptypes.ElementTypeLogPipelines, limit)
	if err != nil {
		return nil, err
	}
	payload.History = history
	return payload, nil
}

// listLogsPipelinesByVersion lists pipelines along with config version history
func (aH *APIHandler) listLogsPipelinesByVersion(ctx context.Context, orgID valuer.UUID, version int) (
	*logparsingpipeline.PipelinesResponse, error,
) {
	payload, err := aH.LogsParsingPipelineController.GetPipelinesByVersion(ctx, orgID, version)
	if err != nil {
		return nil, err
	}

	// todo(Nitya): make a new API for history pagination
	limit := 10
	history, err := agentConf.GetConfigHistory(ctx, orgID, opamptypes.ElementTypeLogPipelines, limit)
	if err != nil {
		return nil, err
	}

	payload.History = history
	return payload, nil
}

func (aH *APIHandler) CreateLogsPipeline(w http.ResponseWriter, r *http.Request) {
	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	// prepare config by calling gen func
	orgID, errv2 := valuer.NewUUID(claims.OrgID)
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}
	userID, errv2 := valuer.NewUUID(claims.UserID)
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	req := pipelinetypes.PostablePipelines{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	createPipeline := func(
		ctx context.Context,
		postable []pipelinetypes.PostablePipeline,
	) (*logparsingpipeline.PipelinesResponse, error) {
		if len(postable) == 0 {
			zap.L().Warn("found no pipelines in the http request, this will delete all the pipelines")
		}

		err := aH.LogsParsingPipelineController.ValidatePipelines(ctx, postable)
		if err != nil {
			return nil, err
		}

		return aH.LogsParsingPipelineController.ApplyPipelines(ctx, orgID, userID, postable)
	}

	res, err := createPipeline(r.Context(), req.Pipelines)
	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, res)
}

func (aH *APIHandler) autocompleteAggregateAttributes(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	var response *v3.AggregateAttributeResponse
	req, err := parseAggregateAttributeRequest(r)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	switch req.DataSource {
	case v3.DataSourceMetrics:
		response, err = aH.reader.GetMetricAggregateAttributes(r.Context(), orgID, req, false)
	case v3.DataSourceLogs:
		response, err = aH.reader.GetLogAggregateAttributes(r.Context(), req)
	case v3.DataSourceTraces:
		response, err = aH.reader.GetTraceAggregateAttributes(r.Context(), req)
	case v3.DataSourceMeter:
		response, err = aH.reader.GetMeterAggregateAttributes(r.Context(), orgID, req)
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
	case v3.DataSourceMeter:
		response, err = aH.reader.GetMeterAttributeKeys(r.Context(), req)
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

func (aH *APIHandler) autoCompleteAttributeValuesPost(w http.ResponseWriter, r *http.Request) {
	var response *v3.FilterAttributeValueResponse
	req, err := parseFilterAttributeValueRequestBody(r)

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
			spanKeys, err := aH.reader.GetSpanAttributeKeysByNames(ctx, logsv3.GetFieldNames(queryRangeParams.CompositeQuery))
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
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	var result []*v3.Result
	var errQuriesByName map[string]error
	var spanKeys map[string]v3.AttributeKey
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		hasLogsQuery := false
		hasTracesQuery := false
		for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
			if query.DataSource == v3.DataSourceLogs {
				hasLogsQuery = true
			}
			if query.DataSource == v3.DataSourceTraces {
				hasTracesQuery = true
			}
		}
		// check if any enrichment is required for logs if yes then enrich them
		if logsv3.EnrichmentRequired(queryRangeParams) && hasLogsQuery {
			logsFields, err := aH.reader.GetLogFieldsFromNames(ctx, logsv3.GetFieldNames(queryRangeParams.CompositeQuery))
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, errQuriesByName)
				return
			}
			// get the fields if any logs query is present
			fields := model.GetLogFieldsV3(ctx, queryRangeParams, logsFields)
			logsv3.Enrich(queryRangeParams, fields)
		}
		if hasTracesQuery {
			spanKeys, err = aH.getSpanKeysV3(ctx, queryRangeParams)
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, errQuriesByName)
				return
			}
			tracesV4.Enrich(queryRangeParams, spanKeys)
		}
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

	result, errQuriesByName, err = aH.querier.QueryRange(ctx, orgID, queryRangeParams)

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

	aH.sendQueryResultEvents(r, result, queryRangeParams, "v3")
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

func (aH *APIHandler) sendQueryResultEvents(r *http.Request, result []*v3.Result, queryRangeParams *v3.QueryRangeParamsV3, version string) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		return
	}

	queryInfoResult := NewQueryInfoResult(queryRangeParams, version)

	if !(queryInfoResult.LogsUsed || queryInfoResult.MetricsUsed || queryInfoResult.TracesUsed) {
		return
	}

	properties := queryInfoResult.ToMap()
	referrer := r.Header.Get("Referer")

	if referrer == "" {
		return
	}

	properties["referrer"] = referrer

	logsExplorerMatched, _ := regexp.MatchString(`/logs/logs-explorer(?:\?.*)?$`, referrer)
	traceExplorerMatched, _ := regexp.MatchString(`/traces-explorer(?:\?.*)?$`, referrer)
	metricsExplorerMatched, _ := regexp.MatchString(`/metrics-explorer/explorer(?:\?.*)?$`, referrer)
	dashboardMatched, _ := regexp.MatchString(`/dashboard/[a-zA-Z0-9\-]+/(new|edit)(?:\?.*)?$`, referrer)
	alertMatched, _ := regexp.MatchString(`/alerts/(new|edit)(?:\?.*)?$`, referrer)

	switch {
	case dashboardMatched:
		properties["module_name"] = "dashboard"
	case alertMatched:
		properties["module_name"] = "rule"
	case metricsExplorerMatched:
		properties["module_name"] = "metrics-explorer"
	case logsExplorerMatched:
		properties["module_name"] = "logs-explorer"
	case traceExplorerMatched:
		properties["module_name"] = "traces-explorer"
	default:
		return
	}

	if dashboardMatched {
		if dashboardIDRegex, err := regexp.Compile(`/dashboard/([a-f0-9\-]+)/`); err == nil {
			if matches := dashboardIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
				properties["dashboard_id"] = matches[1]
			}
		}

		if widgetIDRegex, err := regexp.Compile(`widgetId=([a-f0-9\-]+)`); err == nil {
			if matches := widgetIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
				properties["widget_id"] = matches[1]
			}
		}
	}

	if alertMatched {
		if alertIDRegex, err := regexp.Compile(`ruleId=(\d+)`); err == nil {
			if matches := alertIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
				properties["rule_id"] = matches[1]
			}
		}
	}

	// Check if result is empty or has no data
	if len(result) == 0 {
		aH.Signoz.Analytics.TrackUser(r.Context(), claims.OrgID, claims.UserID, "Telemetry Query Returned Empty", properties)
		return
	}

	// Check if first result has no series data
	if len(result[0].Series) == 0 {
		// Check if first result has no list data
		if len(result[0].List) == 0 {
			// Check if first result has no table data
			if result[0].Table == nil {
				aH.Signoz.Analytics.TrackUser(r.Context(), claims.OrgID, claims.UserID, "Telemetry Query Returned Empty", properties)
				return
			}

			if len(result[0].Table.Rows) == 0 {
				aH.Signoz.Analytics.TrackUser(r.Context(), claims.OrgID, claims.UserID, "Telemetry Query Returned Empty", properties)
				return
			}
		}
	}

	aH.Signoz.Analytics.TrackUser(r.Context(), claims.OrgID, claims.UserID, "Telemetry Query Returned Results", properties)

}

func (aH *APIHandler) QueryRangeV3(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	queryRangeParams, apiErrorObj := ParseQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiErrorObj.Err))
		RespondError(w, apiErrorObj, nil)
		return
	}

	// add temporality for each metric
	temporalityErr := aH.PopulateTemporality(r.Context(), orgID, queryRangeParams)
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

func (aH *APIHandler) getMetricMetadata(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	metricName := r.URL.Query().Get("metricName")
	serviceName := r.URL.Query().Get("serviceName")
	metricMetadata, err := aH.reader.GetMetricMetadata(r.Context(), orgID, metricName, serviceName)
	if err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, metricMetadata)
}

func (aH *APIHandler) queryRangeV4(ctx context.Context, queryRangeParams *v3.QueryRangeParamsV3, w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	var result []*v3.Result
	var errQuriesByName map[string]error
	var spanKeys map[string]v3.AttributeKey
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		hasLogsQuery := false
		hasTracesQuery := false
		for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
			if query.DataSource == v3.DataSourceLogs {
				hasLogsQuery = true
			}
			if query.DataSource == v3.DataSourceTraces {
				hasTracesQuery = true
			}
		}

		// check if any enrichment is required for logs if yes then enrich them
		if logsv3.EnrichmentRequired(queryRangeParams) && hasLogsQuery {
			// get the fields if any logs query is present
			logsFields, err := aH.reader.GetLogFieldsFromNames(r.Context(), logsv3.GetFieldNames(queryRangeParams.CompositeQuery))
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, nil)
				return
			}
			fields := model.GetLogFieldsV3(r.Context(), queryRangeParams, logsFields)
			logsv3.Enrich(queryRangeParams, fields)
		}

		if hasTracesQuery {
			spanKeys, err = aH.getSpanKeysV3(ctx, queryRangeParams)
			if err != nil {
				apiErrObj := &model.ApiError{Typ: model.ErrorInternal, Err: err}
				RespondError(w, apiErrObj, errQuriesByName)
				return
			}
			tracesV4.Enrich(queryRangeParams, spanKeys)
		}
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

	result, errQuriesByName, err = aH.querierV2.QueryRange(ctx, orgID, queryRangeParams)

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
	aH.sendQueryResultEvents(r, result, queryRangeParams, "v4")
	resp := v3.QueryRangeResponse{
		Result: result,
	}

	aH.Respond(w, resp)
}

func (aH *APIHandler) QueryRangeV4(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	queryRangeParams, apiErrorObj := ParseQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiErrorObj.Err))
		RespondError(w, apiErrorObj, nil)
		return
	}
	queryRangeParams.Version = "v4"

	// add temporality for each metric
	temporalityErr := aH.PopulateTemporality(r.Context(), orgID, queryRangeParams)
	if temporalityErr != nil {
		zap.L().Error("Error while adding temporality for metrics", zap.Error(temporalityErr))
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: temporalityErr}, nil)
		return
	}

	aH.queryRangeV4(r.Context(), queryRangeParams, w, r)
}

func (aH *APIHandler) traceFields(w http.ResponseWriter, r *http.Request) {
	fields, apiErr := aH.reader.GetTraceFields(r.Context())
	if apiErr != nil {
		RespondError(w, apiErr, "failed to fetch fields from the db")
		return
	}
	aH.WriteJSON(w, r, fields)
}

func (aH *APIHandler) updateTraceField(w http.ResponseWriter, r *http.Request) {
	field := model.UpdateField{}
	if err := json.NewDecoder(r.Body).Decode(&field); err != nil {
		apiErr := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErr, "failed to decode payload")
		return
	}

	err := logs.ValidateUpdateFieldPayloadV2(&field)
	if err != nil {
		apiErr := &model.ApiError{Typ: model.ErrorBadData, Err: err}
		RespondError(w, apiErr, "incorrect payload")
		return
	}

	apiErr := aH.reader.UpdateTraceField(r.Context(), &field)
	if apiErr != nil {
		RespondError(w, apiErr, "failed to update field in the db")
		return
	}
	aH.WriteJSON(w, r, field)
}

func (aH *APIHandler) getQueueOverview(w http.ResponseWriter, r *http.Request) {

	queueListRequest, apiErr := ParseQueueBody(r)

	if apiErr != nil {
		zap.L().Error(apiErr.Err.Error())
		RespondError(w, apiErr, nil)
		return
	}

	chq, err := queues2.BuildOverviewQuery(queueListRequest)

	if err != nil {
		zap.L().Error(err.Error())
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	aH.Respond(w, results)
}

func (aH *APIHandler) getDomainList(w http.ResponseWriter, r *http.Request) {
	// Extract claims from context for organization ID
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	// Parse the request body to get third-party query parameters
	thirdPartyQueryRequest, apiErr := ParseRequestBody(r)
	if apiErr != nil {
		zap.L().Error("Failed to parse request body", zap.Error(apiErr))
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, apiErr.Error()))
		return
	}

	// Build the v5 query range request for domain listing
	queryRangeRequest, err := thirdpartyapi.BuildDomainList(thirdPartyQueryRequest)
	if err != nil {
		zap.L().Error("Failed to build domain list query", zap.Error(err))
		apiErrObj := errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error())
		render.Error(w, apiErrObj)
		return
	}

	// Execute the query using the v5 querier
	result, err := aH.Signoz.Querier.QueryRange(r.Context(), orgID, queryRangeRequest)
	if err != nil {
		zap.L().Error("Query execution failed", zap.Error(err))
		apiErrObj := errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error())
		render.Error(w, apiErrObj)
		return
	}

	result = thirdpartyapi.MergeSemconvColumns(result)
	result = thirdpartyapi.FilterIntermediateColumns(result)

	// Filter IP addresses if ShowIp is false
	var finalResult = result
	if !thirdPartyQueryRequest.ShowIp {
		filteredResults := thirdpartyapi.FilterResponse([]*qbtypes.QueryRangeResponse{result})
		if len(filteredResults) > 0 {
			finalResult = filteredResults[0]
		}
	}

	// Send the response
	aH.Respond(w, finalResult)
}

// getDomainInfo handles requests for domain information using v5 query builder
func (aH *APIHandler) getDomainInfo(w http.ResponseWriter, r *http.Request) {
	// Extract claims from context for organization ID
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	// Parse the request body to get third-party query parameters
	thirdPartyQueryRequest, apiErr := ParseRequestBody(r)
	if apiErr != nil {
		zap.L().Error("Failed to parse request body", zap.Error(apiErr))
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, apiErr.Error()))
		return
	}

	// Build the v5 query range request for domain info
	queryRangeRequest, err := thirdpartyapi.BuildDomainInfo(thirdPartyQueryRequest)
	if err != nil {
		zap.L().Error("Failed to build domain info query", zap.Error(err))
		apiErrObj := errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error())
		render.Error(w, apiErrObj)
		return
	}

	// Execute the query using the v5 querier
	result, err := aH.Signoz.Querier.QueryRange(r.Context(), orgID, queryRangeRequest)
	if err != nil {
		zap.L().Error("Query execution failed", zap.Error(err))
		apiErrObj := errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error())
		render.Error(w, apiErrObj)
		return
	}

	result = thirdpartyapi.MergeSemconvColumns(result)
	result = thirdpartyapi.FilterIntermediateColumns(result)

	// Filter IP addresses if ShowIp is false
	var finalResult *qbtypes.QueryRangeResponse = result
	if !thirdPartyQueryRequest.ShowIp {
		filteredResults := thirdpartyapi.FilterResponse([]*qbtypes.QueryRangeResponse{result})
		if len(filteredResults) > 0 {
			finalResult = filteredResults[0]
		}
	}

	// Send the response
	aH.Respond(w, finalResult)
}

// RegisterTraceFunnelsRoutes adds trace funnels routes
func (aH *APIHandler) RegisterTraceFunnelsRoutes(router *mux.Router, am *middleware.AuthZ) {
	// Main trace funnels router
	traceFunnelsRouter := router.PathPrefix("/api/v1/trace-funnels").Subrouter()

	// API endpoints
	traceFunnelsRouter.HandleFunc("/new",
		am.EditAccess(aH.Signoz.Handlers.TraceFunnel.New)).
		Methods(http.MethodPost)
	traceFunnelsRouter.HandleFunc("/list",
		am.ViewAccess(aH.Signoz.Handlers.TraceFunnel.List)).
		Methods(http.MethodGet)
	traceFunnelsRouter.HandleFunc("/steps/update",
		am.EditAccess(aH.Signoz.Handlers.TraceFunnel.UpdateSteps)).
		Methods(http.MethodPut)

	traceFunnelsRouter.HandleFunc("/{funnel_id}",
		am.ViewAccess(aH.Signoz.Handlers.TraceFunnel.Get)).
		Methods(http.MethodGet)
	traceFunnelsRouter.HandleFunc("/{funnel_id}",
		am.EditAccess(aH.Signoz.Handlers.TraceFunnel.Delete)).
		Methods(http.MethodDelete)
	traceFunnelsRouter.HandleFunc("/{funnel_id}",
		am.EditAccess(aH.Signoz.Handlers.TraceFunnel.UpdateFunnel)).
		Methods(http.MethodPut)

	// Analytics endpoints
	traceFunnelsRouter.HandleFunc("/{funnel_id}/analytics/validate", aH.handleValidateTraces).Methods("POST")
	traceFunnelsRouter.HandleFunc("/{funnel_id}/analytics/overview", aH.handleFunnelAnalytics).Methods("POST")
	traceFunnelsRouter.HandleFunc("/{funnel_id}/analytics/steps", aH.handleStepAnalytics).Methods("POST")
	traceFunnelsRouter.HandleFunc("/{funnel_id}/analytics/steps/overview", aH.handleFunnelStepAnalytics).Methods("POST")
	traceFunnelsRouter.HandleFunc("/{funnel_id}/analytics/slow-traces", aH.handleFunnelSlowTraces).Methods("POST")
	traceFunnelsRouter.HandleFunc("/{funnel_id}/analytics/error-traces", aH.handleFunnelErrorTraces).Methods("POST")

	// Analytics endpoints
	traceFunnelsRouter.HandleFunc("/analytics/validate", aH.handleValidateTracesWithPayload).Methods("POST")
	traceFunnelsRouter.HandleFunc("/analytics/overview", aH.handleFunnelAnalyticsWithPayload).Methods("POST")
	traceFunnelsRouter.HandleFunc("/analytics/steps", aH.handleStepAnalyticsWithPayload).Methods("POST")
	traceFunnelsRouter.HandleFunc("/analytics/steps/overview", aH.handleFunnelStepAnalyticsWithPayload).Methods("POST")
	traceFunnelsRouter.HandleFunc("/analytics/slow-traces", aH.handleFunnelSlowTracesWithPayload).Methods("POST")
	traceFunnelsRouter.HandleFunc("/analytics/error-traces", aH.handleFunnelErrorTracesWithPayload).Methods("POST")
}

func (aH *APIHandler) handleValidateTraces(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	claims, err := authtypes.ClaimsFromContext(r.Context())

	if err != nil {
		render.Error(w, err)
		return
	}

	funnel, err := aH.Signoz.Modules.TraceFunnel.Get(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("funnel not found: %v", err)}, nil)
		return
	}

	var timeRange traceFunnels.TimeRange
	if err := json.NewDecoder(r.Body).Decode(&timeRange); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding time range: %v", err)}, nil)
		return
	}

	if len(funnel.Steps) < 2 {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("funnel must have at least 2 steps")}, nil)
		return
	}

	chq, err := traceFunnelsModule.ValidateTraces(funnel, timeRange)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleFunnelAnalytics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	claims, err := authtypes.ClaimsFromContext(r.Context())

	if err != nil {
		render.Error(w, err)
		return
	}

	funnel, err := aH.Signoz.Modules.TraceFunnel.Get(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("funnel not found: %v", err)}, nil)
		return
	}

	var stepTransition traceFunnels.StepTransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&stepTransition); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding time range: %v", err)}, nil)
		return
	}

	chq, err := traceFunnelsModule.GetFunnelAnalytics(funnel, stepTransition.TimeRange)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleFunnelStepAnalytics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	claims, err := authtypes.ClaimsFromContext(r.Context())

	if err != nil {
		render.Error(w, err)
		return
	}

	funnel, err := aH.Signoz.Modules.TraceFunnel.Get(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("funnel not found: %v", err)}, nil)
		return
	}

	var stepTransition traceFunnels.StepTransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&stepTransition); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding time range: %v", err)}, nil)
		return
	}

	chq, err := traceFunnelsModule.GetFunnelStepAnalytics(funnel, stepTransition.TimeRange, stepTransition.StepStart, stepTransition.StepEnd)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleStepAnalytics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	claims, err := authtypes.ClaimsFromContext(r.Context())

	if err != nil {
		render.Error(w, err)
		return
	}

	funnel, err := aH.Signoz.Modules.TraceFunnel.Get(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("funnel not found: %v", err)}, nil)
		return
	}

	var timeRange traceFunnels.TimeRange
	if err := json.NewDecoder(r.Body).Decode(&timeRange); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding time range: %v", err)}, nil)
		return
	}

	chq, err := traceFunnelsModule.GetStepAnalytics(funnel, timeRange)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleFunnelSlowTraces(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	claims, err := authtypes.ClaimsFromContext(r.Context())

	if err != nil {
		render.Error(w, err)
		return
	}

	funnel, err := aH.Signoz.Modules.TraceFunnel.Get(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("funnel not found: %v", err)}, nil)
		return
	}

	var req traceFunnels.StepTransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("invalid request body: %v", err)}, nil)
		return
	}

	chq, err := traceFunnelsModule.GetSlowestTraces(funnel, req.TimeRange, req.StepStart, req.StepEnd)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleFunnelErrorTraces(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	claims, err := authtypes.ClaimsFromContext(r.Context())

	if err != nil {
		render.Error(w, err)
		return
	}

	funnel, err := aH.Signoz.Modules.TraceFunnel.Get(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("funnel not found: %v", err)}, nil)
		return
	}

	var req traceFunnels.StepTransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("invalid request body: %v", err)}, nil)
		return
	}

	chq, err := traceFunnelsModule.GetErroredTraces(funnel, req.TimeRange, req.StepStart, req.StepEnd)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleValidateTracesWithPayload(w http.ResponseWriter, r *http.Request) {
	var req traceFunnels.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding request: %v", err)}, nil)
		return
	}

	if len(req.Steps) < 2 {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("funnel must have at least 2 steps")}, nil)
		return
	}

	// Create a StorableFunnel from the request
	funnel := &traceFunnels.StorableFunnel{
		Steps: req.Steps,
	}

	chq, err := traceFunnelsModule.ValidateTraces(funnel, traceFunnels.TimeRange{
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	})
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleFunnelAnalyticsWithPayload(w http.ResponseWriter, r *http.Request) {
	var req traceFunnels.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding request: %v", err)}, nil)
		return
	}

	funnel := &traceFunnels.StorableFunnel{
		Steps: req.Steps,
	}

	chq, err := traceFunnelsModule.GetFunnelAnalytics(funnel, traceFunnels.TimeRange{
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	})
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleStepAnalyticsWithPayload(w http.ResponseWriter, r *http.Request) {
	var req traceFunnels.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding request: %v", err)}, nil)
		return
	}

	funnel := &traceFunnels.StorableFunnel{
		Steps: req.Steps,
	}

	chq, err := traceFunnelsModule.GetStepAnalytics(funnel, traceFunnels.TimeRange{
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	})
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleFunnelStepAnalyticsWithPayload(w http.ResponseWriter, r *http.Request) {
	var req traceFunnels.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding request: %v", err)}, nil)
		return
	}

	funnel := &traceFunnels.StorableFunnel{
		Steps: req.Steps,
	}

	chq, err := traceFunnelsModule.GetFunnelStepAnalytics(funnel, traceFunnels.TimeRange{
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	}, req.StepStart, req.StepEnd)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleFunnelSlowTracesWithPayload(w http.ResponseWriter, r *http.Request) {
	var req traceFunnels.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding request: %v", err)}, nil)
		return
	}

	funnel := &traceFunnels.StorableFunnel{
		Steps: req.Steps,
	}

	chq, err := traceFunnelsModule.GetSlowestTraces(funnel, traceFunnels.TimeRange{
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	}, req.StepStart, req.StepEnd)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}

func (aH *APIHandler) handleFunnelErrorTracesWithPayload(w http.ResponseWriter, r *http.Request) {
	var req traceFunnels.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error decoding request: %v", err)}, nil)
		return
	}

	funnel := &traceFunnels.StorableFunnel{
		Steps: req.Steps,
	}

	chq, err := traceFunnelsModule.GetErroredTraces(funnel, traceFunnels.TimeRange{
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	}, req.StepStart, req.StepEnd)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error building clickhouse query: %v", err)}, nil)
		return
	}

	results, err := aH.reader.GetListResultV3(r.Context(), chq.Query)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error converting clickhouse results to list: %v", err)}, nil)
		return
	}
	aH.Respond(w, results)
}
