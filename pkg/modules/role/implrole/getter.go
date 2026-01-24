package implrole

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store roletypes.Store
}

func NewGetter(store roletypes.Store) role.Getter {
	return &getter{store: store}
}

func (getter *getter) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*roletypes.Role, error) {
	storableRole, err := getter.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return roletypes.NewRoleFromStorableRole(storableRole), nil
}

func (getter *getter) GetByOrgIDAndName(ctx context.Context, orgID valuer.UUID, name string) (*roletypes.Role, error) {
	storableRole, err := getter.store.GetByOrgIDAndName(ctx, orgID, name)
	if err != nil {
		return nil, err
	}

	return roletypes.NewRoleFromStorableRole(storableRole), nil
}

func (getter *getter) List(ctx context.Context, orgID valuer.UUID) ([]*roletypes.Role, error) {
	storableRoles, err := getter.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	roles := make([]*roletypes.Role, len(storableRoles))
	for idx, storableRole := range storableRoles {
		roles[idx] = roletypes.NewRoleFromStorableRole(storableRole)
	}

	return roles, nil
}

func (getter *getter) ListByOrgIDAndNames(ctx context.Context, orgID valuer.UUID, names []string) ([]*roletypes.Role, error) {
	storableRoles, err := getter.store.ListByOrgIDAndNames(ctx, orgID, names)
	if err != nil {
		return nil, err
	}

	roles := make([]*roletypes.Role, len(storableRoles))
	for idx, storable := range storableRoles {
		roles[idx] = roletypes.NewRoleFromStorableRole(storable)
	}

	return roles, nil
}
