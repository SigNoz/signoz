package metricsexplorer

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Handler exposes HTTP handlers for the metrics module.
type Handler interface {
	GetStats(http.ResponseWriter, *http.Request)
	GetTreemap(http.ResponseWriter, *http.Request)
	GetMetricMetadata(http.ResponseWriter, *http.Request)
	GetMetricAttributes(http.ResponseWriter, *http.Request)
	UpdateMetricMetadata(http.ResponseWriter, *http.Request)
	GetMetricAlerts(http.ResponseWriter, *http.Request)
	GetMetricDashboards(http.ResponseWriter, *http.Request)
	GetMetricHighlights(http.ResponseWriter, *http.Request)
}

// Module represents the metrics module interface.
type Module interface {
	GetStats(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.StatsRequest) (*metricsexplorertypes.StatsResponse, error)
	GetTreemap(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.TreemapRequest) (*metricsexplorertypes.TreemapResponse, error)
	GetMetricMetadataMulti(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsexplorertypes.MetricMetadata, error)
	UpdateMetricMetadata(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.UpdateMetricMetadataRequest) error
	GetMetricAlerts(ctx context.Context, orgID valuer.UUID, metricName string) (*metricsexplorertypes.MetricAlertsResponse, error)
	GetMetricDashboards(ctx context.Context, orgID valuer.UUID, metricName string) (*metricsexplorertypes.MetricDashboardsResponse, error)
	GetMetricHighlights(ctx context.Context, orgID valuer.UUID, metricName string) (*metricsexplorertypes.MetricHighlightsResponse, error)
	GetMetricAttributes(ctx context.Context, orgID valuer.UUID, req *metricsexplorertypes.MetricAttributesRequest) (*metricsexplorertypes.MetricAttributesResponse, error)
}
