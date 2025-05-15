package impluser

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) types.UserStore {
	return &Store{sqlstore: sqlstore}
}

// CreateBulkInvite implements types.InviteStore.
func (s *Store) CreateBulkInvite(ctx context.Context, invites []*types.Invite) error {
	_, err := s.sqlstore.BunDB().NewInsert().
		Model(&invites).
		Exec(ctx)

	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrInviteAlreadyExists, "invite with email: %s already exists in org: %s", invites[0].Email, invites[0].OrgID)
	}
	return nil
}

// Delete implements types.InviteStore.
func (s *Store) DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error {
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
func (s *Store) GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*types.Invite, error) {
	invite := new(types.Invite)
	err := s.sqlstore.BunDB().NewSelect().
		Model(invite).
		Where("email = ?", email).
		Where("org_id = ?", orgID).
		Scan(ctx)

	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with email: %s does not exist in org: %s", email, orgID)
	}

	return invite, nil
}

func (s *Store) GetInviteByToken(ctx context.Context, token string) (*types.GettableInvite, error) {
	invite := new(types.Invite)
	err := s.sqlstore.BunDB().NewSelect().
		Model(invite).
		Where("token = ?", token).
		Scan(ctx)

	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with token: %s does not exist", token)
	}

	orgName, err := s.getOrgNameByID(ctx, invite.OrgID)
	if err != nil {
		return nil, err
	}

	gettableInvite := &types.GettableInvite{
		Invite:       *invite,
		Organization: orgName,
	}

	return gettableInvite, nil
}

func (s *Store) ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error) {
	invites := new([]*types.Invite)
	err := s.sqlstore.BunDB().NewSelect().
		Model(invites).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrInviteNotFound, "invite with org id: %s does not exist", orgID)
	}
	return *invites, nil
}

func (s *Store) CreatePassword(ctx context.Context, password *types.FactorPassword) (*types.FactorPassword, error) {
	_, err := s.sqlstore.BunDB().NewInsert().
		Model(password).
		Exec(ctx)

	if err != nil {
		return nil, s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrPasswordAlreadyExists, "password with user id: %s already exists", password.UserID)
	}

	return password, nil
}

func (s *Store) CreateUserWithPassword(ctx context.Context, user *types.User, password *types.FactorPassword) (*types.User, error) {
	tx, err := s.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to start transaction")
	}

	defer tx.Rollback()

	if _, err := tx.NewInsert().
		Model(user).
		Exec(ctx); err != nil {
		return nil, s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrUserAlreadyExists, "user with email: %s already exists in org: %s", user.Email, user.OrgID)
	}

	password.UserID = user.ID.StringValue()
	if _, err := tx.NewInsert().
		Model(password).
		Exec(ctx); err != nil {
		return nil, s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrPasswordAlreadyExists, "password with email: %s already exists in org: %s", user.Email, user.OrgID)
	}

	err = tx.Commit()
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to commit transaction")
	}

	return user, nil
}

func (s *Store) CreateUser(ctx context.Context, user *types.User) error {
	_, err := s.sqlstore.BunDB().NewInsert().
		Model(user).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrUserAlreadyExists, "user with email: %s already exists in org: %s", user.Email, user.OrgID)
	}
	return nil
}

func (s *Store) GetDefaultOrgID(ctx context.Context) (string, error) {
	org := new(types.Organization)
	err := s.sqlstore.BunDB().NewSelect().
		Model(org).
		Limit(1).
		Scan(ctx)
	if err != nil {
		return "", s.sqlstore.WrapNotFoundErrf(err, types.ErrOrganizationNotFound, "default org does not exist")
	}
	return org.ID.String(), nil
}

