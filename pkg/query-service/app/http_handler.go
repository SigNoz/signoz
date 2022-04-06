package app

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	_ "github.com/mattn/go-sqlite3"
	"github.com/prometheus/prometheus/promql"
	"go.signoz.io/query-service/app/dashboards"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao/interfaces"
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
	relationalDB *interfaces.ModelDao
	ready        func(http.HandlerFunc) http.HandlerFunc
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(reader *Reader, relationalDB *interfaces.ModelDao) (*APIHandler, error) {

	aH := &APIHandler{
		reader:       reader,
		relationalDB: relationalDB,
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

func (aH *APIHandler) respondError(w http.ResponseWriter, apiErr *model.ApiError, data interface{}) {
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
	default:
		code = http.StatusInternalServerError
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if n, err := w.Write(b); err != nil {
		zap.S().Error("msg", "error writing response", "bytesWritten", n, "err", err)
	}
}

func (aH *APIHandler) respond(w http.ResponseWriter, data interface{}) {
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

// RegisterRoutes registers routes for this handler on the given router
func (aH *APIHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/api/v1/query_range", aH.queryRangeMetrics).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/query", aH.queryMetrics).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels", aH.listChannels).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", aH.getChannel).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/channels/{id}", aH.editChannel).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/channels/{id}", aH.deleteChannel).Methods(http.MethodDelete)
	router.HandleFunc("/api/v1/channels", aH.createChannel).Methods(http.MethodPost)
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
	router.HandleFunc("/api/v1/settings/ttl", aH.removeTTL).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/userPreferences", aH.setUserPreferences).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/userPreferences", aH.getUserPreferences).Methods(http.MethodGet)
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
		aH.respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, alertList)
}

func (aH *APIHandler) listRulesFromProm(w http.ResponseWriter, r *http.Request) {
	alertList, apiErrorObj := (*aH.reader).ListRulesFromProm()
	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, alertList)
}

func (aH *APIHandler) getDashboards(w http.ResponseWriter, r *http.Request) {

	allDashboards, err := dashboards.GetDashboards()

	if err != nil {
		aH.respondError(w, err, nil)
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
		aH.respondError(w, err, nil)
		return
	}

	aH.respond(w, nil)

}

func (aH *APIHandler) updateDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]

	var postData map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}
	err = dashboards.IsPostDataSane(&postData)
	if err != nil {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}

	if postData["uuid"] != uuid {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("uuid in request param and uuid in request body do not match")}, "Error reading request body")
		return
	}

	dashboard, apiError := dashboards.UpdateDashboard(&postData)

	if apiError != nil {
		aH.respondError(w, apiError, nil)
		return
	}

	aH.respond(w, dashboard)

}

func (aH *APIHandler) getDashboard(w http.ResponseWriter, r *http.Request) {

	uuid := mux.Vars(r)["uuid"]

	dashboard, apiError := dashboards.GetDashboard(uuid)

	if apiError != nil {
		aH.respondError(w, apiError, nil)
		return
	}

	aH.respond(w, dashboard)

}

func (aH *APIHandler) createDashboards(w http.ResponseWriter, r *http.Request) {

	var postData map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, "Error reading request body")
		return
	}
	err = dashboards.IsPostDataSane(&postData)
	if err != nil {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, "Error reading request body")
		return
	}

	dash, apiErr := dashboards.CreateDashboard(&postData)

	if apiErr != nil {
		aH.respondError(w, apiErr, nil)
		return
	}

	aH.respond(w, dash)

}

func (aH *APIHandler) deleteRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	apiErrorObj := (*aH.reader).DeleteRule(id)

	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, "rule successfully deleted")

}
func (aH *APIHandler) editRule(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	var postData map[string]string
	err := json.NewDecoder(r.Body).Decode(&postData)
	if err != nil {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}

	apiErrorObj := (*aH.reader).EditRule(postData["data"], id)

	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, "rule successfully edited")

}

func (aH *APIHandler) getChannel(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	channel, apiErrorObj := (*aH.reader).GetChannel(id)
	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, channel)
}

func (aH *APIHandler) deleteChannel(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	apiErrorObj := (*aH.reader).DeleteChannel(id)
	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, "notification channel successfully deleted")
}

func (aH *APIHandler) listChannels(w http.ResponseWriter, r *http.Request) {
	channels, apiErrorObj := (*aH.reader).GetChannels()
	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}
	aH.respond(w, channels)
}

func (aH *APIHandler) editChannel(w http.ResponseWriter, r *http.Request) {

	id := mux.Vars(r)["id"]

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body of editChannel API\n", err)
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.S().Errorf("Error in parsing req body of editChannel API\n", err)
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	_, apiErrorObj := (*aH.reader).EditChannel(receiver, id)

	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, nil)

}

func (aH *APIHandler) createChannel(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		zap.S().Errorf("Error in getting req body of createChannel API\n", err)
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	receiver := &am.Receiver{}
	if err := json.Unmarshal(body, receiver); err != nil { // Parse []byte to go struct pointer
		zap.S().Errorf("Error in parsing req body of createChannel API\n", err)
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	_, apiErrorObj := (*aH.reader).CreateChannel(receiver)

	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, nil)

}

