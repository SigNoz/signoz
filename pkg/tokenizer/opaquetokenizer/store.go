package opaquetokenizer

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

func (store *store) GetAuthenticatedUserByUserID(ctx context.Context, userID valuer.UUID) (*authtypes.AuthenticatedUser, error) {
	user := new(types.User)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(user).
		Where("id = ?", userID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with id: %s does not exist", userID)
	}

	return authtypes.NewAuthenticatedUser(userID, valuer.MustNewUUID(user.OrgID), user.Email, types.Role(user.Role)), nil
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
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeTokenNotFound, "token with access token: %s does not exist", accessToken)
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
		Join("users").
		JoinOn("users.id = tokens.user_id").
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

func (store *store) ListByOwnedKeyRange(ctx context.Context, start, end uint32) ([]*authtypes.StorableToken, error) {
	tokens := make([]*authtypes.StorableToken, 0)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&tokens).
		Join("users").
		JoinOn("users.id = tokens.user_id").
		Join("organizations").
		JoinOn("organizations.id = users.org_id").
		Where("organizations.key >= ?", start).
		Where("organizations.key <= ?", end).
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
