package serviceaccounttypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// Service Account
	Create(context.Context, *StorableServiceAccount) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableServiceAccount, error)
	List(context.Context, valuer.UUID) ([]*StorableServiceAccount, error)
	Update(context.Context, valuer.UUID, *StorableServiceAccount) error
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	// Service Account Role
	CreateServiceAccountRoles(context.Context, []*StorableServiceAccountRole) error
	GetServiceAccountRoles(context.Context, valuer.UUID) ([]*StorableServiceAccountRole, error)
	ListServiceAccountRolesByOrgID(context.Context, valuer.UUID) ([]*StorableServiceAccountRole, error)
	DeleteServiceAccountRoles(context.Context, valuer.UUID) error

	// Service Account Factor API Key
	RunInTx(context.Context, func(context.Context) error) error
}
