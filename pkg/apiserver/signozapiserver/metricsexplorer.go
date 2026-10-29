package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addMetricsExplorerRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/metrics", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.ListMetrics, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListMetrics",
			Tags:                []string{"metrics"},
			Summary:             "List metric names",
			Description:         "This endpoint returns a list of distinct metric names within the specified time range",
			Request:             nil,
			RequestQuery:        new(metricsexplorertypes.ListMetricsParams),
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.ListMetricsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricsField.Scope(coretypes.VerbList)}),
		}, handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricsField,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/stats", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.GetStats, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricsStats",
			Tags:                []string{"metrics"},
			Summary:             "Get metrics statistics",
			Description:         "This endpoint provides list of metrics with their number of samples and timeseries for the given time range",
			Request:             new(metricsexplorertypes.StatsRequest),
			RequestContentType:  "application/json",
			Response:            new(metricsexplorertypes.StatsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceTelemetryResourceMetrics.Scope(coretypes.VerbRead)}),
		}, handler.WithResourceDefs(handler.TelemetryResourceDef{
			Verb:      coretypes.VerbRead,
			Category:  coretypes.ActionCategoryDataAccess,
			Selector:  querybuilder.TelemetrySelector,
			Resources: querybuilder.BuilderQueryWithFilterExpressionResources(coretypes.ResourceTelemetryResourceMetrics, "filter.expression"),
		}))).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/treemap", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.GetTreemap, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricsTreemap",
			Tags:                []string{"metrics"},
			Summary:             "Get metrics treemap",
			Description:         "This endpoint returns a treemap visualization showing the proportional distribution of metrics by sample count or time series count",
			Request:             new(metricsexplorertypes.TreemapRequest),
			RequestContentType:  "application/json",
			RequestExamples:     treemapRequestExamples(),
			Response:            new(metricsexplorertypes.TreemapResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceTelemetryResourceMetrics.Scope(coretypes.VerbRead)}),
		}, handler.WithResourceDefs(handler.TelemetryResourceDef{
			Verb:      coretypes.VerbRead,
			Category:  coretypes.ActionCategoryDataAccess,
			Selector:  querybuilder.TelemetrySelector,
			Resources: querybuilder.BuilderQueryWithFilterExpressionResources(coretypes.ResourceTelemetryResourceMetrics, "filter.expression"),
		}))).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/attributes", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.GetMetricAttributes, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricAttributes",
			Tags:                []string{"metrics"},
			Summary:             "Get metric attributes",
			Description:         "This endpoint returns attribute keys and their unique values for a specified metric",
			Request:             nil,
			RequestQuery:        new(metricsexplorertypes.MetricAttributesRequest),
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricAttributesResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusNotFound, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricsField.Scope(coretypes.VerbRead)}),
		}, handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricsField,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/metadata", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.GetMetricMetadata, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricMetadata",
			Tags:                []string{"metrics"},
			Summary:             "Get metric metadata",
			Description:         "This endpoint returns metadata information like metric description, unit, type, temporality, monotonicity for a specified metric",
			Request:             nil,
			RequestQuery:        new(metricsexplorertypes.MetricNameQuery),
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricMetadata),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusNotFound, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricsField.Scope(coretypes.VerbRead)}),
		}, handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricsField,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/metadata", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.UpdateMetricMetadata, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateMetricMetadata",
			Tags:                []string{"metrics"},
			Summary:             "Update metric metadata",
			Description:         "This endpoint helps to update metadata information like metric description, unit, type, temporality, monotonicity for a specified metric",
			Request:             new(metricsexplorertypes.UpdateMetricMetadataRequest),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricsField.Scope(coretypes.VerbUpdate)}),
		}, handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricsField,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}))).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/highlights", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.GetMetricHighlights, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricHighlights",
			Tags:                []string{"metrics"},
			Summary:             "Get metric highlights",
			Description:         "This endpoint returns highlights like number of datapoints, totaltimeseries, active time series, last received time for a specified metric",
			Request:             nil,
			RequestQuery:        new(metricsexplorertypes.MetricNameQuery),
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricHighlightsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusNotFound, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceTelemetryResourceMetrics.Scope(coretypes.VerbRead)}),
		}, handler.WithResourceDefs(handler.TelemetryResourceDef{
			Verb:      coretypes.VerbRead,
			Category:  coretypes.ActionCategoryDataAccess,
			Selector:  querybuilder.TelemetrySelector,
			Resources: querybuilder.BuilderQueryWildcardResources(coretypes.ResourceTelemetryResourceMetrics),
		}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/alerts", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.GetMetricAlerts, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricAlerts",
			Tags:                []string{"metrics"},
			Summary:             "Get metric alerts",
			Description:         "This endpoint returns associated alerts for a specified metric",
			Request:             nil,
			RequestQuery:        new(metricsexplorertypes.MetricNameQuery),
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricAlertsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusNotFound, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbList)}),
		}, handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v3/metrics/dashboards", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.GetMetricDashboardsV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricDashboardsV2",
			Tags:                []string{"metrics"},
			Summary:             "Get metric dashboards (v2)",
			Description:         "This endpoint returns associated v2 dashboards for a specified metric",
			Request:             nil,
			RequestQuery:        new(metricsexplorertypes.MetricNameQuery),
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricDashboardPanelsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusNotFound, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceDashboard.Scope(coretypes.VerbList)}),
		}, handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceDashboard,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/inspect", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.InspectMetrics, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "InspectMetrics",
			Tags:                []string{"metrics"},
			Summary:             "Inspect raw metric data points",
			Description:         "Returns raw time series data points for a metric within a time range (max 30 minutes). Each series includes labels and timestamp/value pairs.",
			Request:             new(metricsexplorertypes.InspectMetricsRequest),
			RequestContentType:  "application/json",
			Response:            new(metricsexplorertypes.InspectMetricsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceTelemetryResourceMetrics.Scope(coretypes.VerbRead)}),
		}, handler.WithResourceDefs(handler.TelemetryResourceDef{
			Verb:      coretypes.VerbRead,
			Category:  coretypes.ActionCategoryDataAccess,
			Selector:  querybuilder.TelemetrySelector,
			Resources: querybuilder.BuilderQueryWithFilterExpressionResources(coretypes.ResourceTelemetryResourceMetrics, "filter.expression"),
		}))).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/onboarding", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricsExplorerHandler.GetOnboardingStatus, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricsOnboardingStatus",
			Tags:                []string{"metrics"},
			Summary:             "Check if non-SigNoz metrics have been received",
			Description:         "Lightweight endpoint that checks if any non-SigNoz metrics have been ingested, used for onboarding status detection",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricsOnboardingResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceTelemetryResourceMetrics.Scope(coretypes.VerbRead)}),
		}, handler.WithResourceDefs(handler.TelemetryResourceDef{
			Verb:      coretypes.VerbRead,
			Category:  coretypes.ActionCategoryDataAccess,
			Selector:  querybuilder.TelemetrySelector,
			Resources: querybuilder.BuilderQueryWildcardResources(coretypes.ResourceTelemetryResourceMetrics),
		}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}
