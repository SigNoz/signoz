package impluser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) types.UserStore {
	return &store{sqlstore: sqlstore}
}

// CreateBulkInvite implements types.InviteStore.
func (s *store) CreateBulkInvite(ctx context.Context, invites []*types.Invite) error {
	_, err := s.sqlstore.BunDB().NewInsert().
		Model(invites).
		Exec(ctx)

	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrInviteAlreadyExists, "invite with email: %s already exists in org: %s", invites[0].Email, invites[0].OrgID)
	}
	return nil
}

// Delete implements types.InviteStore.
func (s *store) DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error {
	_, err := s.sqlstore.BunDB().NewDelete().
		Model(&types.Invite{}).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with id: %s does not exist in org: %s", id.StringValue(), orgID)
	}
	return nil
}

// GetInviteByEmailInOrg implements types.InviteStore.
func (s *store) GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*types.Invite, error) {
	var invite types.Invite
	err := s.sqlstore.BunDB().NewSelect().
		Model(&invite).
		Where("email = ?", email).
		Where("org_id = ?", orgID).
		Scan(ctx)

	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with email: %s does not exist in org: %s", email, orgID)
	}

	return &invite, nil
}

func (s *store) GetInviteByToken(ctx context.Context, token string) (*types.Invite, error) {
	var invite types.Invite
	err := s.sqlstore.BunDB().NewSelect().
		Model(&invite).
		Where("token = ?", token).
		Scan(ctx)

	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with token: %s does not exist", token)
	}

	return &invite, nil
}

func (s *store) ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error) {
	invites := []*types.Invite{}
	err := s.sqlstore.BunDB().NewSelect().
		Model(&invites).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with org id: %s does not exist", orgID)
	}
	return invites, nil
}

func (s *store) CreateUserWithPassword(ctx context.Context, user *types.User, password *types.FactorPassword) (*types.User, error) {
	tx, err := s.sqlstore.BunDB().Begin()
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to start transaction")
	}

	defer func() {
		if err != nil {
			tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	if _, err := tx.NewInsert().
		Model(user).
		Exec(ctx); err != nil {
		return nil, s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrUserAlreadyExists, "user with email: %s already exists in org: %s", user.Email, user.OrgID)
	}

	if _, err := tx.NewInsert().
		Model(password).
		Exec(ctx); err != nil {
		return nil, s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrPasswordAlreadyExists, "password with email: %s already exists in org: %s", user.Email, user.OrgID)
	}

	return user, nil
}

func (s *store) GetUserByID(ctx context.Context, orgID string, id string) (*types.User, error) {
	var user types.User
	err := s.sqlstore.BunDB().NewSelect().
		Model(&user).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with id: %s does not exist in org: %s", id, orgID)
	}
	return &user, nil
}

func (s *store) GetUsersByEmail(ctx context.Context, email string) ([]*types.User, error) {
	var users []*types.User
	err := s.sqlstore.BunDB().NewSelect().
		Model(&users).
		Where("email = ?", email).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with email: %s does not exist", email)
	}
	return users, nil
}

func (s *store) UpdateUser(ctx context.Context, orgID string, id string, user *types.User) (*types.User, error) {
	_, err := s.sqlstore.BunDB().NewUpdate().
		Model(user).
		Column("h_name", "profile_picture_url").
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with id: %s does not exist in org: %s", id, orgID)
	}
	return user, nil
}

func (s *store) ListUsers(ctx context.Context, orgID string) ([]*types.User, error) {
	users := []*types.User{}
	err := s.sqlstore.BunDB().NewSelect().
		Model(&users).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "users with org id: %s does not exist", orgID)
	}
	return users, nil
}

func (s *store) DeleteUser(ctx context.Context, orgID string, id string) error {
	_, err := s.sqlstore.BunDB().NewDelete().
		Model(&types.User{}).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with id: %s does not exist in org: %s", id, orgID)
	}
	return nil
}

func (s *store) CreateResetPasswordToken(ctx context.Context, resetPasswordRequest *types.FactorResetPasswordRequest) error {
	_, err := s.sqlstore.BunDB().NewInsert().
		Model(resetPasswordRequest).
		Exec(ctx)

	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrResetPasswordTokenAlreadyExists, "reset password token with password id: %s already exists", resetPasswordRequest.PasswordID)
	}
	return nil
}

func (s *store) GetPasswordByUserID(ctx context.Context, id string) (*types.FactorPassword, error) {
	var password types.FactorPassword
	err := s.sqlstore.BunDB().NewSelect().
		Model(&password).
		Where("user_id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrPasswordNotFound, "password with user id: %s does not exist", id)
	}
	return &password, nil
}
