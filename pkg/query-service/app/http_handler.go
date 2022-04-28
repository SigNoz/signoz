package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	_ "github.com/mattn/go-sqlite3"
	"github.com/prometheus/prometheus/promql"
	"go.signoz.io/query-service/app/dashboards"
	"go.signoz.io/query-service/auth"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	am "go.signoz.io/query-service/integrations/alertManager"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/telemetry"
	"go.signoz.io/query-service/version"
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
	reader       *Reader
	relationalDB dao.ModelDao
	alertManager am.Manager
	ready        func(http.HandlerFunc) http.HandlerFunc
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(reader *Reader, relationalDB dao.ModelDao) (*APIHandler, error) {

	alertManager := am.New("")
	aH := &APIHandler{
		reader:       reader,
		relationalDB: relationalDB,
		alertManager: alertManager,
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

func respondError(w http.ResponseWriter, apiErr *model.ApiError, data interface{}) {
	json := jsoniter.ConfigCompatibleWithStandardLibrary
	b, err := json.Marshal(&response{
		Status:    statusError,
		ErrorType: apiErr.Typ,
		Error:     apiErr.Err.Error(),
		Data:      data,
	})
	if err != nil {
		zap.S().Error("msg", "error marshalling json response", "err", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var code int
	switch apiErr.Typ {
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

func (aH *APIHandler) respond(w http.ResponseWriter, data interface{}) {
	writeHttpResponse(w, data)
}

// RegisterRoutes registers routes for this handler on the given router
func (aH *APIHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/api/v1/query_range", aH.queryRangeMetrics).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/query", aH.queryMetrics).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels", aH.listChannels).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", aH.getChannel).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", aH.editChannel).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/channels/{id}", aH.deleteChannel).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/channels", aH.createChannel).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/testChannel", aH.testChannel).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/rules", aH.listRulesFromProm).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rules/{id}", aH.getRule).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rules", aH.createRule).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/rules/{id}", aH.editRule).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/rules/{id}", aH.deleteRule).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/dashboards", aH.getDashboards).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards", aH.createDashboards).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/dashboards/{uuid}", aH.getDashboard).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/dashboards/{uuid}", aH.updateDashboard).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/dashboards/{uuid}", aH.deleteDashboard).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/user", aH.user).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/feedback", aH.submitFeedback).Methods(http.MethodPost)
	// router.HandleFunc("/api/v1/get_percentiles", aH.getApplicationPercentiles).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/services", aH.getServices).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/services/list", aH.getServicesList).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/overview", aH.getServiceOverview).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/dbOverview", aH.getServiceDBOverview).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/externalAvgDuration", aH.GetServiceExternalAvgDuration).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/externalErrors", aH.getServiceExternalErrors).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/external", aH.getServiceExternal).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/{service}/operations", aH.getOperations).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/service/top_endpoints", aH.getTopEndpoints).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/spans", aH.searchSpans).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/spans/aggregates", aH.searchSpansAggregates).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/tags", aH.searchTags).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/traces/{traceId}", aH.searchTraces).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/usage", aH.getUsage).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/serviceMapDependencies", aH.serviceMapDependencies).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/settings/ttl", aH.setTTL).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/settings/ttl", aH.getTTL).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/version", aH.getVersion).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/getSpanFilters", aH.getSpanFilters).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getTagFilters", aH.getTagFilters).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getFilteredSpans", aH.getFilteredSpans).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/getFilteredSpans/aggregates", aH.getFilteredSpanAggregates).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/getTagValues", aH.getTagValues).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/errors", aH.getErrors).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/errorWithId", aH.getErrorForId).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/errorWithType", aH.getErrorForType).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/disks", aH.getDisks).Methods(http.MethodGet)

	// === Authentication APIs ===
	router.HandleFunc("/api/v1/invite", aH.inviteUser).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/invite/{token}", aH.getInvite).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/invite/{email}", aH.revokeInvite).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/invite", aH.listPendingInvites).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/register", aH.registerUser).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/login", aH.loginUser).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/user", aH.listUsers).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/{id}", aH.getUser).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/user/{id}", aH.editUser).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/user/{id}", aH.deleteUser).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/rbac/role/{id}", aH.getRole).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/rbac/role/{id}", aH.editRole).Methods(http.MethodPut)

	router.HandleFunc("/api/v1/org", aH.getOrgs).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/org/{id}", aH.getOrg).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/org/{id}", aH.editOrg).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/orgUsers/{id}", aH.getOrgUsers).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/getResetPasswordToken/{id}", aH.getResetPasswordToken).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/resetPassword", aH.resetPassword).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/changePassword/{id}", aH.changePassword).Methods(http.MethodPost)

	// We are not exposing any group or rule related APIs right now. They will be exposed later
	// when we'll have more fine-grained RBAC based on various APIs classes and services.

	// router.HandleFunc("/api/v1/rbac/group", aH.createGroup).Methods(http.MethodPost)
	// router.HandleFunc("/api/v1/rbac/group", aH.listGroups).Methods(http.MethodGet)
	// router.HandleFunc("/api/v1/rbac/group/{id}", aH.getGroup).Methods(http.MethodGet)
	// router.HandleFunc("/api/v1/rbac/group/{id}", aH.deleteGroup).Methods(http.MethodDelete)

	// router.HandleFunc("/api/v1/rbac/rule", aH.createRBACRule).Methods(http.MethodPost)
	// router.HandleFunc("/api/v1/rbac/rule", aH.listRBACRules).Methods(http.MethodGet)
	// router.HandleFunc("/api/v1/rbac/rule/{id}", aH.getRBACRule).Methods(http.MethodGet)
	// router.HandleFunc("/api/v1/rbac/rule/{id}", aH.deleteRBACRule).Methods(http.MethodDelete)

	// router.HandleFunc("/api/v1/rbac/groupRule", aH.assignRBACRule).Methods(http.MethodPost)
	// router.HandleFunc("/api/v1/rbac/groupRule", aH.unassignRBACRule).Methods(http.MethodDelete)
	// router.HandleFunc("/api/v1/rbac/groupRule/{id}", aH.getGroupRules).Methods(http.MethodGet)

	// router.HandleFunc("/api/v1/rbac/groupUser", aH.assignUser).Methods(http.MethodPost)
	// router.HandleFunc("/api/v1/rbac/groupUser", aH.unassignUser).Methods(http.MethodDelete)
	// router.HandleFunc("/api/v1/rbac/groupUser/{id}", aH.getGroupUsers).Methods(http.MethodGet)
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
	alertList, apiErrorObj := (*aH.reader).GetRule(id)
	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, alertList)
}

