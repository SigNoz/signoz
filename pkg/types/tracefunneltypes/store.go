package tracefunneltypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type FunnelStore interface {
	Create(context.Context, *StorableFunnel) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableFunnel, error)
	List(context.Context, valuer.UUID) ([]*StorableFunnel, error)
	Update(context.Context, *StorableFunnel) error
	Delete(context.Context, valuer.UUID, valuer.UUID) error
}
