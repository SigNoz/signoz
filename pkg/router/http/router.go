package http

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"regexp"
	"time"

	"github.com/gorilla/mux"
	semconv "go.opentelemetry.io/otel/semconv/v1.25.0"
	"go.signoz.io/signoz/pkg/log"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.uber.org/zap"
)

type Router struct {
	r   *mux.Router
	sub *mux.Router
}

func NewRouter(logger log.Logger) *Router {
	router := mux.NewRouter()
	sub := router.PathPrefix("/").Subrouter().UseEncodedPath()

	sub.Use(
		logRequest(logger),
	)

	return &Router{
		r:   router,
		sub: sub,
	}
}

func (router *Router) Handler() http.Handler {
	return router.r
}

func (router *Router) Mux() *mux.Router {
	return router.r
}

func (router *Router) Sub() *mux.Router {
	return router.sub
}

func logRequest(logger log.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			ctx := req.Context()
			start := time.Now()
			host, port, _ := net.SplitHostPort(req.Host)
			path, err := mux.CurrentRoute(req).GetPathTemplate()
			if err != nil {
				path = req.URL.Path
			}

			fields := []any{
				string(semconv.ClientAddressKey), req.RemoteAddr,
				string(semconv.UserAgentOriginalKey), req.UserAgent(),
				string(semconv.ServerAddressKey), host,
				string(semconv.ServerPortKey), port,
				string(semconv.HTTPRequestSizeKey), req.ContentLength,
				string(semconv.HTTPRouteKey), path,
			}

			writer := NewWriter(rw)
			next.ServeHTTP(writer, req)

			fields = append(fields,
				string(semconv.HTTPServerRequestDurationName), time.Since(start),
				string(semconv.HTTPResponseStatusCodeKey), writer.statusCode,
			)
			logger.Infoctx(ctx, "::RECEIVED-REQUEST::", fields...)
		})
	}

}

func timeout(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var cancel context.CancelFunc
		// check if route is not excluded
		url := r.URL.Path
		if _, ok := baseconst.TimeoutExcludedRoutes[url]; !ok {
			ctx, cancel = context.WithTimeout(r.Context(), baseconst.ContextTimeout)
			defer cancel()
		}

		r = r.WithContext(ctx)
		next.ServeHTTP(w, r)
	})
}

func analytics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := baseauth.AttachJwtToContext(r.Context(), r)
		r = r.WithContext(ctx)
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()

		queryRangeData, metadataExists := extractQueryRangeData(path, r)
		getActiveLogs(path, r)

		lrw := NewLoggingResponseWriter(w)
		next.ServeHTTP(lrw, r)

		data := map[string]interface{}{"path": path, "statusCode": lrw.statusCode}
		if metadataExists {
			for key, value := range queryRangeData {
				data[key] = value
			}
		}

		if _, ok := telemetry.EnabledPaths()[path]; ok {
			userEmail, err := baseauth.GetEmailFromJwt(r.Context())
			if err == nil {
				telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_PATH, data, userEmail, true, false)
			}
		}

	})
}

