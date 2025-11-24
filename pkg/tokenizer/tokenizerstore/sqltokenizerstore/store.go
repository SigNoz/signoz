package sqltokenizerstore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) authtypes.TokenStore {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, token *authtypes.StorableToken) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(token).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) GetIdentityByUserID(ctx context.Context, userID valuer.UUID) (*authtypes.Identity, error) {
	user := new(types.User)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(user).
		Where("id = ?", userID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeUserNotFound, "user with id: %s does not exist", userID)
	}

	return authtypes.NewIdentity(userID, user.OrgID, user.Email, types.Role(user.Role)), nil
}

func (store *store) GetByAccessToken(ctx context.Context, accessToken string) (*authtypes.StorableToken, error) {
	token := new(authtypes.StorableToken)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(token).
		Where("access_token = ?", accessToken).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeTokenNotFound, "token does not exist", accessToken)
	}

	return token, nil
}

func (store *store) GetOrUpdateByAccessTokenOrPrevAccessToken(ctx context.Context, accessToken string, updater func(ctx context.Context, token *authtypes.StorableToken) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		token := new(authtypes.StorableToken)

		selectQuery := store.
			sqlstore.
			BunDBCtx(ctx).
			NewSelect().
			Model(token).
			Where("access_token = ?", accessToken).
			WhereOr("prev_access_token = ?", accessToken)

		if store.sqlstore.BunDBCtx(ctx).Dialect().Name() != dialect.SQLite {
			selectQuery = selectQuery.For("UPDATE")
		}

		err := selectQuery.Scan(ctx)
		if err != nil {
			return store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeTokenNotFound, "token does not exist", accessToken)
		}

		if err := updater(ctx, token); err != nil {
			return err
		}

		return nil
	})
}

func (store *store) GetByUserIDAndRefreshToken(ctx context.Context, userID valuer.UUID, refreshToken string) (*authtypes.StorableToken, error) {
	token := new(authtypes.StorableToken)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(token).
		Where("user_id = ?", userID).
		Where("refresh_token = ?", refreshToken).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeTokenNotFound, "token with user id: %s and refresh token: %s does not exist", userID, refreshToken)
	}

	return token, nil
}

func (store *store) ListByOrgID(ctx context.Context, orgID valuer.UUID) ([]*authtypes.StorableToken, error) {
	tokens := make([]*authtypes.StorableToken, 0)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&tokens).
		Join("JOIN users").
		JoinOn("users.id = auth_token.user_id").
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

func (store *store) ListByOrgIDs(ctx context.Context, orgIDs []valuer.UUID) ([]*authtypes.StorableToken, error) {
	tokens := make([]*authtypes.StorableToken, 0)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&tokens).
		Join("JOIN users").
		JoinOn("users.id = auth_token.user_id").
		Join("JOIN organizations").
		JoinOn("organizations.id = users.org_id").
		Where("organizations.id IN (?)", bun.In(orgIDs)).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

func (store *store) Update(ctx context.Context, token *authtypes.StorableToken) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(token).
		Where("id = ?", token.ID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) DeleteByAccessToken(ctx context.Context, accessToken string) error {
	token := new(authtypes.StorableToken)

	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(token).
		Where("access_token = ?", accessToken).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) DeleteMany(ctx context.Context, tokenIDs []valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(authtypes.StorableToken)).
		Where("id IN (?)", tokenIDs).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) DeleteByUserID(ctx context.Context, userID valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(authtypes.StorableToken)).
		Where("user_id = ?", userID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) ListByUserID(ctx context.Context, userID valuer.UUID) ([]*authtypes.StorableToken, error) {
	var tokens []*authtypes.StorableToken

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&tokens).
		Where("user_id = ?", userID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

func (store *store) UpdateLastObservedAtByAccessToken(ctx context.Context, accessTokenToLastObservedAt []map[string]any) error {
	values := store.
		sqlstore.
		BunDBCtx(ctx).
		NewValues(&accessTokenToLastObservedAt)

	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		With("update_cte", values).
		Model((*authtypes.StorableToken)(nil)).
		TableExpr("update_cte").
		Set("last_observed_at = update_cte.last_observed_at").
		Where("auth_token.access_token = update_cte.access_token").
		Where("auth_token.user_id = update_cte.user_id").
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}
