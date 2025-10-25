package services

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Handler exposes HTTP handler for services_qbv5
type Handler interface {
	Get(http.ResponseWriter, *http.Request)
	GetTopOperations(http.ResponseWriter, *http.Request)
	GetEntryPointOperations(http.ResponseWriter, *http.Request)
}

// Module represents the services QBv5 module interface
type Module interface {
	Get(ctx context.Context, orgID valuer.UUID, req *servicetypesv1.Request) ([]*servicetypesv1.ResponseItem, error)
	FetchTopLevelOperations(ctx context.Context, start time.Time, services []string) (map[string][]string, error)
	GetTopOperations(ctx context.Context, orgID valuer.UUID, req *servicetypesv1.OperationsRequest) ([]servicetypesv1.OperationItem, error)
	GetEntryPointOperations(ctx context.Context, orgID valuer.UUID, req *servicetypesv1.OperationsRequest) ([]servicetypesv1.OperationItem, error)
}
