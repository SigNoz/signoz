package implidentity

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/identity"
	"github.com/SigNoz/signoz/pkg/types/identitytypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store identitytypes.Store
}

func NewModule(store identitytypes.Store) identity.Module {
	return &module{
		store: store,
	}
}

func (m *module) CreateIdentityWithRoles(ctx context.Context, id valuer.UUID, orgID valuer.UUID, roleNames []string) error {
	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		// Create identity
		ident := identitytypes.NewStorableIdentity(id, orgID)
		if err := m.store.CreateIdentity(ctx, ident); err != nil {
			return err
		}

		// Create identity_role mappings for each role
		for _, roleName := range roleNames {
			identityRole := identitytypes.NewStorableIdentityRole(id, roleName)
			if err := m.store.CreateIdentityRole(ctx, identityRole); err != nil {
				return err
			}
		}

		return nil
	})
}

func (m *module) GrantRole(ctx context.Context, identityID valuer.UUID, roleName string) error {
	storableIdentityRole := identitytypes.NewStorableIdentityRole(identityID, roleName)
	return m.store.CreateIdentityRole(ctx, storableIdentityRole)
}

func (m *module) RevokeRole(ctx context.Context, identityID valuer.UUID, roleName string) error {
	return m.store.DeleteIdentityRole(ctx, identityID, roleName)
}

func (m *module) GetRoles(ctx context.Context, id valuer.UUID, orgID valuer.UUID) ([]*roletypes.Role, error) {
	storableRoles, err := m.store.GetRolesByIdentityID(ctx, id)
	if err != nil {
		return nil, err
	}

	roles := make([]*roletypes.Role, 0, len(storableRoles))
	for _, storableRole := range storableRoles {
		roles = append(roles, roletypes.NewRoleFromStorableRole(storableRole))
	}

	return roles, nil
}

func (m *module) DeleteIdentity(ctx context.Context, identityID valuer.UUID, _ valuer.UUID) error {
	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := m.store.DeleteIdentityRoles(ctx, identityID); err != nil {
			return err
		}

		if err := m.store.DeleteIdentity(ctx, identityID); err != nil {
			return err
		}

		return nil
	})
}

func (m *module) CountByRoleAndOrgID(ctx context.Context, roleName string, orgID valuer.UUID) (int64, error) {
	return m.store.CountByRoleNameAndOrgID(ctx, roleName, orgID)
}