func (aH *APIHandler) listRulesFromProm(w http.ResponseWriter, r *http.Request) {
	alertList, apiErrorObj := (*aH.reader).ListRulesFromProm()
	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, alertList)
}

func (aH *APIHandler) getDashboards(w http.ResponseWriter, r *http.Request) {

	allDashboards, err := dashboards.GetDashboards()

	if err != nil {
		respondError(w, err, nil)
		return
	}
	tagsFromReq, ok := r.URL.Query()["tags"]
	if !ok || len(tagsFromReq) == 0 || tagsFromReq[0] == "" {
		aH.respond(w, &allDashboards)
		return
	}

	tags2Dash := make(map[string][]int)
	for i := 0; i < len(*allDashboards); i++ {
		tags, ok := (*allDashboards)[i].Data["tags"].([]interface{})
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

	inter := make([]int, len(*allDashboards))
	for i := range inter {
		inter[i] = i
	}

	for _, tag := range tagsFromReq {
		inter = Intersection(inter, tags2Dash[tag])
	}

	filteredDashboards := []dashboards.Dashboard{}
	for _, val := range inter {
		dash := (*allDashboards)[val]
		filteredDashboards = append(filteredDashboards, dash)
	}

	aH.respond(w, &filteredDashboards)

}
func (aH *APIHandler) deleteDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]
	err := dashboards.DeleteDashboard(uuid)

	if err != nil {
		respondError(w, err, nil)
		return
	}

	aH.respond(w, nil)

}

func (aH *APIHandler) updateDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]

	var postData map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}
	err = dashboards.IsPostDataSane(&postData)
	if err != nil {
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}

	dashboard, apiError := dashboards.UpdateDashboard(uuid, &postData)
	if apiError != nil {
		respondError(w, apiError, nil)
		return
	}

	aH.respond(w, dashboard)

}