// this is temporary function, we plan to remove this in the next PR.
func (s *Store) getOrgNameByID(ctx context.Context, orgID string) (string, error) {
	org := new(types.Organization)
	err := s.sqlstore.BunDB().NewSelect().
		Model(org).
		Where("id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return "", s.sqlstore.WrapNotFoundErrf(err, types.ErrOrganizationNotFound, "org with id: %s does not exist", orgID)
	}
	return org.DisplayName, nil
}

func (s *Store) GetUserByID(ctx context.Context, orgID string, id string) (*types.GettableUser, error) {
	user := new(types.User)
	err := s.sqlstore.BunDB().NewSelect().
		Model(user).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with id: %s does not exist in org: %s", id, orgID)
	}

	// remove this in next PR
	orgName, err := s.getOrgNameByID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return &types.GettableUser{User: *user, Organization: orgName}, nil
}

func (s *Store) GetUserByEmailInOrg(ctx context.Context, orgID string, email string) (*types.GettableUser, error) {
	user := new(types.User)
	err := s.sqlstore.BunDB().NewSelect().
		Model(user).
		Where("org_id = ?", orgID).
		Where("email = ?", email).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with email: %s does not exist in org: %s", email, orgID)
	}

	// remove this in next PR
	orgName, err := s.getOrgNameByID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return &types.GettableUser{User: *user, Organization: orgName}, nil
}

func (s *Store) GetUsersByEmail(ctx context.Context, email string) ([]*types.GettableUser, error) {
	users := new([]*types.User)
	err := s.sqlstore.BunDB().NewSelect().
		Model(users).
		Where("email = ?", email).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with email: %s does not exist", email)
	}

	// remove this in next PR
	usersWithOrg := []*types.GettableUser{}
	for _, user := range *users {
		orgName, err := s.getOrgNameByID(ctx, user.OrgID)
		if err != nil {
			return nil, err
		}
		usersWithOrg = append(usersWithOrg, &types.GettableUser{User: *user, Organization: orgName})
	}
	return usersWithOrg, nil
}

func (s *Store) GetUsersByRoleInOrg(ctx context.Context, orgID string, role types.Role) ([]*types.GettableUser, error) {
	users := new([]*types.User)
	err := s.sqlstore.BunDB().NewSelect().
		Model(users).
		Where("org_id = ?", orgID).
		Where("role = ?", role).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with role: %s does not exist in org: %s", role, orgID)
	}

	// remove this in next PR
	orgName, err := s.getOrgNameByID(ctx, orgID)
	if err != nil {
		return nil, err
	}
	usersWithOrg := []*types.GettableUser{}
	for _, user := range *users {
		usersWithOrg = append(usersWithOrg, &types.GettableUser{User: *user, Organization: orgName})
	}
	return usersWithOrg, nil
}

func (s *Store) UpdateUser(ctx context.Context, orgID string, id string, user *types.User) (*types.User, error) {
	user.UpdatedAt = time.Now()
	_, err := s.sqlstore.BunDB().NewUpdate().
		Model(user).
		Column("display_name").
		Column("role").
		Column("updated_at").
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "user with id: %s does not exist in org: %s", id, orgID)
	}
	return user, nil
}

func (s *Store) ListUsers(ctx context.Context, orgID string) ([]*types.GettableUser, error) {
	users := []*types.User{}
	err := s.sqlstore.BunDB().NewSelect().
		Model(&users).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrUserNotFound, "users with org id: %s does not exist", orgID)
	}

	// remove this in next PR
	orgName, err := s.getOrgNameByID(ctx, orgID)
	if err != nil {
		return nil, err
	}
	usersWithOrg := []*types.GettableUser{}
	for _, user := range users {
		usersWithOrg = append(usersWithOrg, &types.GettableUser{User: *user, Organization: orgName})
	}
	return usersWithOrg, nil
}

func (s *Store) DeleteUser(ctx context.Context, orgID string, id string) error {

	tx, err := s.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to start transaction")
	}

	defer tx.Rollback()

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
		Model(new(types.ResetPasswordRequest)).
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

	// delete user
	_, err = tx.NewDelete().
		Model(new(types.User)).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete user")
	}

	err = tx.Commit()
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to commit transaction")
	}

	return nil
}

