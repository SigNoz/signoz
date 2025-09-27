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

func (store *store) Delete(ctx context.Context, id valuer.UUID) error {
	authDomain := new(authtypes.StorableAuthDomain)

	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(authDomain).
		Where("id = ?", id).
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
		return nil, err
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
		return nil, err
	}

	return authtypes.NewAuthDomainFromStorableAuthDomain(authDomain)
}

func (store *store) ListByOrgID(ctx context.Context, orgId valuer.UUID) ([]*authtypes.AuthDomain, error) {
	var authDomains []*authtypes.AuthDomain

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&authDomains).
		Where("org_id = ?", orgId).
		Scan(ctx)
	if err != nil {
		return nil, err
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
