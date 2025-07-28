package querier

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"runtime/debug"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type API struct {
	set       factory.ProviderSettings
	analytics analytics.Analytics
	querier   Querier
}

func NewAPI(set factory.ProviderSettings, querier Querier, analytics analytics.Analytics) *API {
	return &API{set: set, querier: querier, analytics: analytics}
}

func (a *API) QueryRange(rw http.ResponseWriter, req *http.Request) {

	ctx := req.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var queryRangeRequest qbtypes.QueryRangeRequest
	if err := json.NewDecoder(req.Body).Decode(&queryRangeRequest); err != nil {
		render.Error(rw, err)
		return
	}

	defer func() {
		if r := recover(); r != nil {
			stackTrace := string(debug.Stack())

			queryJSON, _ := json.Marshal(queryRangeRequest)

			a.set.Logger.ErrorContext(ctx, "panic in QueryRange",
				"error", r,
				"user", claims.UserID,
				"payload", string(queryJSON),
				"stacktrace", stackTrace,
			)

			render.Error(rw, errors.NewInternalf(
				errors.CodeInternal,
				"Something went wrong on our end. It's not you, it's us. Our team is notified about it. Reach out to support if issue persists.",
			))
		}
	}()

	// Validate the query request
	if err := queryRangeRequest.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	queryRangeResponse, err := a.querier.QueryRange(ctx, orgID, &queryRangeRequest)
	if err != nil {
		render.Error(rw, err)
		return
	}

	a.logEvent(req.Context(), req.Header.Get("Referer"), queryRangeResponse.QBEvent)

	render.Success(rw, http.StatusOK, queryRangeResponse)
}

func (a *API) logEvent(ctx context.Context, referrer string, event *qbtypes.QBEvent) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return
	}

	if !(event.LogsUsed || event.MetricsUsed || event.TracesUsed) {
		return
	}

	properties := map[string]any{
		"version":           event.Version,
		"logs_used":         event.LogsUsed,
		"traces_used":       event.TracesUsed,
		"metrics_used":      event.MetricsUsed,
		"filter_applied":    event.FilterApplied,
		"group_by_applied":  event.GroupByApplied,
		"query_type":        event.QueryType,
		"panel_type":        event.PanelType,
		"number_of_queries": event.NumberOfQueries,
	}

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

	if !event.HasData {
		a.analytics.TrackUser(ctx, claims.OrgID, claims.UserID, "Telemetry Query Returned Empty", properties)
		return
	}
	a.analytics.TrackUser(ctx, claims.OrgID, claims.UserID, "Telemetry Query Returned Results", properties)
}
