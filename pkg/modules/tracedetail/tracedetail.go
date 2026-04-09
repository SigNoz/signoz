package tracedetail

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/tracedetailtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Handler exposes HTTP handlers for trace detail APIs.
type Handler interface {
	GetWaterfall(http.ResponseWriter, *http.Request)
}

// Module defines the business logic for trace detail operations.
type Module interface {
	GetWaterfall(ctx context.Context, orgID valuer.UUID, traceID string, req *tracedetailtypes.WaterfallRequest) (*tracedetailtypes.WaterfallResponse, error)
}