func (aH *APIHandler) getDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]

	dashboard, apiError := dashboards.GetDashboard(uuid)

	if apiError != nil {
		respondError(w, apiError, nil)
		return
	}

	aH.respond(w, dashboard)

}

func (aH *APIHandler) createDashboards(w http.ResponseWriter, r *http.Request) {

	var postData map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		respondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, "Error reading request body")
		return
	}
	err = dashboards.IsPostDataSane(&postData)
	if err != nil {
		respondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, "Error reading request body")
		return
	}

	dash, apiErr := dashboards.CreateDashboard(&postData)

	if apiErr != nil {
		respondError(w, apiErr, nil)
		return
	}

	aH.respond(w, dash)

}

func (aH *APIHandler) deleteRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	apiErrorObj := (*aH.reader).DeleteRule(id)

	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, "rule successfully deleted")

}
func (aH *APIHandler) editRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	var postData map[string]string
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}

	apiErrorObj := (*aH.reader).EditRule(postData["data"], id)

	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, "rule successfully edited")

}

func (aH *APIHandler) getChannel(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	channel, apiErrorObj := (*aH.reader).GetChannel(id)
	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, channel)
}

func (aH *APIHandler) deleteChannel(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	apiErrorObj := (*aH.reader).DeleteChannel(id)
	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, "notification channel successfully deleted")
}

func (aH *APIHandler) listChannels(w http.ResponseWriter, r *http.Request) {
	channels, apiErrorObj := (*aH.reader).GetChannels()
	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, channels)
}

// testChannels sends test alert to all registered channels
func (aH *APIHandler) testChannel(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body of testChannel API\n", err)
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.S().Errorf("Error in parsing req body of testChannel API\n", err)
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	// send alert
	apiErrorObj := aH.alertManager.TestReceiver(receiver)
	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, "test alert sent")
}

func (aH *APIHandler) editChannel(w http.ResponseWriter, r *http.Request) {

	id := mux.Vars(r)["id"]

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body of editChannel API\n", err)
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.S().Errorf("Error in parsing req body of editChannel API\n", err)
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	_, apiErrorObj := (*aH.reader).EditChannel(receiver, id)

	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, nil)

}

func (aH *APIHandler) createChannel(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body of createChannel API\n", err)
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.S().Errorf("Error in parsing req body of createChannel API\n", err)
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	_, apiErrorObj := (*aH.reader).CreateChannel(receiver)

	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, nil)

}

func (aH *APIHandler) createRule(w http.ResponseWriter, r *http.Request) {

	decoder := json.NewDecoder(r.Body)

	var postData map[string]string
	err := decoder.Decode(&postData)

	if err != nil {
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	apiErrorObj := (*aH.reader).CreateRule(postData["data"])

	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, "rule successfully added")

}

func (aH *APIHandler) queryRangeMetrics(w http.ResponseWriter, r *http.Request) {

	query, apiErrorObj := parseQueryRangeRequest(r)

	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}

	// zap.S().Info(query, apiError)

	ctx := r.Context()
	if to := r.FormValue("timeout"); to != "" {
		var cancel context.CancelFunc
		timeout, err := parseMetricsDuration(to)
		if aH.handleError(w, err, http.StatusBadRequest) {
			return
		}

		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	res, qs, apiError := (*aH.reader).GetQueryRangeResult(ctx, query)

	if apiError != nil {
		respondError(w, apiError, nil)
		return
	}

	if res.Err != nil {
		zap.S().Error(res.Err)
	}

	if res.Err != nil {
		switch res.Err.(type) {
		case promql.ErrQueryCanceled:
			respondError(w, &model.ApiError{model.ErrorCanceled, res.Err}, nil)
		case promql.ErrQueryTimeout:
			respondError(w, &model.ApiError{model.ErrorTimeout, res.Err}, nil)
		}
		respondError(w, &model.ApiError{model.ErrorExec, res.Err}, nil)
	}

	response_data := &model.QueryData{
		ResultType: res.Value.Type(),
		Result:     res.Value,
		Stats:      qs,
	}

	aH.respond(w, response_data)

}

