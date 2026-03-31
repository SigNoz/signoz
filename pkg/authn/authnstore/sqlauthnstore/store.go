package sqlauthnstore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
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

func (store *store) GetActiveUserAndFactorPasswordByEmailAndOrgID(ctx context.Context, email string, orgID valuer.UUID) (*types.User, *types.FactorPassword, []*authtypes.UserRole, error) {
	user := new(types.User)
	factorPassword := new(types.FactorPassword)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(user).
		Where("email = ?", email).
		Where("org_id = ?", orgID).
		Where("status = ?", types.UserStatusActive.StringValue()).
		Scan(ctx)
	if err != nil {
		return nil, nil, nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeUserNotFound, "user with email %s in org %s not found", email, orgID)
	}

	err = store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(factorPassword).
		Where("user_id = ?", user.ID).
		Scan(ctx)
	if err != nil {
		return nil, nil, nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodePasswordNotFound, "user with email %s in org %s does not have password", email, orgID)
	}

	userRoles := make([]*authtypes.UserRole, 0)
	err = store.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&userRoles).
		Where("user_id = ?", user.ID).
		Relation("Role").
		Scan(ctx)
	if err != nil {
		return nil, nil, nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get user roles for user %s in org %s", email, orgID)
	}

	return user, factorPassword, userRoles, nil
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
