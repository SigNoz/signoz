package serviceaccounttypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	Create(context.Context, *StorableServiceAccount) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableServiceAccount, error)
	List(context.Context, valuer.UUID) ([]*StorableServiceAccount, error)
	Update(context.Context, valuer.UUID, *StorableServiceAccount) error
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	CreateServiceAccountRoles(context.Context, []*StorableServiceAccountRole) error
	GetServiceAccountRoles(context.Context, valuer.UUID) ([]*StorableServiceAccountRole, error)

	RunInTx(context.Context, func(context.Context) error) error
}
