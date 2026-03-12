package implserviceaccount

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) serviceaccounttypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, storable *serviceaccounttypes.StorableServiceAccount) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(storable).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, serviceaccounttypes.ErrCodeServiceAccountAlreadyExists, "service account with id: %s already exists", storable.ID)
	}

	return nil
}

func (store *store) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.StorableServiceAccount, error) {
	storable := new(serviceaccounttypes.StorableServiceAccount)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(storable).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, serviceaccounttypes.ErrCodeServiceAccountNotFound, "service account with id: %s doesn't exist in org: %s", id, orgID)
	}

	return storable, nil
}

func (store *store) GetActiveByOrgIDAndName(ctx context.Context, orgID valuer.UUID, name string) (*serviceaccounttypes.StorableServiceAccount, error) {
	storable := new(serviceaccounttypes.StorableServiceAccount)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(storable).
		Where("org_id = ?", orgID).
		Where("name = ?", name).
		Where("status = ?", serviceaccounttypes.StatusActive).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, serviceaccounttypes.ErrCodeServiceAccountNotFound, "service account with name: %s doesn't exist in org: %s", name, orgID.String())
	}

	return storable, nil
}

func (store *store) GetByID(ctx context.Context, id valuer.UUID) (*serviceaccounttypes.StorableServiceAccount, error) {
	storable := new(serviceaccounttypes.StorableServiceAccount)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(storable).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, serviceaccounttypes.ErrCodeServiceAccountNotFound, "service account with id: %s doesn't exist", id)
	}

	return storable, nil
}

func (store *store) List(ctx context.Context, orgID valuer.UUID) ([]*serviceaccounttypes.StorableServiceAccount, error) {
	storables := make([]*serviceaccounttypes.StorableServiceAccount, 0)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&storables).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return storables, nil
}

func (store *store) Update(ctx context.Context, orgID valuer.UUID, storable *serviceaccounttypes.StorableServiceAccount) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(storable).
		WherePK().
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(serviceaccounttypes.StorableServiceAccount)).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) CreateServiceAccountRoles(ctx context.Context, storables []*serviceaccounttypes.StorableServiceAccountRole) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(&storables).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, serviceaccounttypes.ErrCodeServiceAccountRoleAlreadyExists, "duplicate role assignments for service account")
	}

	return nil
}

func (store *store) GetServiceAccountRoles(ctx context.Context, id valuer.UUID) ([]*serviceaccounttypes.StorableServiceAccountRole, error) {
	storables := make([]*serviceaccounttypes.StorableServiceAccountRole, 0)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&storables).
		Where("service_account_id = ?", id).
		Scan(ctx)
	if err != nil {
		// no need to wrap not found here as this is many to many table
		return nil, err
	}

	return storables, nil
}

func (store *store) ListServiceAccountRolesByOrgID(ctx context.Context, orgID valuer.UUID) ([]*serviceaccounttypes.StorableServiceAccountRole, error) {
	storables := make([]*serviceaccounttypes.StorableServiceAccountRole, 0)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&storables).
		Join("JOIN service_account").
		JoinOn("service_account.id = service_account_role.service_account_id").
		Where("service_account.org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return storables, nil
}

func (store *store) DeleteServiceAccountRoles(ctx context.Context, id valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(serviceaccounttypes.StorableServiceAccountRole)).
		Where("service_account_id = ?", id).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) CreateFactorAPIKey(ctx context.Context, storable *serviceaccounttypes.StorableFactorAPIKey) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(storable).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, serviceaccounttypes.ErrCodeAPIKeyAlreadyExists, "api key with name: %s already exists for service account: %s", storable.Name, storable.ServiceAccountID)
	}

	return nil
}

func (store *store) GetFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.StorableFactorAPIKey, error) {
	storable := new(serviceaccounttypes.StorableFactorAPIKey)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(storable).
		Where("id = ?", id).
		Where("service_account_id = ?", serviceAccountID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, serviceaccounttypes.ErrCodeAPIKeytNotFound, "api key with id: %s doesn't exist for service account: %s", id, serviceAccountID)
	}

	return storable, nil
}

func (store *store) ListFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID) ([]*serviceaccounttypes.StorableFactorAPIKey, error) {
	storables := make([]*serviceaccounttypes.StorableFactorAPIKey, 0)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&storables).
		Where("service_account_id = ?", serviceAccountID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return storables, nil
}

func (store *store) UpdateFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID, storable *serviceaccounttypes.StorableFactorAPIKey) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(storable).
		Where("service_account_id = ?", serviceAccountID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) RevokeFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID, id valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(serviceaccounttypes.StorableFactorAPIKey)).
		Where("service_account_id = ?", serviceAccountID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) RevokeAllFactorAPIKeys(ctx context.Context, serviceAccountID valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(serviceaccounttypes.StorableFactorAPIKey)).
		Where("service_account_id = ?", serviceAccountID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) RunInTx(ctx context.Context, cb func(context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}
