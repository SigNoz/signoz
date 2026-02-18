package implidentity

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/identity"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/identitytypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store *store
}

func NewModule(sqlstore sqlstore.SQLStore) identity.Module {
	return &module{
		store: newStore(sqlstore),
	}
}

func (m *module) CreateIdentityWithRoles(ctx context.Context, id valuer.UUID, orgID valuer.UUID, roles []types.Role) error {
	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		// Create identity
		ident := identitytypes.NewStorableIdentity(id, orgID)
		if err := m.store.CreateIdentity(ctx, ident); err != nil {
			return err
		}

		// Create identity_role mappings for each role
		for _, role := range roles {
			roleName := roletypes.MustGetSigNozManagedRoleFromExistingRole(role)
			identityRole := identitytypes.NewStorableIdentityRole(id, roleName)
			if err := m.store.CreateIdentityRole(ctx, identityRole); err != nil {
				return err
			}
		}

		return nil
	})
}

func (m *module) AddRole(ctx context.Context, identityID valuer.UUID, orgID valuer.UUID, role types.Role) error {
	roleName := roletypes.MustGetSigNozManagedRoleFromExistingRole(role)
	identityRole := identitytypes.NewStorableIdentityRole(identityID, roleName)
	return m.store.CreateIdentityRole(ctx, identityRole)
}

func (m *module) RemoveRole(ctx context.Context, identityID valuer.UUID, orgID valuer.UUID, role types.Role) error {
	roleName := roletypes.MustGetSigNozManagedRoleFromExistingRole(role)
	return m.store.DeleteIdentityRole(ctx, identityID, roleName)
}

func (m *module) GetRoles(ctx context.Context, identityID valuer.UUID) ([]types.Role, error) {
	roleNames, err := m.store.GetRolesByIdentityID(ctx, identityID)
	if err != nil {
		return nil, err
	}

	roles := make([]types.Role, 0, len(roleNames))
	for _, roleName := range roleNames {
		roles = append(roles, roletypes.GetRoleFromManagedRoleName(roleName))
	}

	return roles, nil
}

func (m *module) GetRolesForIdentities(ctx context.Context, identityIDs []valuer.UUID) (map[valuer.UUID][]types.Role, error) {
	roleNamesMap, err := m.store.GetRolesForIdentityIDs(ctx, identityIDs)
	if err != nil {
		return nil, err
	}

	result := make(map[valuer.UUID][]types.Role)
	for _, id := range identityIDs {
		if roleNames, ok := roleNamesMap[id.StringValue()]; ok {
			roles := make([]types.Role, 0, len(roleNames))
			for _, roleName := range roleNames {
				roles = append(roles, roletypes.GetRoleFromManagedRoleName(roleName))
			}
			result[id] = roles
		} else {
			result[id] = []types.Role{}
		}
	}

	return result, nil
}

func (m *module) DeleteIdentity(ctx context.Context, identityID valuer.UUID) error {
	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		// Delete identity_role first (FK constraint)
		if err := m.store.DeleteIdentityRoles(ctx, identityID); err != nil {
			return err
		}

		// Delete identity
		if err := m.store.DeleteIdentity(ctx, identityID); err != nil {
			return err
		}

		return nil
	})
}

func (m *module) CountByRoleAndOrgID(ctx context.Context, role types.Role, orgID valuer.UUID) (int64, error) {
	roleName := roletypes.MustGetSigNozManagedRoleFromExistingRole(role)
	return m.store.CountByRoleNameAndOrgID(ctx, roleName, orgID)
}
