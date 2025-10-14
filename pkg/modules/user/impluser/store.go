package impluser

import (
	"context"
	"database/sql"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type store struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewStore(sqlstore sqlstore.SQLStore, settings factory.ProviderSettings) types.UserStore {
	return &store{sqlstore: sqlstore, settings: settings}
}

// CreateBulkInvite implements types.InviteStore.
func (store *store) CreateBulkInvite(ctx context.Context, invites []*types.Invite) error {
	_, err := store.sqlstore.BunDB().NewInsert().
		Model(&invites).
		Exec(ctx)

	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, types.ErrInviteAlreadyExists, "invite with email: %s already exists in org: %s", invites[0].Email, invites[0].OrgID)
	}
	return nil
}

// Delete implements types.InviteStore.
func (store *store) DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error {
	_, err := store.sqlstore.BunDB().NewDelete().
		Model(&types.Invite{}).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with id: %s does not exist in org: %s", id.StringValue(), orgID)
	}
	return nil
}

func (store *store) GetInviteByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) (*types.Invite, error) {
	invite := new(types.Invite)

	err := store.
		sqlstore.
		BunDBCtx(ctx).NewSelect().
		Model(invite).
		Where("email = ?", email).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with email %s does not exist in org %s", email, orgID)
	}

	return invite, nil
}

func (store *store) GetInviteByToken(ctx context.Context, token string) (*types.GettableInvite, error) {
	invite := new(types.Invite)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(invite).
		Where("token = ?", token).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite does not exist", token)
	}

	return invite, nil
}

func (store *store) ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error) {
	invites := new([]*types.Invite)
	err := store.sqlstore.BunDB().NewSelect().
		Model(invites).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with org id: %s does not exist", orgID)
	}
	return *invites, nil
}

func (store *store) CreatePassword(ctx context.Context, password *types.FactorPassword) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(password).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, types.ErrPasswordAlreadyExists, "password for user %s already exists", password.UserID)
	}

	return nil
}

func (store *store) CreateUser(ctx context.Context, user *types.User) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(user).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, types.ErrUserAlreadyExists, "user with email %s already exists in org %s", user.Email, user.OrgID)
	}
	return nil
}

func (store *store) GetUsersByEmail(ctx context.Context, email valuer.Email) ([]*types.User, error) {
	var users []*types.User

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&users).
		Where("email = ?", email).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return users, nil
}

func (store *store) GetUser(ctx context.Context, id valuer.UUID) (*types.User, error) {
	user := new(types.User)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(user).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeUserNotFound, "user with id %s does not exist", id)
	}

	return user, nil
}

func (store *store) GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.User, error) {
	user := new(types.User)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(user).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeUserNotFound, "user with id %s does not exist", id)
	}

	return user, nil
}

func (store *store) GetUserByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) (*types.User, error) {
	user := new(types.User)
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(user).
		Where("org_id = ?", orgID).
		Where("email = ?", email).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeUserNotFound, "user with email %s does not exist in org %s", email, orgID)
	}

	return user, nil
}

func (store *store) GetUsersByRoleAndOrgID(ctx context.Context, role types.Role, orgID valuer.UUID) ([]*types.User, error) {
	var users []*types.User

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&users).
		Where("org_id = ?", orgID).
		Where("role = ?", role).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return users, nil
}

func (store *store) UpdateUser(ctx context.Context, orgID valuer.UUID, id string, user *types.User) (*types.User, error) {
	user.UpdatedAt = time.Now()
	_, err := store.sqlstore.BunDB().NewUpdate().
		Model(user).
		Column("display_name").
		Column("role").
		Column("updated_at").
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeUserNotFound, "user with id: %s does not exist in org: %s", id, orgID)
	}
	return user, nil
}

func (store *store) ListUsersByOrgID(ctx context.Context, orgID valuer.UUID) ([]*types.GettableUser, error) {
	users := []*types.User{}

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&users).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return users, nil
}

