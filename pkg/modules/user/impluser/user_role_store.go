package impluser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type userRoleStore struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewUserRoleStore(sqlstore sqlstore.SQLStore, settings factory.ProviderSettings) authtypes.UserRoleStore {
	return &userRoleStore{sqlstore: sqlstore, settings: settings}
}

func (store *userRoleStore) ListUserRolesByOrgIDAndUserIDs(ctx context.Context, orgID valuer.UUID, userIDs []valuer.UUID) ([]*authtypes.UserRole, error) {
	userRoles := make([]*authtypes.UserRole, 0)

	err := store.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&userRoles).
		Join("JOIN users").
		JoinOn("users.id = user_role.user_id").
		Where("users.org_id = ?", orgID).
		Where("users.id IN (?)", bun.In(userIDs)).
		Relation("Role").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return userRoles, nil
}

func (store *userRoleStore) CreateUserRoles(ctx context.Context, userRoles []*authtypes.UserRole) error {
	_, err := store.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(&userRoles).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, authtypes.ErrCodeUserRoleAlreadyExists, "duplicate role assignments for user")
	}
	return nil
}

func (store *userRoleStore) DeleteUserRoles(ctx context.Context, userID valuer.UUID) error {
	_, err := store.sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(authtypes.UserRole)).
		Where("user_id = ?", userID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *userRoleStore) GetUserRolesByUserID(ctx context.Context, userID valuer.UUID) ([]*authtypes.UserRole, error) {
	userRoles := make([]*authtypes.UserRole, 0)

	err := store.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&userRoles).
		Where("user_id = ?", userID).
		Relation("Role").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return userRoles, nil
}
