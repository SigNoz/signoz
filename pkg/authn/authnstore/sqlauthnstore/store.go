package sqlauthnstore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) authtypes.AuthNStore {
	return &store{sqlstore: sqlstore}
}

func (store *store) GetUserAndFactorPasswordByEmailAndOrgID(ctx context.Context, email string, orgID valuer.UUID) (*types.User, *types.FactorPassword, error) {
	user := new(types.User)
	factorPassword := new(types.FactorPassword)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(user).
		Where("email = ?", email).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeUserNotFound, "user with email %s in org %s not found", email, orgID)
	}

	err = store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(factorPassword).
		Where("user_id = ?", user.ID).
		Scan(ctx)
	if err != nil {
		return nil, nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodePasswordNotFound, "user with email %s in org %s does not have password", email, orgID)
	}

	return user, factorPassword, nil
}

func (store *store) GetAuthDomainFromID(ctx context.Context, domainID valuer.UUID) (*authtypes.AuthDomain, error) {
	storableAuthDomain := new(authtypes.StorableAuthDomain)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(storableAuthDomain).
		Where("id = ?", domainID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeAuthDomainNotFound, "auth domain with id %s does not exist", domainID)
	}

	return authtypes.NewAuthDomainFromStorableAuthDomain(storableAuthDomain)
}