func (aH *APIHandler) queryMetrics(w http.ResponseWriter, r *http.Request) {

	queryParams, apiErrorObj := parseInstantQueryMetricsRequest(r)

	if apiErrorObj != nil {
		respondError(w, apiErrorObj, nil)
		return
	}

	// zap.S().Info(query, apiError)

	ctx := r.Context()
	if to := r.FormValue("timeout"); to != "" {
		var cancel context.CancelFunc
		timeout, err := parseMetricsDuration(to)
		if aH.handleError(w, err, http.StatusBadRequest) {
			return
		}

		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	res, qs, apiError := (*aH.reader).GetInstantQueryMetricsResult(ctx, queryParams)

	if apiError != nil {
		respondError(w, apiError, nil)
		return
	}

	if res.Err != nil {
		zap.S().Error(res.Err)
	}

	if res.Err != nil {
		switch res.Err.(type) {
		case promql.ErrQueryCanceled:
			respondError(w, &model.ApiError{model.ErrorCanceled, res.Err}, nil)
		case promql.ErrQueryTimeout:
			respondError(w, &model.ApiError{model.ErrorTimeout, res.Err}, nil)
		}
		respondError(w, &model.ApiError{model.ErrorExec, res.Err}, nil)
	}

	response_data := &model.QueryData{
		ResultType: res.Value.Type(),
		Result:     res.Value,
		Stats:      qs,
	}

	aH.respond(w, response_data)

}

func (aH *APIHandler) submitFeedback(w http.ResponseWriter, r *http.Request) {

	var postData map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}

	message, ok := postData["message"]
	if !ok {
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("message not present in request body")}, "Error reading message from request body")
		return
	}
	messageStr := fmt.Sprintf("%s", message)
	if len(messageStr) == 0 {
		respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("empty message in request body")}, "empty message in request body")
		return
	}

	email := postData["email"]

	data := map[string]interface{}{
		"email":   email,
		"message": message,
	}
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_INPRODUCT_FEEDBACK, data)

}

func (aH *APIHandler) user(w http.ResponseWriter, r *http.Request) {

	user, err := parseUser(r)
	if err != nil {
		if aH.handleError(w, err, http.StatusBadRequest) {
			return
		}
	}

	telemetry.GetInstance().IdentifyUser(user)
	data := map[string]interface{}{
		"name":             user.Name,
		"email":            user.Email,
		"organizationName": user.OrgId,
	}
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER, data)

}

