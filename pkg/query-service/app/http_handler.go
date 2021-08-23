package app

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"time"

	"github.com/go-kit/log"
	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	"github.com/posthog/posthog-go"
	"github.com/prometheus/common/model"
	"github.com/prometheus/common/promlog"
	"github.com/prometheus/prometheus/config"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage/remote"
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
	basePath      string
	apiPrefix     string
	reader        *Reader
	pc            *posthog.Client
	distinctId    string
	ready         func(http.HandlerFunc) http.HandlerFunc
	queryEngine   *promql.Engine
	remoteStorage *remote.Storage
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(reader *Reader, pc *posthog.Client, distinctId string) *APIHandler {
	logLevel := promlog.AllowedLevel{}
	logLevel.Set("debug")
	// allowedFormat := promlog.AllowedFormat{}
	// allowedFormat.Set("logfmt")

	// promlogConfig := promlog.Config{
	// 	Level:  &logLevel,
	// 	Format: &allowedFormat,
	// }

	logger := promlog.New(logLevel)

	opts := promql.EngineOpts{
		Logger:        log.With(logger, "component", "query engine"),
		Reg:           nil,
		MaxConcurrent: 20,
		MaxSamples:    50000000,
		Timeout:       time.Duration(2 * time.Minute),
	}

	queryEngine := promql.NewEngine(opts)

	startTime := func() (int64, error) {
		return int64(model.Latest), nil

	}

	remoteStorage := remote.NewStorage(log.With(logger, "component", "remote"), startTime, time.Duration(1*time.Minute))

	filename := flag.String("config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	flag.Parse()
	conf, err := config.LoadFile(*filename)
	if err != nil {
		zap.S().Error("couldn't load configuration (--config.file=%q): %v", filename, err)
	}
	remoteStorage.ApplyConfig(conf)

	aH := &APIHandler{
		reader:        reader,
		pc:            pc,
		distinctId:    distinctId,
		queryEngine:   queryEngine,
		remoteStorage: remoteStorage,
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

type apiFunc func(r *http.Request) (interface{}, *apiError, func())

// Checks if server is ready, calls f if it is, returns 503 if it is not.
func (aH *APIHandler) testReady(f http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		f(w, r)

	}
}

// // Register the API's endpoints in the given router.
// func (aH *APIHandler) Register(r *route.Router) {
// 	wrap := func(f apiFunc) http.HandlerFunc {
// 		hf := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 			setCORS(w)
// 			data, err, finalizer := f(r)
// 			if err != nil {
// 				aH.respondError(w, err, data)
// 			} else if data != nil {
// 				aH.respond(w, data)
// 			} else {
// 				w.WriteHeader(http.StatusNoContent)
// 			}
// 			if finalizer != nil {
// 				finalizer()
// 			}
// 		})
// 		return aH.ready(httputil.CompressionHandler{
// 			Handler: hf,
// 		}.ServeHTTP)
// 	}
// 	r.Get("/api/v1/query_range", wrap(aH.queryRange))
// }

type response struct {
	Status    status      `json:"status"`
	Data      interface{} `json:"data,omitempty"`
	ErrorType errorType   `json:"errorType,omitempty"`
	Error     string      `json:"error,omitempty"`
}

func (aH *APIHandler) respondError(w http.ResponseWriter, apiErr *apiError, data interface{}) {
	json := jsoniter.ConfigCompatibleWithStandardLibrary
	b, err := json.Marshal(&response{
		Status:    statusError,
		ErrorType: apiErr.typ,
		Error:     apiErr.err.Error(),
		Data:      data,
	})
	if err != nil {
		zap.S().Error("msg", "error marshalling json response", "err", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var code int
	switch apiErr.typ {
	case errorBadData:
		code = http.StatusBadRequest
	case errorExec:
		code = 422
	case errorCanceled, errorTimeout:
		code = http.StatusServiceUnavailable
	case errorInternal:
		code = http.StatusInternalServerError
	case errorNotFound:
		code = http.StatusNotFound
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
	router.HandleFunc("/api/v1/query_range", aH.queryRange).Methods(http.MethodGet)

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

// func (aH *APIHandler) queryRange(r *http.Request) (interface{}, *apiError, func()) {

func (aH *APIHandler) queryRange(w http.ResponseWriter, r *http.Request) {

	query, apiError := parseQueryRangeRequest(r)

	// if aH.handleError(w, apiError.err, http.StatusBadRequest) {
	// 	return
	// }

	zap.S().Info(query, apiError)

	// result, err := (*aH.reader).GetQueryRangeResult(context.Background(), query)

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

	qry, err := aH.queryEngine.NewRangeQuery(aH.remoteStorage, r.FormValue("query"), query.Start, query.End, query.Step)

	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}
	res := qry.Exec(ctx)

	if res.Err != nil {
		zap.S().Error(res.Err)
	}

	// if res.Err != nil {
	// 	switch res.Err.(type) {
	// 	case promql.ErrQueryCanceled:
	// 		return nil, &apiError{errorCanceled, res.Err}, qry.Close
	// 	case promql.ErrQueryTimeout:
	// 		return nil, &apiError{errorTimeout, res.Err}, qry.Close
	// 	}
	// 	return nil, &apiError{errorExec, res.Err}, qry.Close
	// }

	// return &model.QueryData{
	// 	ResultType: res.Value.Type(),
	// 	Result:     res.Value,
	// 	Stats:      qs,
	// }, nil, qry.Close
	// return &model.QueryData{}, nil, nil

	if aH.handleError(w, err, http.StatusBadRequest) {
		return
	}

	aH.writeJSON(w, r, res.Value)

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
