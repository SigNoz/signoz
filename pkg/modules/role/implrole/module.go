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

// GetByOrgIDAndName implements [role.Module].
func (module *module) GetByOrgIDAndName(context.Context, valuer.UUID, string) (*roletypes.Role, error) {
	panic("unimplemented")
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*roletypes.Role, error) {
	return nil, errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) Patch(ctx context.Context, orgID valuer.UUID, role *roletypes.Role) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) PatchObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation, additions, deletions []*authtypes.Object) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) Assign(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	role, err := module.GetByOrgIDAndName(ctx, orgID, name)
	if err != nil {
		return err
	}

	tuples, err := authtypes.TypeableRole.Tuples(
		subject,
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, role.ID.StringValue()),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	return module.authz.Write(ctx, tuples, nil)
}

func (module *module) Revoke(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	role, err := module.GetByOrgIDAndName(ctx, orgID, name)
	if err != nil {
		return err
	}

	tuples, err := authtypes.TypeableRole.Tuples(
		subject,
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, role.ID.StringValue()),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	return module.authz.Write(ctx, nil, tuples)
}

func (module *module) UpdateAssignment(ctx context.Context, orgID valuer.UUID, existingRoleName string, updatedRolename string, subject string) error {
	err := module.Revoke(ctx, orgID, existingRoleName, subject)
	if err != nil {
		return err
	}

	err = module.Assign(ctx, orgID, updatedRolename, subject)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (module *module) MustGetTypeables() []authtypes.Typeable {
	return nil
}