func (aH *APIHandler) getOperations(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	serviceName := vars["service"]

	var err error
	if len(serviceName) == 0 {
		err = fmt.Errorf("service param not found")
	}
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetOperations(context.Background(), serviceName)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getServicesList(w http.ResponseWriter, r *http.Request) {

	result, err := (*aH.reader).GetServicesList(context.Background())
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) searchTags(w http.ResponseWriter, r *http.Request) {

	serviceName := r.URL.Query().Get("service")

	result, err := (*aH.reader).GetTags(context.Background(), serviceName)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getTopEndpoints(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetTopEndpointsRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetTopEndpoints(context.Background(), query)

	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getUsage(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetUsageRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetUsage(context.Background(), query)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getServiceDBOverview(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServiceExternalRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetServiceDBOverview(context.Background(), query)

	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getServiceExternal(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServiceExternalRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetServiceExternal(context.Background(), query)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) GetServiceExternalAvgDuration(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServiceExternalRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetServiceExternalAvgDuration(context.Background(), query)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getServiceExternalErrors(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServiceExternalRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetServiceExternalErrors(context.Background(), query)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getServiceOverview(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServiceOverviewRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetServiceOverview(context.Background(), query)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getServices(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServicesRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetServices(context.Background(), query)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	data := map[string]interface{}{
		"number": len(*result),
	}

	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_NUMBER_OF_SERVICES, data)

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) serviceMapDependencies(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServicesRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).GetServiceMapDependencies(context.Background(), query)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) searchTraces(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	traceId := vars["traceId"]

	result, err := (*aH.reader).SearchTraces(context.Background(), traceId)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getErrors(w http.ResponseWriter, r *http.Request) {

	query, err := parseErrorsRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}
	result, apiErr := (*aH.reader).GetErrors(context.Background(), query)
	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getErrorForId(w http.ResponseWriter, r *http.Request) {

	query, err := parseErrorRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}
	result, apiErr := (*aH.reader).GetErrorForId(context.Background(), query)
	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getErrorForType(w http.ResponseWriter, r *http.Request) {

	query, err := parseErrorRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}
	result, apiErr := (*aH.reader).GetErrorForType(context.Background(), query)
	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) searchSpansAggregates(w http.ResponseWriter, r *http.Request) {

	query, err := parseSearchSpanAggregatesRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, err := (*aH.reader).SearchSpansAggregate(context.Background(), query)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) searchSpans(w http.ResponseWriter, r *http.Request) {

	query, err := parseSpanSearchRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	// result, err := druidQuery.SearchSpans(aH.client, query)
	result, err := (*aH.reader).SearchSpans(context.Background(), query)

	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) getSpanFilters(w http.ResponseWriter, r *http.Request) {

	query, err := parseSpanFilterRequestBody(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := (*aH.reader).GetSpanFilters(context.Background(), query)

	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) getFilteredSpans(w http.ResponseWriter, r *http.Request) {

	query, err := parseFilteredSpansRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := (*aH.reader).GetFilteredSpans(context.Background(), query)

	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) getFilteredSpanAggregates(w http.ResponseWriter, r *http.Request) {

	query, err := parseFilteredSpanAggregatesRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := (*aH.reader).GetFilteredSpansAggregates(context.Background(), query)

	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) getTagFilters(w http.ResponseWriter, r *http.Request) {

	query, err := parseTagFilterRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := (*aH.reader).GetTagFilters(context.Background(), query)

	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) getTagValues(w http.ResponseWriter, r *http.Request) {

	query, err := parseTagValueRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := (*aH.reader).GetTagValues(context.Background(), query)

	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) setTTL(w http.ResponseWriter, r *http.Request) {
	ttlParams, err := parseTTLParams(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := (*aH.reader).SetTTL(context.Background(), ttlParams)
	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)

}

func (aH *APIHandler) getTTL(w http.ResponseWriter, r *http.Request) {
	ttlParams, err := parseGetTTL(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := (*aH.reader).GetTTL(context.Background(), ttlParams)
	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) getDisks(w http.ResponseWriter, r *http.Request) {
	result, apiErr := (*aH.reader).GetDisks(context.Background())
	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) getVersion(w http.ResponseWriter, r *http.Request) {

	version := version.GetVersion()

	aH.writeJSON(w, r, map[string]string{"version": version})
}

// inviteUser is used to invite a user. It is used by an admin api.
func (aH *APIHandler) inviteUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseInviteRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	ctx := auth.AttachJwtToContext(context.Background(), r)
	resp, err := auth.Invite(ctx, req)
	if err != nil {
		respondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}
	aH.writeJSON(w, r, resp)
}

// getInvite returns the invite object details for the given invite token. We do not need to
// protect this API because invite token itself is meant to be private.
func (aH *APIHandler) getInvite(w http.ResponseWriter, r *http.Request) {
	token := mux.Vars(r)["token"]

	resp, err := auth.GetInvite(context.Background(), token)
	if err != nil {
		respondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}
	aH.writeJSON(w, r, resp)
}

// revokeInvite is used to revoke an invite.
func (aH *APIHandler) revokeInvite(w http.ResponseWriter, r *http.Request) {
	email := mux.Vars(r)["email"]

	ctx := auth.AttachJwtToContext(context.Background(), r)
	if err := auth.RevokeInvite(ctx, email); err != nil {
		respondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}
	aH.writeJSON(w, r, map[string]string{"data": "invite revoked successfully"})
}

// listPendingInvites is used to list the pending invites.
func (aH *APIHandler) listPendingInvites(w http.ResponseWriter, r *http.Request) {

	ctx := context.Background()
	invites, err := dao.DB().GetInvites(ctx)
	if err != nil {
		respondError(w, err, nil)
		return
	}

	// TODO(Ahsan): Querying org name based on orgId for each invite is not a good idea. Either
	// we should include org name field in the invite table, or do a join query.
	var resp []*model.InvitationResponseObject
	for _, inv := range invites {

		org, apiErr := dao.DB().GetOrg(ctx, inv.OrgId)
		if apiErr != nil {
			respondError(w, apiErr, nil)
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
	aH.writeJSON(w, r, resp)
}

func (aH *APIHandler) registerUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseRegisterRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	apiErr := auth.Register(context.Background(), req)
	if apiErr != nil {
		respondError(w, apiErr, nil)
		return
	}

	aH.writeJSON(w, r, map[string]string{"data": "user registered successfully"})
}

func (aH *APIHandler) loginUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseLoginRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
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
	if aH.handleError(w, err, http.StatusUnauthorized) {
		return
	}

	// http.SetCookie(w, &http.Cookie{
	// 	Name:     "refresh-token",
	// 	Value:    resp.RefreshJwt,
	// 	Expires:  time.Unix(resp.RefreshJwtExpiry, 0),
	// 	HttpOnly: true,
	// })

	aH.writeJSON(w, r, resp)
}

func (aH *APIHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	users, err := dao.DB().GetUsers(context.Background())
	if err != nil {
		zap.S().Debugf("[listUsers] Failed to query list of users, err: %v", err)
		respondError(w, err, nil)
		return
	}
	aH.writeJSON(w, r, users)
}

func (aH *APIHandler) getUser(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	ctx := context.Background()
	user, err := dao.DB().GetUser(ctx, id)
	if err != nil {
		zap.S().Debugf("[getUser] Failed to query user, err: %v", err)
		respondError(w, err, "Failed to get user")
		return
	}
	// No need to send password hash for the user object.
	if user != nil {
		user.Password = ""
	}

	aH.writeJSON(w, r, user)
}

// editUser only changes the user's Name and ProfilePictureURL. It is intentionally designed
// to not support update of orgId, Password, createdAt for the sucurity reasons.
func (aH *APIHandler) editUser(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	update, err := parseUserRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	ctx := context.Background()
	old, apiErr := dao.DB().GetUser(ctx, id)
	if apiErr != nil {
		zap.S().Debugf("[editUser] Failed to query user, err: %v", err)
		respondError(w, apiErr, nil)
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
		respondError(w, apiErr, nil)
		return
	}
	aH.writeJSON(w, r, map[string]string{"data": "user updated successfully"})
}

func (aH *APIHandler) deleteUser(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	if !auth.IsAdmin(r) {
		respondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: errors.New("Only admin can delete user"),
		}, "Failed to get user")
		return
	}

	// Query for the user's group, and the admin's group. If the user belongs to the admin group
	// and is the last user then don't let the deletion happen. Otherwise, the system will become
	// admin less and hence inaccessible.
	ctx := context.Background()
	userGroup, apiErr := dao.DB().GetUserGroup(ctx, id)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to get user's group")
		return
	}
	adminGroup, apiErr := dao.DB().GetGroupByName(ctx, constants.AdminGroup)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to get admin group")
		return
	}
	adminUsers, apiErr := dao.DB().GetGroupUsers(ctx, adminGroup.Id)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to get admin group users")
		return
	}

	if userGroup.GroupId == adminGroup.Id && len(adminUsers) == 1 {
		respondError(w, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("cannot delete the last admin user")}, nil)
		return
	}

	err := dao.DB().DeleteUser(ctx, id)
	if err != nil {
		respondError(w, err, "Failed to delete user")
		return
	}
	aH.writeJSON(w, r, map[string]string{"data": "user deleted successfully"})
}

func (aH *APIHandler) getRole(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	gu, err := dao.DB().GetUserGroup(context.Background(), id)
	if err != nil {
		respondError(w, err, "Failed to get user's group")
		return
	}
	group, err := dao.DB().GetGroup(context.Background(), gu.GroupId)
	if err != nil {
		respondError(w, err, "Failed to get group")
		return
	}

	aH.writeJSON(w, r, &model.UserRole{UserId: id, GroupName: group.Name})
}

func (aH *APIHandler) editRole(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	if !auth.IsAdmin(r) {
		respondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: errors.New("Only admin can edit roles"),
		}, "Failed to edit user")
		return
	}
	req, err := parseUserRoleRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	ctx := context.Background()
	g, apiErr := dao.DB().GetGroupByName(ctx, req.GroupName)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to get user's group")
		return
	}

	if g == nil {
		respondError(w, apiErr, "Specified group is not present")
		return
	}

	userGroup, apiErr := dao.DB().GetUserGroup(ctx, id)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to fetch user group")
		return
	}

	// Make sure that the request is not demoting the last admin user.
	if userGroup.GroupId == auth.AuthCacheObj.AdminGroupId {
		adminUsers, apiErr := dao.DB().GetGroupUsers(ctx, auth.AuthCacheObj.AdminGroupId)
		if apiErr != nil {
			respondError(w, apiErr, "Failed to fetch adminUsers")
			return
		}

		if len(adminUsers) == 1 {
			respondError(w, &model.ApiError{
				Err: errors.New("Cannot demote the last admin"),
				Typ: model.ErrorInternal}, nil)
			return
		}
	}

	apiErr = dao.DB().UpdateUserGroup(context.Background(), &model.GroupUser{
		UserId:  id,
		GroupId: g.Id,
	})
	if apiErr != nil {
		respondError(w, apiErr, "Failed to add user to group")
		return
	}

	auth.AuthCacheObj.AddGroupUser(&model.GroupUser{UserId: id, GroupId: g.Id})
	aH.writeJSON(w, r, map[string]string{"data": "user group updated successfully"})
}

