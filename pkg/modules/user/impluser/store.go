package impluser

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
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

	defer func() {
		_ = tx.Rollback()
	}()

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

	defer func() {
		_ = tx.Rollback()
	}()

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
	domain := new(types.StorableOrgDomain)
	err := s.sqlstore.BunDB().NewSelect().
		Model(domain).
		Where("name = ?", name).
		Limit(1).
		Scan(ctx)

	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeNotFound, errors.CodeNotFound, "failed to get domain from name")
	}
	return domain, nil
}

// --- API KEY ---
func (s *Store) CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error {
	_, err := s.sqlstore.BunDB().NewInsert().
		Model(apiKey).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, types.ErrAPIKeyAlreadyExists, "API key with token: %s already exists", apiKey.Token)
	}

	return nil
}

func (s *Store) UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error {
	apiKey.UpdatedBy = updaterID.String()
	apiKey.UpdatedAt = time.Now()
	_, err := s.sqlstore.BunDB().NewUpdate().
		Model(apiKey).
		Column("role", "name", "updated_at", "updated_by").
		Where("id = ?", id).
		Where("revoked = false").
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapNotFoundErrf(err, types.ErrAPIKeyNotFound, "API key with id: %s does not exist", id)
	}
	return nil
}

func (s *Store) ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error) {
	orgUserAPIKeys := new(types.OrgUserAPIKey)

	if err := s.sqlstore.BunDB().NewSelect().
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

func (s *Store) RevokeAPIKey(ctx context.Context, id, revokedByUserID valuer.UUID) error {
	updatedAt := time.Now().Unix()
	_, err := s.sqlstore.BunDB().NewUpdate().
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

func (s *Store) GetAPIKey(ctx context.Context, orgID, id valuer.UUID) (*types.StorableAPIKeyUser, error) {
	apiKey := new(types.OrgUserAPIKey)
	if err := s.sqlstore.BunDB().NewSelect().
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
		return nil, s.sqlstore.WrapNotFoundErrf(err, types.ErrAPIKeyNotFound, "API key with id: %s does not exist", id)
	}

	// flatten the API keys
	flattenedAPIKeys := []*types.StorableAPIKeyUser{}
	for _, user := range apiKey.Users {
		if user.APIKeys != nil {
			flattenedAPIKeys = append(flattenedAPIKeys, user.APIKeys...)
		}
	}
	if len(flattenedAPIKeys) == 0 {
		return nil, s.sqlstore.WrapNotFoundErrf(errors.New(errors.TypeNotFound, errors.CodeNotFound, "API key with id: %s does not exist"), types.ErrAPIKeyNotFound, "API key with id: %s does not exist", id)
	}

	return flattenedAPIKeys[0], nil
}

// GetDomainFromSsoResponse uses relay state received from IdP to fetch
// user domain. The domain is further used to process validity of the response.
// when sending login request to IdP we send relay state as URL (site url)
// with domainId or domainName as query parameter.
func (s *Store) GetDomainFromSsoResponse(ctx context.Context, relayState *url.URL) (*types.GettableOrgDomain, error) {
	// derive domain id from relay state now
	var domainIdStr string
	var domainNameStr string
	var domain *types.GettableOrgDomain

	for k, v := range relayState.Query() {
		if k == "domainId" && len(v) > 0 {
			domainIdStr = strings.Replace(v[0], ":", "-", -1)
		}
		if k == "domainName" && len(v) > 0 {
			domainNameStr = v[0]
		}
	}

	if domainIdStr != "" {
		domainId, err := uuid.Parse(domainIdStr)
		if err != nil {
			zap.L().Error("failed to parse domainId from relay state", zap.Error(err))
			return nil, fmt.Errorf("failed to parse domainId from IdP response")
		}

		domain, err = s.GetDomain(ctx, domainId)
		if err != nil {
			zap.L().Error("failed to find domain from domainId received in IdP response", zap.Error(err))
			return nil, fmt.Errorf("invalid credentials")
		}
	}

	if domainNameStr != "" {

		domainFromDB, err := s.GetGettableDomainByName(ctx, domainNameStr)
		domain = domainFromDB
		if err != nil {
			zap.L().Error("failed to find domain from domainName received in IdP response", zap.Error(err))
			return nil, fmt.Errorf("invalid credentials")
		}
	}
	if domain != nil {
		return domain, nil
	}

	return nil, fmt.Errorf("failed to find domain received in IdP response")
}

// GetDomainByName returns org domain for a given domain name
func (s *Store) GetGettableDomainByName(ctx context.Context, name string) (*types.GettableOrgDomain, error) {

	stored := types.StorableOrgDomain{}
	err := s.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Where("name = ?", name).
		Limit(1).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, model.BadRequest(fmt.Errorf("invalid domain name"))
		}
		return nil, model.InternalError(err)
	}

	domain := &types.GettableOrgDomain{StorableOrgDomain: stored}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}

