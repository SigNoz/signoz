package identity

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// GetRoles gets all roles for an identity
	GetRoles(ctx context.Context, identityID valuer.UUID) ([]types.Role, error)

	// GetRolesForIdentities gets roles for multiple identities (batch)
	GetRolesForIdentities(ctx context.Context, identityIDs []valuer.UUID) (map[valuer.UUID][]types.Role, error)

	// CountByRoleAndOrgID counts identities with a specific role in an org
	CountByRoleAndOrgID(ctx context.Context, role types.Role, orgID valuer.UUID) (int64, error)

	// CreateIdentityWithRoles creates an identity and assigns roles to it
	CreateIdentityWithRoles(ctx context.Context, id valuer.UUID, orgID valuer.UUID, roles []types.Role) error

	// AddRole adds a role to an identity
	AddRole(ctx context.Context, identityID valuer.UUID, orgID valuer.UUID, role types.Role) error

	// RemoveRole removes a role from an identity
	RemoveRole(ctx context.Context, identityID valuer.UUID, orgID valuer.UUID, role types.Role) error

	// DeleteIdentity deletes an identity and its associated roles
	DeleteIdentity(ctx context.Context, identityID valuer.UUID) error
}
