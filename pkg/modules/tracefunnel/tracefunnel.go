package tracefunnel

import (
	"context"
	"github.com/SigNoz/signoz/pkg/valuer"
	"net/http"

	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
)

// Module defines the interface for trace funnel operations
type Module interface {
	Create(ctx context.Context, timestamp int64, name string, userID valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error)

	Get(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error)

	Update(ctx context.Context, funnel *traceFunnels.StorableFunnel, userID valuer.UUID) error

	List(ctx context.Context, orgID valuer.UUID) ([]*traceFunnels.StorableFunnel, error)

	Delete(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) error

	GetFunnelMetadata(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) (int64, int64, string, error)
}

type Handler interface {
	New(http.ResponseWriter, *http.Request)

	UpdateSteps(http.ResponseWriter, *http.Request)

	UpdateFunnel(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)
}
