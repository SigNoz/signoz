package implserviceaccount

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store serviceaccounttypes.Store
	authz authz.AuthZ
}

func NewModule(store serviceaccounttypes.Store, authz authz.AuthZ) serviceaccount.Module {
	return &module{store: store, authz: authz}
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, serviceAccount *serviceaccounttypes.ServiceAccount) error {
	// validates the presence of all roles passed in the create request
	roles, err := module.authz.ListByOrgIDAndNames(ctx, orgID, serviceAccount.Roles)
	if err != nil {
		return err
	}

	// authz actions cannot run in sql transactions
	err = module.authz.Grant(ctx, orgID, serviceAccount.Roles, authtypes.MustNewSubject(authtypes.TypeableUser, serviceAccount.ID.String(), orgID, &authtypes.RelationAssignee))
	if err != nil {
		return err
	}

	storableServiceAccount := serviceaccounttypes.NewStorableServiceAccount(serviceAccount)
	storableServiceAccountRoles := serviceaccounttypes.NewStorableServiceAccountRoles(serviceAccount.ID, roles)
	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		err := module.store.Create(ctx, storableServiceAccount)
		if err != nil {
			return err
		}

		err = module.store.CreateServiceAccountRoles(ctx, storableServiceAccountRoles)
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

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.ServiceAccount, error) {
	storableServiceAccount, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	// did the orchestration on application layer instead of DB as the ORM also does it anyways for many to many tables.
	storableServiceAccountRoles, err := module.store.GetServiceAccountRoles(ctx, id)
	if err != nil {
		return nil, err
	}

	roleIDs := make([]valuer.UUID, len(storableServiceAccountRoles))
	for idx, sar := range storableServiceAccountRoles {
		roleIDs[idx] = valuer.MustNewUUID(sar.RoleID)
	}

	roles, err := module.authz.ListByOrgIDAndIDs(ctx, orgID, roleIDs)
	if err != nil {
		return nil, err
	}

	rolesNames, err := serviceaccounttypes.NewRolesFromStorableServiceAccountRoles(storableServiceAccountRoles, roles)
	if err != nil {
		return nil, err
	}

	serviceAccount := serviceaccounttypes.NewServiceAccountFromStorables(storableServiceAccount, rolesNames)
	return serviceAccount, nil
}

func (module *module) GetWithoutRoles(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.ServiceAccount, error) {
	storableServiceAccount, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	// passing []string{} (not nil to prevent panics) roles as the function isn't supposed to put roles.
	serviceAccount := serviceaccounttypes.NewServiceAccountFromStorables(storableServiceAccount, []string{})
	return serviceAccount, nil
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*serviceaccounttypes.ServiceAccount, error) {
	storableServiceAccounts, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	storableServiceAccountRoles, err := module.store.ListServiceAccountRolesByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// convert the service account roles to structured data
	saIDToRoleIDs, roleIDs := serviceaccounttypes.GetUniqueRolesAndServiceAccountMapping(storableServiceAccountRoles)
	roles, err := module.authz.ListByOrgIDAndIDs(ctx, orgID, roleIDs)
	if err != nil {
		return nil, err
	}

	// fill in the role fetched data back to service account
	serviceAccounts := serviceaccounttypes.NewServiceAccountsFromRoles(storableServiceAccounts, roles, saIDToRoleIDs)
	return serviceAccounts, nil
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, input *serviceaccounttypes.ServiceAccount) error {
	serviceAccount, err := module.Get(ctx, orgID, input.ID)
	if err != nil {
		return err
	}

	roles, err := module.authz.ListByOrgIDAndNames(ctx, orgID, input.Roles)
	if err != nil {
		return err
	}

	// gets the role diff if any to modify grants.
	grants, revokes := serviceAccount.PatchRoles(input)
	err = module.authz.ModifyGrant(ctx, orgID, revokes, grants, authtypes.MustNewSubject(authtypes.TypeableUser, serviceAccount.ID.String(), orgID, &authtypes.RelationAssignee))
	if err != nil {
		return err
	}

	storableServiceAccountRoles := serviceaccounttypes.NewStorableServiceAccountRoles(serviceAccount.ID, roles)
	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		err := module.store.Update(ctx, orgID, serviceaccounttypes.NewStorableServiceAccount(input))
		if err != nil {
			return err
		}

		// delete all the service account roles and create new rather than diff here.
		err = module.store.DeleteServiceAccountRoles(ctx, input.ID)
		if err != nil {
			return err
		}

		err = module.store.CreateServiceAccountRoles(ctx, storableServiceAccountRoles)
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

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	serviceAccount, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	// revoke from authz first as this cannot run in sql transaction
	err = module.authz.Revoke(ctx, orgID, serviceAccount.Roles, authtypes.MustNewSubject(authtypes.TypeableUser, serviceAccount.ID.String(), orgID, &authtypes.RelationAssignee))
	if err != nil {
		return err
	}

	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		err := module.store.DeleteServiceAccountRoles(ctx, serviceAccount.ID)
		if err != nil {
			return err
		}

		err = module.store.Delete(ctx, serviceAccount.OrgID, serviceAccount.ID)
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

func (module *module) CreateFactorAPIKey(ctx context.Context, factorAPIKey *serviceaccounttypes.FactorAPIKey) error {
	storableFactorAPIKey := serviceaccounttypes.NewStorableFactorAPIKey(factorAPIKey)

	err := module.store.CreateFactorAPIKey(ctx, storableFactorAPIKey)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) GetFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.FactorAPIKey, error) {
	storableFactorAPIKey, err := module.store.GetFactorAPIKey(ctx, serviceAccountID, id)
	if err != nil {
		return nil, err
	}

	return serviceaccounttypes.NewFactorAPIKeyFromStorable(storableFactorAPIKey), nil
}

func (module *module) ListFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID) ([]*serviceaccounttypes.FactorAPIKey, error) {
	storables, err := module.store.ListFactorAPIKey(ctx, serviceAccountID)
	if err != nil {
		return nil, err
	}

	return serviceaccounttypes.NewFactorAPIKeyFromStorables(storables), nil
}

func (module *module) UpdateFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID, factorAPIKey *serviceaccounttypes.FactorAPIKey) error {
	return module.store.UpdateFactorAPIKey(ctx, serviceAccountID, serviceaccounttypes.NewStorableFactorAPIKey(factorAPIKey))
}

func (module *module) RevokeFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID, id valuer.UUID) error {
	return module.store.RevokeFactorAPIKey(ctx, serviceAccountID, id)
}
