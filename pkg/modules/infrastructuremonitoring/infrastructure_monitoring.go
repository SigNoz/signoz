package infrastructuremonitoring

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/infrastructuremonitoringtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Handler exposes HTTP handlers for the infrastructuremonitoring module.
type Handler interface {
	HealthCheck(http.ResponseWriter, *http.Request)
	GetPodsList(http.ResponseWriter, *http.Request)
}

// Module represents the infrastructuremonitoring module interface.
type Module interface {
	HealthCheck(ctx context.Context) (*infrastructuremonitoringtypes.HealthCheckResponse, error)
	GetPodsList(ctx context.Context, orgID valuer.UUID, request *infrastructuremonitoringtypes.PodsListRequest) (*infrastructuremonitoringtypes.PodsListResponse, error)
}