func (aH *APIHandler) createGroup(w http.ResponseWriter, r *http.Request) {
	req, err := parseCreateGroupRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	g, apiErr := dao.DB().CreateGroup(context.Background(), req)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to create group")
		return
	}

	aH.writeJSON(w, r, g)
}

func (aH *APIHandler) listGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := dao.DB().GetGroups(context.Background())
	if err != nil {
		respondError(w, err, "Failed to get groups list")
		return
	}
	aH.writeJSON(w, r, groups)
}

func (aH *APIHandler) getGroup(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	group, err := dao.DB().GetGroup(context.Background(), id)
	if err != nil {
		respondError(w, err, "Failed to get group")
		return
	}
	aH.writeJSON(w, r, group)
}

func (aH *APIHandler) deleteGroup(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	err := dao.DB().DeleteGroup(context.Background(), id)
	if err != nil {
		respondError(w, err, "Failed to query group")
		return
	}
	aH.writeJSON(w, r, map[string]string{"data": "group deleted successfully"})
}

func (aH *APIHandler) createRBACRule(w http.ResponseWriter, r *http.Request) {
	req, err := parseCreateRBACRuleRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	if !auth.IsValidAPIClass(req.ApiClass) {
		respondError(w, &model.ApiError{
			Err: fmt.Errorf("Unknown API class, must be one of %s\n", auth.ValidAPIClasses()),
		}, "Failed to create rule")
		return
	}

	rule, apiErr := dao.DB().CreateRule(context.Background(), req)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to create rule")
		return
	}

	aH.writeJSON(w, r, rule)
}

