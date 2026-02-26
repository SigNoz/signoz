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

	return nil
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.ServiceAccount, error) {
	storableServiceAccount, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	storableServiceAccountRoles, err := module.store.GetServiceAccountRoles(ctx, id)
	if err != nil {
		return nil, err
	}

	serviceAccount := serviceaccounttypes.NewServiceAccountFromStorables(storableServiceAccount, storableServiceAccountRoles)
	return serviceAccount, nil
}

func (module *module) List(context.Context, valuer.UUID) ([]*serviceaccounttypes.ServiceAccount, error) {
	return nil, nil
}

func (module *module) Update(context.Context, valuer.UUID, *serviceaccounttypes.ServiceAccount) error {
	return nil
}

func (module *module) Delete(context.Context, valuer.UUID, valuer.UUID) error {
	return nil
}

func (module *module) CreateFactorAPIKey(context.Context, valuer.UUID, *serviceaccounttypes.FactorAPIKey) error {
	return nil
}

func (module *module) ListFactorAPIKey(context.Context, valuer.UUID) ([]*serviceaccounttypes.FactorAPIKey, error) {
	return nil, nil
}

func (module *module) UpdateFactorAPIKey(context.Context, valuer.UUID, *serviceaccounttypes.FactorAPIKey) error {
	return nil
}

func (module *module) RevokeFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) error {
	return nil
}
