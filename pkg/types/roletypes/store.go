package roletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	Create(context.Context, *StorableRole) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableRole, error)
	GetByNameAndOrgID(context.Context, string, valuer.UUID) (*StorableRole, error)
	List(context.Context, valuer.UUID) ([]*StorableRole, error)
	Update(context.Context, valuer.UUID, *StorableRole) error
	Delete(context.Context, valuer.UUID, valuer.UUID) error
	RunInTx(context.Context, func(ctx context.Context) error) error
}