func extractQueryRangeData(path string, r *http.Request) (map[string]interface{}, bool) {
	pathToExtractBodyFromV3 := "/api/v3/query_range"
	pathToExtractBodyFromV4 := "/api/v4/query_range"

	data := map[string]interface{}{}
	var postData *v3.QueryRangeParamsV3

	if (r.Method == "POST") && ((path == pathToExtractBodyFromV3) || (path == pathToExtractBodyFromV4)) {
		if r.Body != nil {
			bodyBytes, err := io.ReadAll(r.Body)
			if err != nil {
				return nil, false
			}
			r.Body.Close() //  must close
			r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			json.Unmarshal(bodyBytes, &postData)

		} else {
			return nil, false
		}

	} else {
		return nil, false
	}

	referrer := r.Header.Get("Referer")

	dashboardMatched, err := regexp.MatchString(`/dashboard/[a-zA-Z0-9\-]+/(new|edit)(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the referrer", zap.Error(err))
	}
	alertMatched, err := regexp.MatchString(`/alerts/(new|edit)(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the alert: ", zap.Error(err))
	}
	logsExplorerMatched, err := regexp.MatchString(`/logs/logs-explorer(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the logs explorer: ", zap.Error(err))
	}
	traceExplorerMatched, err := regexp.MatchString(`/traces-explorer(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the trace explorer: ", zap.Error(err))
	}

	signozMetricsUsed := false
	signozLogsUsed := false
	signozTracesUsed := false
	if postData != nil {

		if postData.CompositeQuery != nil {
			data["queryType"] = postData.CompositeQuery.QueryType
			data["panelType"] = postData.CompositeQuery.PanelType

			signozLogsUsed, signozMetricsUsed, signozTracesUsed = telemetry.GetInstance().CheckSigNozSignals(postData)
		}
	}

	if signozMetricsUsed || signozLogsUsed || signozTracesUsed {
		if signozMetricsUsed {
			telemetry.GetInstance().AddActiveMetricsUser()
		}
		if signozLogsUsed {
			telemetry.GetInstance().AddActiveLogsUser()
		}
		if signozTracesUsed {
			telemetry.GetInstance().AddActiveTracesUser()
		}
		data["metricsUsed"] = signozMetricsUsed
		data["logsUsed"] = signozLogsUsed
		data["tracesUsed"] = signozTracesUsed
		userEmail, err := baseauth.GetEmailFromJwt(r.Context())
		if err == nil {
			// switch case to set data["screen"] based on the referrer
			switch {
			case dashboardMatched:
				data["screen"] = "panel"
			case alertMatched:
				data["screen"] = "alert"
			case logsExplorerMatched:
				data["screen"] = "logs-explorer"
			case traceExplorerMatched:
				data["screen"] = "traces-explorer"
			default:
				data["screen"] = "unknown"
				return data, true
			}
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_QUERY_RANGE_API, data, userEmail, true, false)
		}
	}
	return data, true
}

func getActiveLogs(path string, r *http.Request) {
	// if path == "/api/v1/dashboards/{uuid}" {
	// 	telemetry.GetInstance().AddActiveMetricsUser()
	// }
	if path == "/api/v1/logs" {
		hasFilters := len(r.URL.Query().Get("q"))
		if hasFilters > 0 {
			telemetry.GetInstance().AddActiveLogsUser()
		}

	}

}

// getUserFromRequest := func(r *http.Request) (*basemodel.UserPayload, error) {
// 	user, err := auth.GetUserFromRequest(r, apiHandler)

// 	if err != nil {
// 		return nil, err
// 	}

// 	if user.User.OrgId == "" {
// 		return nil, model.UnauthorizedError(errors.New("orgId is missing in the claims"))
// 	}

// 	return user, nil
// }
// am := baseapp.NewAuthMiddleware(getUserFromRequest)

// // 	c := cors.New(cors.Options{
// 		AllowedOrigins: []string{"*"},
// 		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH", "OPTIONS"},
// 		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "cache-control", "X-SIGNOZ-QUERY-ID", "Sec-WebSocket-Protocol"},
// 	})
// //

// 	handler = handlers.CompressHandler(handler)

// func LogCommentEnricher(next http.Handler) http.Handler {
// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		referrer := r.Header.Get("Referer")

// 		var path, dashboardID, alertID, page, client, viewName, tab string

// 		if referrer != "" {
// 			referrerURL, _ := url.Parse(referrer)
// 			client = "browser"
// 			path = referrerURL.Path

// 			if strings.Contains(path, "/dashboard") {
// 				// Split the path into segments
// 				pathSegments := strings.Split(referrerURL.Path, "/")
// 				// The dashboard ID should be the segment after "/dashboard/"
// 				// Loop through pathSegments to find "dashboard" and then take the next segment as the ID
// 				for i, segment := range pathSegments {
// 					if segment == "dashboard" && i < len(pathSegments)-1 {
// 						// Return the next segment, which should be the dashboard ID
// 						dashboardID = pathSegments[i+1]
// 					}
// 				}
// 				page = "dashboards"
// 			} else if strings.Contains(path, "/alerts") {
// 				urlParams := referrerURL.Query()
// 				alertID = urlParams.Get("ruleId")
// 				page = "alerts"
// 			} else if strings.Contains(path, "logs") && strings.Contains(path, "explorer") {
// 				page = "logs-explorer"
// 				viewName = referrerURL.Query().Get("viewName")
// 			} else if strings.Contains(path, "/trace") || strings.Contains(path, "traces-explorer") {
// 				page = "traces-explorer"
// 				viewName = referrerURL.Query().Get("viewName")
// 			} else if strings.Contains(path, "/services") {
// 				page = "services"
// 				tab = referrerURL.Query().Get("tab")
// 				if tab == "" {
// 					tab = "OVER_METRICS"
// 				}
// 			}
// 		} else {
// 			client = "api"
// 		}

// 		kvs := map[string]string{
// 			"path":        path,
// 			"dashboardID": dashboardID,
// 			"alertID":     alertID,
// 			"source":      page,
// 			"client":      client,
// 			"viewName":    viewName,
// 			"servicesTab": tab,
// 		}

// 		r = r.WithContext(context.WithValue(r.Context(), common.LogCommentKey, kvs))
// 		next.ServeHTTP(w, r)
// 	})
// }

// func extractQueryRangeV3Data(path string, r *http.Request) (map[string]interface{}, bool) {
// 	pathToExtractBodyFrom := "/api/v3/query_range"

// 	data := map[string]interface{}{}
// 	var postData *v3.QueryRangeParamsV3

// 	if path == pathToExtractBodyFrom && (r.Method == "POST") {
// 		if r.Body != nil {
// 			bodyBytes, err := io.ReadAll(r.Body)
// 			if err != nil {
// 				return nil, false
// 			}
// 			r.Body.Close() //  must close
// 			r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
// 			json.Unmarshal(bodyBytes, &postData)

// 		} else {
// 			return nil, false
// 		}

// 	} else {
// 		return nil, false
// 	}

// 	signozMetricsUsed := false
// 	signozLogsUsed := false
// 	signozTracesUsed := false
// 	if postData != nil {

// 		if postData.CompositeQuery != nil {
// 			data["queryType"] = postData.CompositeQuery.QueryType
// 			data["panelType"] = postData.CompositeQuery.PanelType

// 			signozLogsUsed, signozMetricsUsed, signozTracesUsed = telemetry.GetInstance().CheckSigNozSignals(postData)
// 		}
// 	}

// 	if signozMetricsUsed || signozLogsUsed || signozTracesUsed {
// 		if signozMetricsUsed {
// 			telemetry.GetInstance().AddActiveMetricsUser()
// 		}
// 		if signozLogsUsed {
// 			telemetry.GetInstance().AddActiveLogsUser()
// 		}
// 		if signozTracesUsed {
// 			telemetry.GetInstance().AddActiveTracesUser()
// 		}
// 		data["metricsUsed"] = signozMetricsUsed
// 		data["logsUsed"] = signozLogsUsed
// 		data["tracesUsed"] = signozTracesUsed
// 		userEmail, err := auth.GetEmailFromJwt(r.Context())
// 		if err == nil {
// 			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_QUERY_RANGE_API, data, userEmail, true, false)
// 		}
// 	}
// 	return data, true
// }

// func getActiveLogs(path string, r *http.Request) {
// 	// if path == "/api/v1/dashboards/{uuid}" {
// 	// 	telemetry.GetInstance().AddActiveMetricsUser()
// 	// }
// 	if path == "/api/v1/logs" {
// 		hasFilters := len(r.URL.Query().Get("q"))
// 		if hasFilters > 0 {
// 			telemetry.GetInstance().AddActiveLogsUser()
// 		}

// 	}

// }

// func analyticsMiddleware(next http.Handler) http.Handler {
// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		ctx := auth.AttachJwtToContext(r.Context(), r)
// 		r = r.WithContext(ctx)
// 		route := mux.CurrentRoute(r)
// 		path, _ := route.GetPathTemplate()

// 		queryRangeV3data, metadataExists := extractQueryRangeV3Data(path, r)
// 		getActiveLogs(path, r)

// 		lrw := httprouter.NewWriter(w)
// 		next.ServeHTTP(lrw, r)

// 		data := map[string]interface{}{"path": path, "statusCode": lrw.Status()}
// 		if metadataExists {
// 			for key, value := range queryRangeV3data {
// 				data[key] = value
// 			}
// 		}

// 		// if telemetry.GetInstance().IsSampled() {
// 		if _, ok := telemetry.EnabledPaths()[path]; ok {
// 			userEmail, err := auth.GetEmailFromJwt(r.Context())
// 			if err == nil {
// 				telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_PATH, data, userEmail, true, false)
// 			}
// 		}
// 		// }

// 	})
// }

// func getRouteContextTimeout(overrideTimeout string) time.Duration {
// 	var timeout time.Duration
// 	var err error
// 	if overrideTimeout != "" {
// 		timeout, err = time.ParseDuration(overrideTimeout + "s")
// 		if err != nil {
// 			timeout = constants.ContextTimeout
// 		}
// 		if timeout > constants.ContextTimeoutMaxAllowed {
// 			timeout = constants.ContextTimeoutMaxAllowed
// 		}
// 		return timeout
// 	}
// 	return constants.ContextTimeout
// }

// func setTimeoutMiddleware(next http.Handler) http.Handler {
// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		ctx := r.Context()
// 		var cancel context.CancelFunc
// 		// check if route is not excluded
// 		url := r.URL.Path
// 		if _, ok := constants.TimeoutExcludedRoutes[url]; !ok {
// 			ctx, cancel = context.WithTimeout(r.Context(), getRouteContextTimeout(r.Header.Get("timeout")))
// 			defer cancel()
// 		}

// 		r = r.WithContext(ctx)
// 		next.ServeHTTP(w, r)
// 	})
// }
