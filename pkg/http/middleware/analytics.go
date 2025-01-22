package middleware

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"regexp"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/query-service/auth"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.uber.org/zap"
)

type AnalyticsMiddleware struct {
}

func NewAnalyticsMiddleware() *AnalyticsMiddleware {
	return &AnalyticsMiddleware{}
}

func (a *AnalyticsMiddleware) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := auth.AttachJwtToContext(r.Context(), r)
		r = r.WithContext(ctx)
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()

		queryRangeData, metadataExists := extractQueryRangeData(path, r)
		getActiveLogs(path, r)

		lrw := NewAnalyticsResponseWriter(w)
		next.ServeHTTP(lrw, r)

		data := map[string]interface{}{"path": path, "statusCode": lrw.statusCode}
		if metadataExists {
			for key, value := range queryRangeData {
				data[key] = value
			}
		}

		if _, ok := telemetry.EnabledPaths()[path]; ok {
			userEmail, err := auth.GetEmailFromJwt(r.Context())
			if err == nil {
				telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_PATH, data, userEmail, true, false)
			}
		}

	})

}

type analyticsResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func NewAnalyticsResponseWriter(w http.ResponseWriter) *analyticsResponseWriter {
	return &analyticsResponseWriter{w, http.StatusOK}
}

func (lrw *analyticsResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func (lrw *analyticsResponseWriter) Flush() {
	lrw.ResponseWriter.(http.Flusher).Flush()
}

func (lrw *analyticsResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := lrw.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("hijack not supported")
	}
	return h.Hijack()
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

	queryInfoResult := telemetry.GetInstance().CheckQueryInfo(postData)

	if (queryInfoResult.MetricsUsed || queryInfoResult.LogsUsed || queryInfoResult.TracesUsed) && (queryInfoResult.FilterApplied) {
		if queryInfoResult.MetricsUsed {
			telemetry.GetInstance().AddActiveMetricsUser()
		}
		if queryInfoResult.LogsUsed {
			telemetry.GetInstance().AddActiveLogsUser()
		}
		if queryInfoResult.TracesUsed {
			telemetry.GetInstance().AddActiveTracesUser()
		}
		data["metricsUsed"] = queryInfoResult.MetricsUsed
		data["logsUsed"] = queryInfoResult.LogsUsed
		data["tracesUsed"] = queryInfoResult.TracesUsed
		data["filterApplied"] = queryInfoResult.FilterApplied
		data["groupByApplied"] = queryInfoResult.GroupByApplied
		data["aggregateOperator"] = queryInfoResult.AggregateOperator
		data["aggregateAttributeKey"] = queryInfoResult.AggregateAttributeKey
		data["numberOfQueries"] = queryInfoResult.NumberOfQueries
		data["queryType"] = queryInfoResult.QueryType
		data["panelType"] = queryInfoResult.PanelType

		userEmail, err := auth.GetEmailFromJwt(r.Context())
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
