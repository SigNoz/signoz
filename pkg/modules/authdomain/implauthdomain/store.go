package implauthdomain

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) authtypes.AuthDomainStore {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, domain *authtypes.AuthDomain) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(domain.StorableAuthDomain()).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, authtypes.ErrCodeAuthDomainAlreadyExists, "domain with name %s already exists", domain.StorableAuthDomain().Name)
	}

	return nil
}

func (store *store) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	authDomain := new(authtypes.StorableAuthDomain)

	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(authDomain).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) Get(ctx context.Context, id valuer.UUID) (*authtypes.AuthDomain, error) {
	authDomain := new(authtypes.StorableAuthDomain)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(authDomain).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeAuthDomainNotFound, "auth domain with id %s does not exist", id)
	}

	return authtypes.NewAuthDomainFromStorableAuthDomain(authDomain)
}

func (store *store) GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*authtypes.AuthDomain, error) {
	authDomain := new(authtypes.StorableAuthDomain)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(authDomain).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeAuthDomainNotFound, "auth domain with id %s does not exist", orgID, id)
	}

	return authtypes.NewAuthDomainFromStorableAuthDomain(authDomain)
}

func (store *store) GetByName(ctx context.Context, name string) (*authtypes.AuthDomain, error) {
	authDomain := new(authtypes.StorableAuthDomain)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(authDomain).
		Where("name = ?", name).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeAuthDomainNotFound, "auth domain with name %s does not exist", name)
	}

	return authtypes.NewAuthDomainFromStorableAuthDomain(authDomain)
}

func (store *store) GetByNameAndOrgID(ctx context.Context, name string, orgID valuer.UUID) (*authtypes.AuthDomain, error) {
	authDomain := new(authtypes.StorableAuthDomain)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(authDomain).
		Where("name = ?", name).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeAuthDomainNotFound, "auth domain with name %s and org id %s does not exist", name, orgID)
	}

	return authtypes.NewAuthDomainFromStorableAuthDomain(authDomain)
}

func (store *store) ListByOrgID(ctx context.Context, orgId valuer.UUID) ([]*authtypes.AuthDomain, error) {
	var storableAuthDomains []*authtypes.StorableAuthDomain

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&storableAuthDomains).
		Where("org_id = ?", orgId).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	authDomains := make([]*authtypes.AuthDomain, len(storableAuthDomains))
	for i, storableAuthDomain := range storableAuthDomains {
		authDomains[i], err = authtypes.NewAuthDomainFromStorableAuthDomain(storableAuthDomain)
		if err != nil {
			return nil, err
		}
	}

	return authDomains, nil
}

func (store *store) Update(ctx context.Context, domain *authtypes.AuthDomain) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(domain.StorableAuthDomain()).
		WherePK().
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}
