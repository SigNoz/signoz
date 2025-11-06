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

func (module *module) Create(ctx context.Context, orgID valuer.UUID, displayName, description string) error {
	storableRole := roletypes.NewStorableRole(displayName, description, roletypes.RoleTypeCustom, orgID)
	err := module.store.Create(ctx, storableRole)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) GetResources(_ context.Context) []*authtypes.Resource {
	typeables := make([]authtypes.Typeable, 0)
	for _, register := range module.registry {
		typeables = append(typeables, register.MustGetTypeables()...)
	}
	// role module cannot self register itself hence extracting here.
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

	role, err := roletypes.NewRoleFromStorableRole(storableRole)
	if err != nil {
		return nil, err
	}

	return role, nil
}

func (module *module) GetObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation) ([]*authtypes.Object, error) {
	_, err := module.store.Get(ctx, orgID, id)
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
					authtypes.MustNewSubject(authtypes.TypeRole, id.String(), authtypes.RelationAssignee),
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

func (module *module) GetMembership(ctx context.Context, orgID valuer.UUID, id valuer.UUID) ([]*roletypes.Membership, error) {
	_, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	storableMembership, err := module.store.GetMembership(ctx, id)
	if err != nil {
		return nil, err
	}

	users, err := module.store.ListUserByRole(ctx, id)
	if err != nil {
		return nil, err
	}

	membership := roletypes.NewMembershipFromStorableMembership(storableMembership, users)
	return membership, nil
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

func (module *module) ListMembershipAttributes(ctx context.Context, orgID valuer.UUID) (map[string]*roletypes.Attributes, error) {
	return module.store.ListMembershipAttributes(ctx, orgID)
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

	err = role.PatchMetadata(displayName, description)
	if err != nil {
		return err
	}

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

func (module *module) PatchMembership(ctx context.Context, orgID valuer.UUID, id valuer.UUID, additions, deletions []*roletypes.UpdatableMembership) error {
	_, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	memberships, err := module.store.GetMembership(ctx, id)
	if err != nil {
		return err
	}

	updatableMemberships := make([]*roletypes.UpdatableMembership, 0)
	membershipTypeAndIDs := make(map[string]bool)
	for _, userRole := range memberships.Users {
		membershipTypeAndIDs[roletypes.MembershipTypeUser.StringValue()+userRole.UserID] = true
	}

	deletionMap := make(map[string]bool)
	for _, del := range deletions {
		switch del.Type {
		case roletypes.MembershipTypeUser:
			deletionMap[del.Type.StringValue()+del.UserID.StringValue()] = true
		}
	}

	for _, userRole := range memberships.Users {
		if !deletionMap[roletypes.MembershipTypeUser.StringValue()+userRole.UserID] {
			updatableMemberships = append(updatableMemberships, &roletypes.UpdatableMembership{
				Type:   roletypes.MembershipTypeUser,
				UserID: valuer.MustNewUUID(userRole.UserID),
			})
		}
	}

	for _, add := range additions {
		switch add.Type {
		case roletypes.MembershipTypeUser:
			if !membershipTypeAndIDs[add.Type.StringValue()+add.UserID.StringValue()] {
				updatableMemberships = append(updatableMemberships, add)
			}
		}
	}

	storableMemberships := roletypes.NewStorableMembershipFromUpdatableMemberships(id, updatableMemberships)
	err = module.store.UpdateMembership(ctx, id, storableMemberships)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	storableRole, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	role, err := roletypes.NewRoleFromStorableRole(storableRole)
	if err != nil {
		return err
	}

	if !role.CanEditOrDelete() {
		return errors.Newf(errors.TypeInvalidInput, roletypes.ErrCodeRoleInvalidInput, "cannot delete managed role")
	}

	return module.store.Delete(ctx, orgID, id)
}

func (module *module) SetManagedRoles(ctx context.Context, orgID valuer.UUID) error {
	storableManagedRoleAdmin := roletypes.MustNewStorableRole(
		roletypes.ManagedRoleSigNozAdminName,
		roletypes.ManagedRoleSigNozAdminDescription,
		roletypes.RoleTypeManaged,
		orgID,
	)

	storableManagedRoleViewer := roletypes.MustNewStorableRole(
		roletypes.ManagedRoleSigNozViewerName,
		roletypes.ManagedRoleSigNozViewerDescription,
		roletypes.RoleTypeManaged,
		orgID,
	)

	storableManagedRoleEditor := roletypes.MustNewStorableRole(
		roletypes.ManagedRoleSigNozEditorName,
		roletypes.ManagedRoleSigNozEditorDescription,
		roletypes.RoleTypeManaged,
		orgID,
	)

	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		err := module.store.Create(ctx, storableManagedRoleAdmin)
		if err != nil {
			return err
		}

		err = module.store.Create(ctx, storableManagedRoleViewer)
		if err != nil {
			return err
		}

		err = module.store.Create(ctx, storableManagedRoleEditor)
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

func (module *module) MustGetTypeables() []authtypes.Typeable {
	return []authtypes.Typeable{authtypes.TypeableRole, roletypes.TypeableResourcesRoles}
}
