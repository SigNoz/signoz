package tracefunnel

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type FunnelStore interface {
	Create(context.Context, *Funnel) error
	Get(context.Context, valuer.UUID) (*Funnel, error)
	List(context.Context, valuer.UUID) ([]*Funnel, error)
	Update(context.Context, *Funnel) error
	Delete(context.Context, valuer.UUID) error
}