// GetDomain returns org domain for a given domain id
func (s *Store) GetDomain(ctx context.Context, id uuid.UUID) (*types.GettableOrgDomain, error) {

	stored := types.StorableOrgDomain{}
	err := s.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Where("id = ?", id).
		Limit(1).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, model.BadRequest(fmt.Errorf("invalid domain id"))
		}
		return nil, model.InternalError(err)
	}

	domain := &types.GettableOrgDomain{StorableOrgDomain: stored}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}

// ListDomains gets the list of auth domains by org id
func (s *Store) ListDomains(ctx context.Context, orgId valuer.UUID) ([]*types.GettableOrgDomain, error) {
	domains := make([]*types.GettableOrgDomain, 0)

	stored := []types.StorableOrgDomain{}
	err := s.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Where("org_id = ?", orgId).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return domains, nil
		}
		return nil, model.InternalError(err)
	}

	for _, s := range stored {
		domain := types.GettableOrgDomain{StorableOrgDomain: s}
		if err := domain.LoadConfig(s.Data); err != nil {
			zap.L().Error("ListDomains() failed", zap.Error(err))
		}
		domains = append(domains, &domain)
	}

	return domains, nil
}

// CreateDomain creates  a new auth domain
func (s *Store) CreateDomain(ctx context.Context, domain *types.GettableOrgDomain) error {

	if domain.ID == uuid.Nil {
		domain.ID = uuid.New()
	}

	if domain.OrgID == "" || domain.Name == "" {
		return model.BadRequest(fmt.Errorf("domain creation failed, missing fields: OrgID, Name "))
	}

	configJson, err := json.Marshal(domain)
	if err != nil {
		zap.L().Error("failed to unmarshal domain config", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain creation failed"))
	}

	storableDomain := types.StorableOrgDomain{
		ID:            domain.ID,
		Name:          domain.Name,
		OrgID:         domain.OrgID,
		Data:          string(configJson),
		TimeAuditable: types.TimeAuditable{CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	_, err = s.sqlstore.BunDB().NewInsert().
		Model(&storableDomain).
		Exec(ctx)

	if err != nil {
		zap.L().Error("failed to insert domain in db", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain creation failed"))
	}

	return nil
}

// UpdateDomain updates stored config params for a domain
func (s *Store) UpdateDomain(ctx context.Context, domain *types.GettableOrgDomain) error {

	if domain.ID == uuid.Nil {
		zap.L().Error("domain update failed", zap.Error(fmt.Errorf("OrgDomain.Id is null")))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	configJson, err := json.Marshal(domain)
	if err != nil {
		zap.L().Error("domain update failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	storableDomain := &types.StorableOrgDomain{
		ID:            domain.ID,
		Name:          domain.Name,
		OrgID:         domain.OrgID,
		Data:          string(configJson),
		TimeAuditable: types.TimeAuditable{UpdatedAt: time.Now()},
	}

	_, err = s.sqlstore.BunDB().NewUpdate().
		Model(storableDomain).
		Column("data", "updated_at").
		WherePK().
		Exec(ctx)

	if err != nil {
		zap.L().Error("domain update failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	return nil
}

// DeleteDomain deletes an org domain
func (s *Store) DeleteDomain(ctx context.Context, id uuid.UUID) error {

	if id == uuid.Nil {
		zap.L().Error("domain delete failed", zap.Error(fmt.Errorf("OrgDomain.Id is null")))
		return model.InternalError(fmt.Errorf("domain delete failed"))
	}

	storableDomain := &types.StorableOrgDomain{ID: id}
	_, err := s.sqlstore.BunDB().NewDelete().
		Model(storableDomain).
		WherePK().
		Exec(ctx)

	if err != nil {
		zap.L().Error("domain delete failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain delete failed"))
	}

	return nil
}

func (s *Store) GetDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, error) {

	if email == "" {
		return nil, model.BadRequest(fmt.Errorf("could not find auth domain, missing fields: email "))
	}

	components := strings.Split(email, "@")
	if len(components) < 2 {
		return nil, model.BadRequest(fmt.Errorf("invalid email address"))
	}

	parsedDomain := components[1]

	stored := types.StorableOrgDomain{}
	err := s.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Where("name = ?", parsedDomain).
		Limit(1).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, model.InternalError(err)
	}

	domain := &types.GettableOrgDomain{StorableOrgDomain: stored}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}
