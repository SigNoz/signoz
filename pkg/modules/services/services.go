package services

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/types/servicetypes"
)

// Handler exposes HTTP handler for services_qbv5
type Handler interface {
	Get(http.ResponseWriter, *http.Request)
}

// Module represents the services QBv5 module interface
type Module interface {
	Get(ctx context.Context, orgID string, req *servicetypes.Request) ([]*servicetypes.ResponseItem, error)
	FetchTopLevelOperations(ctx context.Context, start time.Time, services []string) (map[string][]string, error)
}
