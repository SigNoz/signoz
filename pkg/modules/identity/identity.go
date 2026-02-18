package identity

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// GetRoles gets all roles for an identity
	GetRoles(context.Context, valuer.UUID, valuer.UUID) ([]roletypes.Role, error)

	// CreateIdentityWithRoles creates an identity and assigns roles to it
	CreateIdentityWithRoles(context.Context, valuer.UUID, valuer.UUID, []string) error

	// CountByRoleAndOrgID counts identities with a specific role in an org
	CountByRoleAndOrgID(context.Context, string, valuer.UUID) (int64, error)

	// GrantRole grants a role to an identity
	GrantRole(context.Context, valuer.UUID, valuer.UUID, string) error

	// RevokeRole revokes a role from an identity
	RevokeRole(context.Context, valuer.UUID, valuer.UUID, string) error

	// DeleteIdentity deletes an identity and its associated roles
	DeleteIdentity(context.Context, valuer.UUID, valuer.UUID) error
}
