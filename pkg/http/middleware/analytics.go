package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"regexp"

	"github.com/gorilla/mux"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

type Analytics struct {
	logger *zap.Logger
}

func NewAnalytics(logger *zap.Logger) *Analytics {
	if logger == nil {
		panic("cannot build analytics middleware, logger is empty")
	}

	return &Analytics{logger: logger}
}

func (a *Analytics) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()

		queryRangeData, metadataExists := a.extractQueryRangeData(path, r)
		a.getActiveLogs(path, r)

		badResponseBuffer := new(bytes.Buffer)
		writer := newBadResponseLoggingWriter(w, badResponseBuffer)
		next.ServeHTTP(writer, r)

		data := map[string]interface{}{"path": path, "statusCode": writer.StatusCode()}
		if metadataExists {
			for key, value := range queryRangeData {
				data[key] = value
			}
		}

		if _, ok := telemetry.EnabledPaths()[path]; ok {
			claims, ok := authtypes.ClaimsFromContext(r.Context())
			if ok {
				telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_PATH, data, claims.Email, true, false)
			}
		}

	})

}

func (a *Analytics) getActiveLogs(path string, r *http.Request) {
	// this is for the old logs explorer api.
	if path == "/api/v1/logs" {
		hasFilters := len(r.URL.Query().Get("q"))
		if hasFilters > 0 {
			telemetry.GetInstance().AddActiveLogsUser()
		}

	}
}

func (a *Analytics) extractQueryRangeData(path string, r *http.Request) (map[string]interface{}, bool) {
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
		a.logger.Error("error while matching the referrer", zap.Error(err))
	}
	alertMatched, err := regexp.MatchString(`/alerts/(new|edit)(?:\?.*)?$`, referrer)
	if err != nil {
		a.logger.Error("error while matching the alert: ", zap.Error(err))
	}
	logsExplorerMatched, err := regexp.MatchString(`/logs/logs-explorer(?:\?.*)?$`, referrer)
	if err != nil {
		a.logger.Error("error while matching the logs explorer: ", zap.Error(err))
	}
	traceExplorerMatched, err := regexp.MatchString(`/traces-explorer(?:\?.*)?$`, referrer)
	if err != nil {
		a.logger.Error("error while matching the trace explorer: ", zap.Error(err))
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

		claims, ok := authtypes.ClaimsFromContext(r.Context())
		if ok {
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
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_QUERY_RANGE_API, data, claims.Email, true, false)
		}
	}
	return data, true
}
