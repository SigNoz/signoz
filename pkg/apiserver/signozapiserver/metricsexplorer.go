package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addMetricsExplorerV2Routes(router *mux.Router) error {
	if err := router.Handle("/api/v2/metrics/stats", handler.New(
		provider.authZ.ViewAccess(provider.metricsExplorerHandler.GetStats),
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
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/treemap", handler.New(
		provider.authZ.ViewAccess(provider.metricsExplorerHandler.GetTreemap),
		handler.OpenAPIDef{
			ID:                  "GetMetricsTreemap",
			Tags:                []string{"metrics"},
			Summary:             "Get metrics treemap",
			Description:         "This endpoint returns a treemap visualization showing the proportional distribution of metrics by sample count or time series count",
			Request:             new(metricsexplorertypes.TreemapRequest),
			RequestContentType:  "application/json",
			Response:            new(metricsexplorertypes.TreemapResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/attributes", handler.New(
		provider.authZ.ViewAccess(provider.metricsExplorerHandler.GetMetricAttributes),
		handler.OpenAPIDef{
			ID:                  "GetMetricAttributes",
			Tags:                []string{"metrics"},
			Summary:             "Get metric attributes",
			Description:         "This endpoint returns attribute keys and their unique values for a specified metric",
			Request:             new(metricsexplorertypes.MetricAttributesRequest),
			RequestContentType:  "application/json",
			Response:            new(metricsexplorertypes.MetricAttributesResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/metadata", handler.New(
		provider.authZ.ViewAccess(provider.metricsExplorerHandler.GetMetricMetadata),
		handler.OpenAPIDef{
			ID:                  "GetMetricMetadata",
			Tags:                []string{"metrics"},
			Summary:             "Get metric metadata",
			Description:         "This endpoint returns metadata information like metric description, unit, type, temporality, monotonicity for a specified metric",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricMetadata),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusNotFound, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/{metric_name}/metadata", handler.New(
		provider.authZ.EditAccess(provider.metricsExplorerHandler.UpdateMetricMetadata),
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
			SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric/highlights", handler.New(
		provider.authZ.ViewAccess(provider.metricsExplorerHandler.GetMetricHighlights),
		handler.OpenAPIDef{
			ID:                  "GetMetricHighlights",
			Tags:                []string{"metrics"},
			Summary:             "Get metric highlights",
			Description:         "This endpoint returns highlights like number of datapoints, totaltimeseries, active time series, last received time for a specified metric",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricHighlightsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric/alerts", handler.New(
		provider.authZ.ViewAccess(provider.metricsExplorerHandler.GetMetricAlerts),
		handler.OpenAPIDef{
			ID:                  "GetMetricAlerts",
			Tags:                []string{"metrics"},
			Summary:             "Get metric alerts",
			Description:         "This endpoint returns associated alerts for a specified metric",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricAlertsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric/dashboards", handler.New(
		provider.authZ.ViewAccess(provider.metricsExplorerHandler.GetMetricDashboards),
		handler.OpenAPIDef{
			ID:                  "GetMetricDashboards",
			Tags:                []string{"metrics"},
			Summary:             "Get metric dashboards",
			Description:         "This endpoint returns associated dashboards for a specified metric",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(metricsexplorertypes.MetricDashboardsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}
