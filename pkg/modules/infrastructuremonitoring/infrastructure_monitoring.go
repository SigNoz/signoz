package infrastructuremonitoring

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/infrastructuremonitoringtypes"
)

// Handler exposes HTTP handlers for the infrastructuremonitoring module.
type Handler interface {
	HealthCheck(http.ResponseWriter, *http.Request)
}

// Module represents the infrastructuremonitoring module interface.
type Module interface {
	HealthCheck(ctx context.Context) (*infrastructuremonitoringtypes.HealthCheckResponse, error)
}