func (store *store) DeleteUser(ctx context.Context, orgID string, id string) error {
	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to start transaction")
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// get the password id

	var password types.FactorPassword
	err = tx.NewSelect().
		Model(&password).
		Where("user_id = ?", id).
		Scan(ctx)
	if err != nil && err != sql.ErrNoRows {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete password")
	}

	// delete reset password request
	_, err = tx.NewDelete().
		Model(new(types.ResetPasswordToken)).
		Where("password_id = ?", password.ID.String()).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete reset password request")
	}

	// delete factor password
	_, err = tx.NewDelete().
		Model(new(types.FactorPassword)).
		Where("user_id = ?", id).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete factor password")
	}

	// delete api keys
	_, err = tx.NewDelete().
		Model(&types.StorableAPIKey{}).
		Where("user_id = ?", id).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete API keys")
	}

	// delete user
	_, err = tx.NewDelete().
		Model(new(types.User)).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete user")
	}

	// delete tokens
	_, err = tx.NewDelete().
		Model(new(authtypes.StorableToken)).
		Where("user_id = ?", id).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete tokens")
	}

	err = tx.Commit()
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to commit transaction")
	}

	return nil
}

func (store *store) CreateResetPasswordToken(ctx context.Context, resetPasswordToken *types.ResetPasswordToken) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(resetPasswordToken).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, types.ErrResetPasswordTokenAlreadyExists, "reset password token for password  %s already exists", resetPasswordToken.PasswordID)
	}

	return nil
}

func (store *store) GetPassword(ctx context.Context, id valuer.UUID) (*types.FactorPassword, error) {
	password := new(types.FactorPassword)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(password).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrPasswordNotFound, "password with id: %s does not exist", id)
	}

	return password, nil
}

func (store *store) GetPasswordByUserID(ctx context.Context, userID valuer.UUID) (*types.FactorPassword, error) {
	password := new(types.FactorPassword)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(password).
		Where("user_id = ?", userID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrPasswordNotFound, "password for user %s does not exist", userID)
	}
	return password, nil
}

func (store *store) GetResetPasswordTokenByPasswordID(ctx context.Context, passwordID valuer.UUID) (*types.ResetPasswordToken, error) {
	resetPasswordToken := new(types.ResetPasswordToken)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(resetPasswordToken).
		Where("password_id = ?", passwordID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrResetPasswordTokenNotFound, "reset password token for password %s does not exist", passwordID)
	}

	return resetPasswordToken, nil
}

func (store *store) GetResetPasswordToken(ctx context.Context, token string) (*types.ResetPasswordToken, error) {
	resetPasswordRequest := new(types.ResetPasswordToken)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(resetPasswordRequest).
		Where("token = ?", token).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrResetPasswordTokenNotFound, "reset password token does not exist", token)
	}

	return resetPasswordRequest, nil
}

func (store *store) UpdatePassword(ctx context.Context, factorPassword *types.FactorPassword) error {
	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	_, err = tx.
		NewUpdate().
		Model(factorPassword).
		Where("user_id = ?", factorPassword.UserID).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, types.ErrPasswordNotFound, "password for user %s does not exist", factorPassword.UserID)
	}

	_, err = tx.
		NewDelete().
		Model(&types.ResetPasswordToken{}).
		Where("password_id = ?", factorPassword.ID).
		Exec(ctx)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

// --- API KEY ---
func (store *store) CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error {
	_, err := store.sqlstore.BunDB().NewInsert().
		Model(apiKey).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, types.ErrAPIKeyAlreadyExists, "API key with token: %s already exists", apiKey.Token)
	}

	return nil
}

func (store *store) UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error {
	apiKey.UpdatedBy = updaterID.String()
	apiKey.UpdatedAt = time.Now()
	_, err := store.sqlstore.BunDB().NewUpdate().
		Model(apiKey).
		Column("role", "name", "updated_at", "updated_by").
		Where("id = ?", id).
		Where("revoked = false").
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, types.ErrAPIKeyNotFound, "API key with id: %s does not exist", id)
	}
	return nil
}

