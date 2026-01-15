package implrole

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store roletypes.Store
	authz authz.AuthZ
}

func NewModule(store roletypes.Store, authz authz.AuthZ) role.Module {
	return &module{store: store, authz: authz}
}

func (module *module) Create(ctx context.Context, role *roletypes.Role) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) GetOrCreate(ctx context.Context, role *roletypes.Role) (*roletypes.Role, error) {
	return nil, errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) GetResources(_ context.Context) []*authtypes.Resource {
	return nil
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*roletypes.Role, error) {
	storableRole, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return roletypes.NewRoleFromStorableRole(storableRole), nil
}

func (module *module) GetObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation) ([]*authtypes.Object, error) {
	return nil, errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) GetByOrgIDAndName(ctx context.Context, orgID valuer.UUID, name string) (*roletypes.Role, error) {
	storableRole, err := module.store.GetByOrgIDAndName(ctx, name, orgID)
	if err != nil {
		return nil, err
	}

	return roletypes.NewRoleFromStorableRole(storableRole), nil
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*roletypes.Role, error) {
	storableRoles, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	roles := make([]*roletypes.Role, len(storableRoles))
	for idx, storableRole := range storableRoles {
		roles[idx] = roletypes.NewRoleFromStorableRole(storableRole)
	}

	return roles, nil
}

func (module *module) Patch(ctx context.Context, orgID valuer.UUID, role *roletypes.Role) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) PatchObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation, additions, deletions []*authtypes.Object) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) MustGetTypeables() []authtypes.Typeable {
	return nil
}
