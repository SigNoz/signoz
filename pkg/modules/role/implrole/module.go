package implrole

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store    roletypes.Store
	registry []role.RegisterTypeable
	authz    authz.AuthZ
}

func NewModule(store roletypes.Store, authz authz.AuthZ, registry []role.RegisterTypeable) role.Module {
	return &module{
		store:    store,
		authz:    authz,
		registry: registry,
	}
}

func (module *module) Create(ctx context.Context, role *roletypes.Role) error {
	return module.store.Create(ctx, roletypes.NewStorableRoleFromRole(role))
}

func (module *module) GetOrCreate(ctx context.Context, role *roletypes.Role) (*roletypes.Role, error) {
	existingRole, err := module.store.GetByNameAndOrgID(ctx, role.Name, role.OrgID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if existingRole != nil {
		return roletypes.NewRoleFromStorableRole(existingRole), nil
	}

	err = module.store.Create(ctx, roletypes.NewStorableRoleFromRole(role))
	if err != nil {
		return nil, err
	}

	return role, nil
}

func (module *module) GetResources(_ context.Context) []*authtypes.Resource {
	typeables := make([]authtypes.Typeable, 0)
	for _, register := range module.registry {
		typeables = append(typeables, register.MustGetTypeables()...)
	}
	// role module cannot self register itself!
	typeables = append(typeables, module.MustGetTypeables()...)

	resources := make([]*authtypes.Resource, 0)
	for _, typeable := range typeables {
		resources = append(resources, &authtypes.Resource{Name: typeable.Name(), Type: typeable.Type()})
	}

	return resources
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*roletypes.Role, error) {
	storableRole, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return roletypes.NewRoleFromStorableRole(storableRole), nil
}

func (module *module) GetObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation) ([]*authtypes.Object, error) {
	storableRole, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	objects := make([]*authtypes.Object, 0)
	for _, resource := range module.GetResources(ctx) {
		if slices.Contains(authtypes.TypeableRelations[resource.Type], relation) {
			resourceObjects, err := module.
				authz.
				ListObjects(
					ctx,
					authtypes.MustNewSubject(authtypes.TypeableRole, storableRole.ID.String(), orgID, &authtypes.RelationAssignee),
					relation,
					authtypes.MustNewTypeableFromType(resource.Type, resource.Name),
				)
			if err != nil {
				return nil, err
			}

			objects = append(objects, resourceObjects...)
		}
	}

	return objects, nil
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
	return module.store.Update(ctx, orgID, roletypes.NewStorableRoleFromRole(role))
}

func (module *module) PatchObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation, additions, deletions []*authtypes.Object) error {
	additionTuples, err := roletypes.GetAdditionTuples(id, orgID, relation, additions)
	if err != nil {
		return err
	}

	deletionTuples, err := roletypes.GetDeletionTuples(id, orgID, relation, deletions)
	if err != nil {
		return err
	}

	err = module.authz.Write(ctx, additionTuples, deletionTuples)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) Assign(ctx context.Context, id valuer.UUID, orgID valuer.UUID, subject string) error {
	tuples, err := authtypes.TypeableRole.Tuples(
		subject,
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, id.StringValue()),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	return module.authz.Write(ctx, tuples, nil)
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return module.store.Delete(ctx, orgID, id)
}

func (module *module) MustGetTypeables() []authtypes.Typeable {
	return []authtypes.Typeable{authtypes.TypeableRole, roletypes.TypeableResourcesRoles}
}
