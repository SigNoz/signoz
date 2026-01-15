package implrole

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
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

func (module *module) SetManagedRoles(ctx context.Context, orgID valuer.UUID) error {
	// todo[vikrant]: clean this and make this as individual module code!
	signozAnonymousRole := roletypes.NewRole(roletypes.SigNozAnonymousRoleName, roletypes.SigNozAnonymousRoleDescription, roletypes.RoleTypeManaged, orgID)

	tuples := []*openfgav1.TupleKey{}
	roleAssignmentTuples, err := authtypes.TypeableRole.Tuples(
		authtypes.MustNewSubject(authtypes.TypeableAnonymous, authtypes.AnonymousUser.String(), orgID, nil),
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, signozAnonymousRole.ID.StringValue()),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	tuples = append(tuples, roleAssignmentTuples...)

	publicDashboardTuples, err := dashboardtypes.TypeableMetaResourcePublicDashboard.Tuples(
		authtypes.MustNewSubject(authtypes.TypeableRole, authtypes.MustNewSelector(authtypes.TypeRole, signozAnonymousRole.ID.String()).String(), orgID, &authtypes.RelationAssignee),
		authtypes.RelationRead,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeMetaResource, "*"),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	tuples = append(tuples, publicDashboardTuples...)

	err = module.authz.Write(ctx, tuples, nil)
	if err != nil {
		return err
	}

	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		signozAdminRole := roletypes.NewRole(roletypes.SigNozAdminRoleName, roletypes.SigNozAdminRoleDescription, roletypes.RoleTypeManaged, orgID)
		err := module.store.Create(ctx, roletypes.NewStorableRoleFromRole(signozAdminRole))
		if err != nil {
			return err
		}

		signozEditorRole := roletypes.NewRole(roletypes.SigNozEditorRoleName, roletypes.SigNozEditorRoleDescription, roletypes.RoleTypeManaged, orgID)
		err = module.store.Create(ctx, roletypes.NewStorableRoleFromRole(signozEditorRole))
		if err != nil {
			return err
		}

		signozViewerRole := roletypes.NewRole(roletypes.SigNozViewerRoleName, roletypes.SigNozViewerRoleDescription, roletypes.RoleTypeManaged, orgID)
		err = module.store.Create(ctx, roletypes.NewStorableRoleFromRole(signozViewerRole))
		if err != nil {
			return err
		}

		err = module.store.Create(ctx, roletypes.NewStorableRoleFromRole(signozAnonymousRole))
		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}
