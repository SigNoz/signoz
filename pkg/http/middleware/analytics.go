package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"regexp"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

type Analytics struct{}

func NewAnalytics() *Analytics {
	return &Analytics{}
}

func (a *Analytics) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()

		_, _ = a.extractQueryRangeData(path, r)
		a.getActiveLogs(path, r)

		badResponseBuffer := new(bytes.Buffer)
		writer := newBadResponseLoggingWriter(w, badResponseBuffer)
		next.ServeHTTP(writer, r)
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
			_ = json.Unmarshal(bodyBytes, &postData)

		} else {
			return nil, false
		}

	} else {
		return nil, false
	}

	referrer := r.Header.Get("Referer")

	dashboardMatched, _ := regexp.MatchString(`/dashboard/[a-zA-Z0-9\-]+/(new|edit)(?:\?.*)?$`, referrer)
	alertMatched, _ := regexp.MatchString(`/alerts/(new|edit)(?:\?.*)?$`, referrer)
	logsExplorerMatched, _ := regexp.MatchString(`/logs/logs-explorer(?:\?.*)?$`, referrer)
	traceExplorerMatched, _ := regexp.MatchString(`/traces-explorer(?:\?.*)?$`, referrer)

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

		claims, err := authtypes.ClaimsFromContext(r.Context())
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
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_QUERY_RANGE_API, data, claims.Email, true, false)
		}
	}
	return data, true
}
