package identitytypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	CreateIdentity(context.Context, *StorableIdentity) error
	CreateIdentityRole(context.Context, *StorableIdentityRole) error
	DeleteIdentity(context.Context, valuer.UUID) error
	DeleteIdentityRole(ctx context.Context, identityID valuer.UUID, roleName string) error
	DeleteIdentityRoles(context.Context, valuer.UUID) error
	GetRolesByIdentityID(context.Context, valuer.UUID) ([]*roletypes.StorableRole, error)
	CountByRoleNameAndOrgID(ctx context.Context, roleName string, orgID valuer.UUID) (int64, error)
	RunInTx(context.Context, func(ctx context.Context) error) error
}
