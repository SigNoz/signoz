package app

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	"github.com/posthog/posthog-go"
	"github.com/prometheus/prometheus/promql"
	"go.signoz.io/query-service/model"
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
	basePath   string
	apiPrefix  string
	reader     *Reader
	pc         *posthog.Client
	distinctId string
	ready      func(http.HandlerFunc) http.HandlerFunc
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(reader *Reader, pc *posthog.Client, distinctId string) *APIHandler {

	aH := &APIHandler{
		reader:     reader,
		pc:         pc,
		distinctId: distinctId,
	}
	aH.ready = aH.testReady
	return aH
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

	router.HandleFunc("/api/v1/user", aH.user).Methods(http.MethodPost)
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

func (aH *APIHandler) user(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")

	var err error
	if len(email) == 0 {
		err = fmt.Errorf("Email param is missing")
	}
	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	(*aH.pc).Enqueue(posthog.Identify{
		DistinctId: aH.distinctId,
		Properties: posthog.NewProperties().
			Set("email", email),
	})

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
	if len(*result) != 4 {
		(*aH.pc).Enqueue(posthog.Capture{
			DistinctId: distinctId,
			Event:      "Different Number of Services",
			Properties: posthog.NewProperties().Set("number", len(*result)),
		})
	}

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