func (aH *APIHandler) listRBACRules(w http.ResponseWriter, r *http.Request) {
	rules, err := dao.DB().GetRules(context.Background())
	if err != nil {
		respondError(w, err, "Failed to get rules list")
		return
	}
	aH.writeJSON(w, r, rules)
}

func (aH *APIHandler) getRBACRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	user, err := dao.DB().GetRule(context.Background(), id)
	if err != nil {
		respondError(w, err, "Failed to get rule")
		return
	}
	aH.writeJSON(w, r, user)
}
func (aH *APIHandler) deleteRBACRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	err := dao.DB().DeleteRule(context.Background(), id)
	if err != nil {
		respondError(w, err, "Failed to query rule")
		return
	}
	aH.writeJSON(w, r, map[string]string{"data": "rule deleted successfully"})
}

func (aH *APIHandler) getGroupRules(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	rules, err := dao.DB().GetGroupRules(context.Background(), id)
	if err != nil {
		respondError(w, err, "Failed to get group rules")
		return
	}
	aH.writeJSON(w, r, rules)
}

func (aH *APIHandler) assignRBACRule(w http.ResponseWriter, r *http.Request) {
	req, err := parseGroupRuleRequest(r)
	fmt.Printf("parsed req: %+v\n", req)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	apiErr := dao.DB().AddRuleToGroup(context.Background(), req)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to assign rule")
		return
	}

	aH.writeJSON(w, r, map[string]string{"data": "rule assigned successfully"})
}

func (aH *APIHandler) unassignRBACRule(w http.ResponseWriter, r *http.Request) {
	req, err := parseGroupRuleRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	apiErr := dao.DB().DeleteRuleFromGroup(context.Background(), req)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to assign rule")
		return
	}

	aH.writeJSON(w, r, map[string]string{"data": "rule removed successfully"})
}

