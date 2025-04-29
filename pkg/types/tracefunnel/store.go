package tracefunnels

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type TraceFunnelStore interface {
	Create(context.Context, *Funnel) error
	Get(context.Context, valuer.UUID) (*Funnel, error)
	List(context.Context) ([]*Funnel, error)
	Update(context.Context, *Funnel) error
	Delete(context.Context, valuer.UUID) error
}
