package implrole

import (
	"context"

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

// todo(vikrantgupta25): make the insert for role and tuples in a single transaction
func (module *module) Create(ctx context.Context, postableRole *roletypes.PostableRole) error {
	tuples, err := postableRole.GetTuplesFromTransactions()
	if err != nil {
		return err
	}

	err = module.authz.Write(ctx, &openfgav1.WriteRequest{
		Writes: &openfgav1.WriteRequestWrites{
			TupleKeys: tuples,
		},
	})
	if err != nil {
		return err
	}

	storableRole, err := roletypes.NewStorableRoleFromRole(postableRole)
	if err != nil {
		return err
	}
	err = module.store.Create(ctx, storableRole)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*roletypes.GettableRole, error) {
	storableRole, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	gettableRole, err := roletypes.NewRoleFromStorableRole(storableRole)
	if err != nil {
		return nil, err
	}

	return gettableRole, nil
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*roletypes.GettableRole, error) {
	storableRoles, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	gettableRoles := make([]*roletypes.GettableRole, len(storableRoles))
	for idx, storableRole := range storableRoles {
		gettableRole, err := roletypes.NewRoleFromStorableRole(storableRole)
		if err != nil {
			return nil, err
		}
		gettableRoles[idx] = gettableRole
	}

	return gettableRoles, nil
}

func (module *module) GetResources(_ context.Context) []*roletypes.Resource {
	resources := make([]*roletypes.Resource, 0)
	typeables := make([]authtypes.Typeable, 0)
	for _, register := range module.registry {
		typeables = append(typeables, register.MustGetTypeables()...)
	}

	for _, typeable := range typeables {
		resources = append(resources, &roletypes.Resource{Name: typeable.Name(), Type: typeable.Type()})
	}

	return resources
}

// todo(vikrantgupta25): make the update for role and tuples in a single transaction
func (module *module) Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatableRole *roletypes.UpdatableRole) error {
	storableRole, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	role, err := roletypes.NewRoleFromStorableRole(storableRole)
	if err != nil {
		return err
	}

	additions, deletions, err := role.GetDifference(updatableRole)
	if err != nil {
		return err
	}

	err = module.authz.Write(ctx, &openfgav1.WriteRequest{
		Writes: &openfgav1.WriteRequestWrites{
			TupleKeys: additions,
		},
		Deletes: &openfgav1.WriteRequestDeletes{
			TupleKeys: deletions,
		},
	})
	if err != nil {
		return err
	}

	role.Update(updatableRole)
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

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return module.store.Delete(ctx, orgID, id)
}