func (store *store) ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error) {
	orgUserAPIKeys := new(types.OrgUserAPIKey)

	if err := store.sqlstore.BunDB().NewSelect().
		Model(orgUserAPIKeys).
		Relation("Users").
		Relation("Users.APIKeys", func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.Where("revoked = false")
		},
		).
		Relation("Users.APIKeys.CreatedByUser").
		Relation("Users.APIKeys.UpdatedByUser").
		Where("id = ?", orgID).
		Scan(ctx); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to fetch API keys")
	}

	// Flatten the API keys from all users
	var allAPIKeys []*types.StorableAPIKeyUser
	for _, user := range orgUserAPIKeys.Users {
		if user.APIKeys != nil {
			allAPIKeys = append(allAPIKeys, user.APIKeys...)
		}
	}

	// sort the API keys by updated_at
	sort.Slice(allAPIKeys, func(i, j int) bool {
		return allAPIKeys[i].UpdatedAt.After(allAPIKeys[j].UpdatedAt)
	})

	return allAPIKeys, nil
}

func (store *store) RevokeAPIKey(ctx context.Context, id, revokedByUserID valuer.UUID) error {
	updatedAt := time.Now().Unix()
	_, err := store.sqlstore.BunDB().NewUpdate().
		Model(&types.StorableAPIKey{}).
		Set("revoked = ?", true).
		Set("updated_by = ?", revokedByUserID).
		Set("updated_at = ?", updatedAt).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to revoke API key")
	}
	return nil
}

func (store *store) GetAPIKey(ctx context.Context, orgID, id valuer.UUID) (*types.StorableAPIKeyUser, error) {
	apiKey := new(types.OrgUserAPIKey)
	if err := store.sqlstore.BunDB().NewSelect().
		Model(apiKey).
		Relation("Users").
		Relation("Users.APIKeys", func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.Where("revoked = false").Where("storable_api_key.id = ?", id).
				OrderExpr("storable_api_key.updated_at DESC").Limit(1)
		},
		).
		Relation("Users.APIKeys.CreatedByUser").
		Relation("Users.APIKeys.UpdatedByUser").
		Scan(ctx); err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrAPIKeyNotFound, "API key with id: %s does not exist", id)
	}

	// flatten the API keys
	flattenedAPIKeys := []*types.StorableAPIKeyUser{}
	for _, user := range apiKey.Users {
		if user.APIKeys != nil {
			flattenedAPIKeys = append(flattenedAPIKeys, user.APIKeys...)
		}
	}
	if len(flattenedAPIKeys) == 0 {
		return nil, store.sqlstore.WrapNotFoundErrf(errors.New(errors.TypeNotFound, errors.CodeNotFound, "API key with id: %s does not exist"), types.ErrAPIKeyNotFound, "API key with id: %s does not exist", id)
	}

	return flattenedAPIKeys[0], nil
}

func (store *store) CountByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error) {
	user := new(types.User)

	count, err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(user).
		Where("org_id = ?", orgID).
		Count(ctx)
	if err != nil {
		return 0, err
	}

	return int64(count), nil
}

func (store *store) CountAPIKeyByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error) {
	apiKey := new(types.StorableAPIKey)

	count, err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(apiKey).
		Join("JOIN users ON users.id = storable_api_key.user_id").
		Where("org_id = ?", orgID).
		Count(ctx)
	if err != nil {
		return 0, err
	}

	return int64(count), nil
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}

func (store *store) ListUsersByEmailAndOrgIDs(ctx context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*types.User, error) {
	users := []*types.User{}
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&users).
		Where("email = ?", email).
		Where("org_id IN (?)", bun.In(orgIDs)).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return users, nil
}
