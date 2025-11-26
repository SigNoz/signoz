package metricsmodule

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Handler exposes HTTP handlers for the metrics module.
type Handler interface {
	GetStats(http.ResponseWriter, *http.Request)
	GetTreemap(http.ResponseWriter, *http.Request)
	GetMetricAttributes(http.ResponseWriter, *http.Request)
	GetMetricMetadata(http.ResponseWriter, *http.Request)
	UpdateMetricMetadata(http.ResponseWriter, *http.Request)
}

// Module represents the metrics module interface.
type Module interface {
	GetStats(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.StatsRequest) (*metricsmoduletypes.StatsResponse, error)
	GetTreemap(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.TreemapRequest) (*metricsmoduletypes.TreemapResponse, error)
	GetMetricMetadataMulti(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]*metricsmoduletypes.MetricMetadata, error)
	UpdateMetricMetadata(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.UpdateMetricMetadataRequest) error
	GetMetricAttributes(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.MetricAttributesRequest) (*metricsmoduletypes.MetricAttributesResponse, error)
}
