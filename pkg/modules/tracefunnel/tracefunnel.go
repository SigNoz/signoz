package tracefunnel

import (
	"context"
	"net/http"

	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
)

// Module defines the interface for trace funnel operations
type Module interface {
	Create(ctx context.Context, timestamp int64, name string, userID string, orgID string) (*traceFunnels.Funnel, error)

	Get(ctx context.Context, funnelID string) (*traceFunnels.Funnel, error)

	Update(ctx context.Context, funnel *traceFunnels.Funnel, userID string) error

	List(ctx context.Context, orgID string) ([]*traceFunnels.Funnel, error)

	Delete(ctx context.Context, funnelID string) error

	Save(ctx context.Context, funnel *traceFunnels.Funnel, userID string, orgID string) error

	GetFunnelMetadata(ctx context.Context, funnelID string) (int64, int64, string, error)
}

type Handler interface {
	New(http.ResponseWriter, *http.Request)

	UpdateSteps(http.ResponseWriter, *http.Request)

	UpdateFunnel(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)

	Save(http.ResponseWriter, *http.Request)
}
