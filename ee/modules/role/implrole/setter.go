package implrole

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type setter struct {
	store     roletypes.Store
	authz     authz.AuthZ
	licensing licensing.Licensing
	registry  []role.RegisterTypeable
}

func NewSetter(store roletypes.Store, authz authz.AuthZ, licensing licensing.Licensing, registry []role.RegisterTypeable) role.Setter {
	return &setter{
		store:     store,
		authz:     authz,
		licensing: licensing,
		registry:  registry,
	}
}

func (setter *setter) Create(ctx context.Context, orgID valuer.UUID, role *roletypes.Role) error {
	_, err := setter.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	return setter.store.Create(ctx, roletypes.NewStorableRoleFromRole(role))
}

func (setter *setter) GetOrCreate(ctx context.Context, orgID valuer.UUID, role *roletypes.Role) (*roletypes.Role, error) {
	_, err := setter.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	existingRole, err := setter.store.GetByOrgIDAndName(ctx, role.OrgID, role.Name)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if existingRole != nil {
		return roletypes.NewRoleFromStorableRole(existingRole), nil
	}

	err = setter.store.Create(ctx, roletypes.NewStorableRoleFromRole(role))
	if err != nil {
		return nil, err
	}

	return role, nil
}

func (setter *setter) GetResources(_ context.Context) []*authtypes.Resource {
	typeables := make([]authtypes.Typeable, 0)
	for _, register := range setter.registry {
		typeables = append(typeables, register.MustGetTypeables()...)
	}
	// role module cannot self register itself!
	typeables = append(typeables, setter.MustGetTypeables()...)

	resources := make([]*authtypes.Resource, 0)
	for _, typeable := range typeables {
		resources = append(resources, &authtypes.Resource{Name: typeable.Name(), Type: typeable.Type()})
	}

	return resources
}

func (setter *setter) GetObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation) ([]*authtypes.Object, error) {
	storableRole, err := setter.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	objects := make([]*authtypes.Object, 0)
	for _, resource := range setter.GetResources(ctx) {
		if slices.Contains(authtypes.TypeableRelations[resource.Type], relation) {
			resourceObjects, err := setter.
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

func (setter *setter) Patch(ctx context.Context, orgID valuer.UUID, role *roletypes.Role) error {
	_, err := setter.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	return setter.store.Update(ctx, orgID, roletypes.NewStorableRoleFromRole(role))
}

func (setter *setter) PatchObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation, additions, deletions []*authtypes.Object) error {
	_, err := setter.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	additionTuples, err := roletypes.GetAdditionTuples(id, orgID, relation, additions)
	if err != nil {
		return err
	}

	deletionTuples, err := roletypes.GetDeletionTuples(id, orgID, relation, deletions)
	if err != nil {
		return err
	}

	err = setter.authz.Write(ctx, additionTuples, deletionTuples)
	if err != nil {
		return err
	}

	return nil
}

func (setter *setter) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	_, err := setter.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storableRole, err := setter.store.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	role := roletypes.NewRoleFromStorableRole(storableRole)
	err = role.CanEditDelete()
	if err != nil {
		return err
	}

	return setter.store.Delete(ctx, orgID, id)
}

func (setter *setter) MustGetTypeables() []authtypes.Typeable {
	return []authtypes.Typeable{authtypes.TypeableRole, roletypes.TypeableResourcesRoles}
}
