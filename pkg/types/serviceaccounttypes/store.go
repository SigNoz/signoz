package serviceaccounttypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// Service Account
	Create(context.Context, *StorableServiceAccount) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableServiceAccount, error)
	GetByID(context.Context, valuer.UUID) (*StorableServiceAccount, error)
	GetByOrgIDAndName(context.Context, valuer.UUID, string) (*StorableServiceAccount, error)
	List(context.Context, valuer.UUID) ([]*StorableServiceAccount, error)
	Update(context.Context, valuer.UUID, *StorableServiceAccount) error
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	// Service Account Role
	CreateServiceAccountRoles(context.Context, []*StorableServiceAccountRole) error
	GetServiceAccountRoles(context.Context, valuer.UUID) ([]*StorableServiceAccountRole, error)
	ListServiceAccountRolesByOrgID(context.Context, valuer.UUID) ([]*StorableServiceAccountRole, error)
	DeleteServiceAccountRoles(context.Context, valuer.UUID) error

	// Service Account Factor API Key
	CreateFactorAPIKey(context.Context, *StorableFactorAPIKey) error
	GetFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) (*StorableFactorAPIKey, error)
	GetFactorAPIKeyByKey(context.Context, string) (*StorableFactorAPIKey, error)
	ListFactorAPIKey(context.Context, valuer.UUID) ([]*StorableFactorAPIKey, error)
	ListFactorAPIKeyByOrgID(context.Context, valuer.UUID) ([]*StorableFactorAPIKey, error)
	UpdateFactorAPIKey(context.Context, valuer.UUID, *StorableFactorAPIKey) error
	UpdateLastObservedAtByKey(context.Context, []map[string]any) error
	RevokeFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) error
	RevokeAllFactorAPIKeys(context.Context, valuer.UUID) error

	RunInTx(context.Context, func(context.Context) error) error
}
