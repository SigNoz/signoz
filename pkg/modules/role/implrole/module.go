package implrole

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type module struct {
	store    roletypes.Store
	registry []role.RegisterTypeable
	authz    authz.AuthZ
}

func NewModule(ctx context.Context, store roletypes.Store, authz authz.AuthZ, registry []role.RegisterTypeable) (role.Module, error) {
	return &module{
		store:    store,
		authz:    authz,
		registry: registry,
	}, nil
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, displayName, description string) (*roletypes.Role, error) {
	role := roletypes.NewRole(displayName, description, orgID)

	storableRole, err := roletypes.NewStorableRoleFromRole(role)
	if err != nil {
		return nil, err
	}

	err = module.store.Create(ctx, storableRole)
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

	role, err := roletypes.NewRoleFromStorableRole(storableRole)
	if err != nil {
		return nil, err
	}

	return role, nil
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
					authtypes.MustNewSubject(authtypes.TypeRole, storableRole.ID.String(), authtypes.RelationAssignee),
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
		role, err := roletypes.NewRoleFromStorableRole(storableRole)
		if err != nil {
			return nil, err
		}
		roles[idx] = role
	}

	return roles, nil
}

func (module *module) Patch(ctx context.Context, orgID valuer.UUID, id valuer.UUID, displayName, description *string) error {
	storableRole, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	role, err := roletypes.NewRoleFromStorableRole(storableRole)
	if err != nil {
		return err
	}

	role.PatchMetadata(displayName, description)
	updatedRole, err := roletypes.NewStorableRoleFromRole(role)
	if err != nil {
		return err
	}

	err = module.store.Update(ctx, orgID, updatedRole)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) PatchObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation, additions, deletions []*authtypes.Object) error {
	additionTuples, err := roletypes.GetAdditionTuples(id, relation, additions)
	if err != nil {
		return err
	}

	deletionTuples, err := roletypes.GetDeletionTuples(id, relation, deletions)
	if err != nil {
		return err
	}

	err = module.authz.Write(ctx, &openfgav1.WriteRequest{
		Writes: &openfgav1.WriteRequestWrites{
			TupleKeys: additionTuples,
		},
		Deletes: &openfgav1.WriteRequestDeletes{
			TupleKeys: deletionTuples,
		},
	})
	if err != nil {
		return err
	}

	return nil
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return module.store.Delete(ctx, orgID, id)
}