func (s *Store) CreateResetPasswordToken(ctx context.Context, resetPasswordRequest *types.ResetPasswordRequest) error {
	_, err := s.sqlstore.BunDB().NewInsert().
		Model(resetPasswordRequest).
		Exec(ctx)

	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrResetPasswordTokenAlreadyExists, "reset password token with password id: %s already exists", resetPasswordRequest.PasswordID)
	}
	return nil
}

func (s *Store) GetPasswordByID(ctx context.Context, id string) (*types.FactorPassword, error) {
	password := new(types.FactorPassword)
	err := s.sqlstore.BunDB().NewSelect().
		Model(password).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrPasswordNotFound, "password with id: %s does not exist", id)
	}
	return password, nil
}

func (s *Store) GetPasswordByUserID(ctx context.Context, id string) (*types.FactorPassword, error) {
	password := new(types.FactorPassword)
	err := s.sqlstore.BunDB().NewSelect().
		Model(password).
		Where("user_id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrPasswordNotFound, "password with user id: %s does not exist", id)
	}
	return password, nil
}

func (s *Store) GetResetPasswordByPasswordID(ctx context.Context, passwordID string) (*types.ResetPasswordRequest, error) {
	resetPasswordRequest := new(types.ResetPasswordRequest)
	err := s.sqlstore.BunDB().NewSelect().
		Model(resetPasswordRequest).
		Where("password_id = ?", passwordID).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrResetPasswordTokenNotFound, "reset password token with password id: %s does not exist", passwordID)
	}
	return resetPasswordRequest, nil
}

func (s *Store) GetResetPassword(ctx context.Context, token string) (*types.ResetPasswordRequest, error) {
	resetPasswordRequest := new(types.ResetPasswordRequest)
	err := s.sqlstore.BunDB().NewSelect().
		Model(resetPasswordRequest).
		Where("token = ?", token).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrResetPasswordTokenNotFound, "reset password token with token: %s does not exist", token)
	}
	return resetPasswordRequest, nil
}

func (s *Store) UpdatePasswordAndDeleteResetPasswordEntry(ctx context.Context, userID string, password string) error {
	tx, err := s.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to start transaction")
	}

	defer tx.Rollback()

	factorPassword := &types.FactorPassword{
		UserID:   userID,
		Password: password,
		TimeAuditable: types.TimeAuditable{
			UpdatedAt: time.Now(),
		},
	}
	_, err = tx.NewUpdate().
		Model(factorPassword).
		Column("password").
		Column("updated_at").
		Where("user_id = ?", userID).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapNotFoundErrf(err, types.ErrPasswordNotFound, "password with user id: %s does not exist", userID)
	}

	_, err = tx.NewDelete().
		Model(&types.ResetPasswordRequest{}).
		Where("password_id = ?", userID).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapNotFoundErrf(err, types.ErrResetPasswordTokenNotFound, "reset password token with password id: %s does not exist", userID)
	}

	err = tx.Commit()
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to commit transaction")
	}

	return nil
}

func (s *Store) UpdatePassword(ctx context.Context, userID string, password string) error {
	factorPassword := &types.FactorPassword{
		UserID:   userID,
		Password: password,
		TimeAuditable: types.TimeAuditable{
			UpdatedAt: time.Now(),
		},
	}
	_, err := s.sqlstore.BunDB().NewUpdate().
		Model(factorPassword).
		Column("password").
		Column("updated_at").
		Where("user_id = ?", userID).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapNotFoundErrf(err, types.ErrPasswordNotFound, "password with user id: %s does not exist", userID)
	}
	return nil
}

func (s *Store) GetDomainByName(ctx context.Context, name string) (*types.StorableOrgDomain, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not supported")
}