func (aH *APIHandler) createRule(w http.ResponseWriter, r *http.Request) {

	decoder := json.NewDecoder(r.Body)

	var postData map[string]string
	err := decoder.Decode(&postData)

	if err != nil {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, nil)
		return
	}

	apiErrorObj := (*aH.reader).CreateRule(postData["data"])

	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
		return
	}

	aH.respond(w, "rule successfully added")

}

func (aH *APIHandler) queryRangeMetrics(w http.ResponseWriter, r *http.Request) {

	query, apiErrorObj := parseQueryRangeRequest(r)

	if apiErrorObj != nil {
		aH.respondError(w, apiErrorObj, nil)
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
		aH.respondError(w, apiError, nil)
		return
	}

	if res.Err != nil {
		zap.S().Error(res.Err)
	}

	if res.Err != nil {
		switch res.Err.(type) {
		case promql.ErrQueryCanceled:
			aH.respondError(w, &model.ApiError{model.ErrorCanceled, res.Err}, nil)
		case promql.ErrQueryTimeout:
			aH.respondError(w, &model.ApiError{model.ErrorTimeout, res.Err}, nil)
		}
		aH.respondError(w, &model.ApiError{model.ErrorExec, res.Err}, nil)
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
		aH.respondError(w, apiErrorObj, nil)
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
		aH.respondError(w, apiError, nil)
		return
	}

	if res.Err != nil {
		zap.S().Error(res.Err)
	}

	if res.Err != nil {
		switch res.Err.(type) {
		case promql.ErrQueryCanceled:
			aH.respondError(w, &model.ApiError{model.ErrorCanceled, res.Err}, nil)
		case promql.ErrQueryTimeout:
			aH.respondError(w, &model.ApiError{model.ErrorTimeout, res.Err}, nil)
		}
		aH.respondError(w, &model.ApiError{model.ErrorExec, res.Err}, nil)
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
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading request body")
		return
	}

	message, ok := postData["message"]
	if !ok {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("message not present in request body")}, "Error reading message from request body")
		return
	}
	messageStr := fmt.Sprintf("%s", message)
	if len(messageStr) == 0 {
		aH.respondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("empty message in request body")}, "empty message in request body")
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
		"organizationName": user.OrganizationName,
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

func (aH *APIHandler) removeTTL(w http.ResponseWriter, r *http.Request) {
	ttlParams, err := parseRemoveTTL(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	existingTTL, apiErr := (*aH.reader).GetTTL(context.Background(), &model.GetTTLParams{GetAllTTL: true})
	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	if ttlParams.Type == constants.TraceTTL && existingTTL.TracesTime == -1 &&
		aH.handleError(w, fmt.Errorf("traces doesn't have any TTL set, cannot remove"), http.StatusBadRequest) {
		return
	}

	if ttlParams.Type == constants.MetricsTTL && existingTTL.MetricsTime == -1 &&
		aH.handleError(w, fmt.Errorf("metrics doesn't have any TTL set, cannot remove"), http.StatusBadRequest) {
		return
	}

	if ttlParams.RemoveAllTTL {
		if existingTTL.TracesTime == -1 && existingTTL.MetricsTime != -1 {
			ttlParams.Type = constants.MetricsTTL
			ttlParams.RemoveAllTTL = false
		} else if existingTTL.TracesTime != -1 && existingTTL.MetricsTime == -1 {
			ttlParams.Type = constants.TraceTTL
			ttlParams.RemoveAllTTL = false
		} else if aH.handleError(w, fmt.Errorf("no TTL set, cannot remove"), http.StatusBadRequest) {
			return
		}
	}

	result, apiErr := (*aH.reader).RemoveTTL(context.Background(), ttlParams)
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

func (aH *APIHandler) getUserPreferences(w http.ResponseWriter, r *http.Request) {

	result, apiError := (*aH.relationalDB).FetchUserPreference(context.Background())
	if apiError != nil {
		aH.respondError(w, apiError, "Error from Fetch Dao")
		return
	}

	aH.writeJSON(w, r, result)
}

func (aH *APIHandler) setUserPreferences(w http.ResponseWriter, r *http.Request) {
	userParams, err := parseUserPreferences(r)
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	apiErr := (*aH.relationalDB).UpdateUserPreferece(context.Background(), userParams)
	if apiErr != nil && aH.handleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	data := map[string]interface{}{
		"hasOptedUpdates": userParams.HasOptedUpdates,
		"isAnonymous":     userParams.IsAnonymous,
	}
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER_PREFERENCES, data)

	aH.writeJSON(w, r, map[string]string{"data": "user preferences set successfully"})

}

func (aH *APIHandler) getVersion(w http.ResponseWriter, r *http.Request) {

	version := version.GetVersion()

	aH.writeJSON(w, r, map[string]string{"version": version})
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