func (aH *APIHandler) getGroupUsers(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	users, err := dao.DB().GetGroupUsers(context.Background(), id)
	if err != nil {
		respondError(w, err, "Failed to get users")
		return
	}
	aH.writeJSON(w, r, users)
}

func (aH *APIHandler) assignUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseGroupUserRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	apiErr := dao.DB().AddUserToGroup(context.Background(), req)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to assign user to group")
		return
	}

	aH.writeJSON(w, r, map[string]string{"data": "user assigned successfully"})
}

func (aH *APIHandler) unassignUser(w http.ResponseWriter, r *http.Request) {
	req, err := parseGroupUserRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	apiErr := dao.DB().DeleteUserFromGroup(context.Background(), req)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to assign rule")
		return
	}

	aH.writeJSON(w, r, map[string]string{"data": "rule removed successfully"})
}

func (aH *APIHandler) getOrgs(w http.ResponseWriter, r *http.Request) {
	orgs, apiErr := dao.DB().GetOrgs(context.Background())
	if apiErr != nil {
		respondError(w, apiErr, "Failed to fetch orgs from the DB")
		return
	}
	aH.writeJSON(w, r, orgs)
}

func (aH *APIHandler) getOrg(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	org, apiErr := dao.DB().GetOrg(context.Background(), id)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to fetch org from the DB")
		return
	}
	aH.writeJSON(w, r, org)
}

func (aH *APIHandler) editOrg(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	req, err := parseEditOrgRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	req.Id = id
	if apiErr := dao.DB().EditOrg(context.Background(), req); apiErr != nil {
		respondError(w, apiErr, "Failed to update org in the DB")
		return
	}

	data := map[string]interface{}{
		"hasOptedUpdates": req.HasOptedUpdates,
		"isAnonymous":     req.IsAnonymous,
	}
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER_PREFERENCES, data)

	aH.writeJSON(w, r, map[string]string{"data": "org updated successfully"})
}

func (aH *APIHandler) getOrgUsers(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	orgs, apiErr := dao.DB().GetUsersByOrg(context.Background(), id)
	if apiErr != nil {
		respondError(w, apiErr, "Failed to fetch org users from the DB")
		return
	}
	aH.writeJSON(w, r, orgs)
}

func (aH *APIHandler) getResetPasswordToken(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	resp, err := auth.CreateResetPasswordToken(context.Background(), id)
	if err != nil {
		respondError(w, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: err}, "Failed to create reset token entry in the DB")
		return
	}
	aH.writeJSON(w, r, resp)
}

func (aH *APIHandler) resetPassword(w http.ResponseWriter, r *http.Request) {
	req, err := parseResetPasswordRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	if err := auth.ResetPassword(context.Background(), req); err != nil {
		zap.S().Debugf("resetPassword failed, err: %v\n", err)
		if aH.handleError(w, err, http.StatusInternalServerError) {
			return
		}

	}
	aH.writeJSON(w, r, map[string]string{"data": "password reset successfully"})
}

func (aH *APIHandler) changePassword(w http.ResponseWriter, r *http.Request) {
	req, err := parseChangePasswordRequest(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	if err := auth.ChangePassword(context.Background(), req); err != nil {
		if aH.handleError(w, err, http.StatusInternalServerError) {
			return
		}

	}
	aH.writeJSON(w, r, map[string]string{"data": "password changed successfully"})
}

// func (aH *APIHandler) getApplicationPercentiles(w http.ResponseWriter, r *http.Request) {
// 	// vars := mux.Vars(r)

// 	query, err := parseApplicationPercentileRequest(r)
// 	if aH.handleError(w, err, http.StatusBadRequest) {
// 		return
// 	}

// 	result, err := (*aH.reader).GetApplicationPercentiles(context.Background(), query)
// 	if aH.handleError(w, err, http.StatusBadRequest) {
// 		return
// 	}
// 	aH.writeJSON(w, r, result)
// }

func (aH *APIHandler) handleError(w http.ResponseWriter, err error, statusCode int) bool {
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

func (aH *APIHandler) writeJSON(w http.ResponseWriter, r *http.Request, response interface{}) {
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
