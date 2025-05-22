package impluser

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"slices"
	"text/template"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	smtpservice "github.com/SigNoz/signoz/pkg/query-service/utils/smtpService"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"
)

type Module struct {
	store types.UserStore
	JWT   *authtypes.JWT
}

// This module is a WIP, don't take inspiration from this.
func NewModule(store types.UserStore) user.Module {
	jwtSecret := os.Getenv("SIGNOZ_JWT_SECRET")
	jwt := authtypes.NewJWT(jwtSecret, 30*time.Minute, 30*24*time.Hour)
	return &Module{store: store, JWT: jwt}
}

// CreateBulk implements invite.Module.
func (m *Module) CreateBulkInvite(ctx context.Context, orgID, userID string, bulkInvites *types.PostableBulkInviteRequest) ([]*types.Invite, error) {
	creator, err := m.GetUserByID(ctx, orgID, userID)
	if err != nil {
		return nil, err
	}

	invites := make([]*types.Invite, 0, len(bulkInvites.Invites))

	for _, invite := range bulkInvites.Invites {
		// check if user exists
		existingUser, err := m.GetUserByEmailInOrg(ctx, orgID, invite.Email)
		if err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
		if existingUser != nil {
			return nil, errors.New(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "User already exists with the same email")
		}

		// Check if an invite already exists
		existingInvite, err := m.GetInviteByEmailInOrg(ctx, orgID, invite.Email)
		if err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
		if existingInvite != nil {
			return nil, errors.New(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "An invite already exists for this email")
		}

		role, err := types.NewRole(invite.Role.String())
		if err != nil {
			return nil, err
		}

		newInvite, err := types.NewInvite(orgID, role.String(), invite.Name, invite.Email)
		if err != nil {
			return nil, err
		}
		newInvite.InviteLink = fmt.Sprintf("%s/signup?token=%s", invite.FrontendBaseUrl, newInvite.Token)
		invites = append(invites, newInvite)
	}

	err = m.store.CreateBulkInvite(ctx, invites)
	if err != nil {
		return nil, err
	}

	// send telemetry event
	for i := 0; i < len(invites); i++ {
		telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER_INVITATION_SENT, map[string]interface{}{
			"invited user email": invites[i].Email,
		}, creator.Email, true, false)

		// send email if SMTP is enabled
		if os.Getenv("SMTP_ENABLED") == "true" && bulkInvites.Invites[i].FrontendBaseUrl != "" {
			m.inviteEmail(&bulkInvites.Invites[i], creator.Email, creator.DisplayName, invites[i].Token)
		}
	}

	return invites, nil
}

func (m *Module) inviteEmail(req *types.PostableInvite, creatorEmail, creatorName, token string) {
	smtp := smtpservice.GetInstance()
	data := types.InviteEmailData{
		CustomerName: req.Name,
		InviterName:  creatorName,
		InviterEmail: creatorEmail,
		Link:         fmt.Sprintf("%s/signup?token=%s", req.FrontendBaseUrl, token),
	}

	tmpl, err := template.ParseFiles(constants.InviteEmailTemplate)
	if err != nil {
		zap.L().Error("failed to send email", zap.Error(err))
		return
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		zap.L().Error("failed to send email", zap.Error(err))
		return
	}

	err = smtp.SendEmail(
		req.Email,
		creatorName+" has invited you to their team in SigNoz",
		body.String(),
	)
	if err != nil {
		zap.L().Error("failed to send email", zap.Error(err))
		return
	}
}

func (m *Module) ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error) {
	return m.store.ListInvite(ctx, orgID)
}

func (m *Module) DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error {
	return m.store.DeleteInvite(ctx, orgID, id)
}

func (m *Module) GetInviteByToken(ctx context.Context, token string) (*types.GettableInvite, error) {
	return m.store.GetInviteByToken(ctx, token)
}

func (m *Module) GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*types.Invite, error) {
	return m.store.GetInviteByEmailInOrg(ctx, orgID, email)
}

func (m *Module) CreateUserWithPassword(ctx context.Context, user *types.User, password *types.FactorPassword) (*types.User, error) {

	user, err := m.store.CreateUserWithPassword(ctx, user, password)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (m *Module) CreateUser(ctx context.Context, user *types.User) error {
	return m.store.CreateUser(ctx, user)
}

func (m *Module) GetUserByID(ctx context.Context, orgID string, id string) (*types.GettableUser, error) {
	return m.store.GetUserByID(ctx, orgID, id)
}

func (m *Module) GetUserByEmailInOrg(ctx context.Context, orgID string, email string) (*types.GettableUser, error) {
	return m.store.GetUserByEmailInOrg(ctx, orgID, email)
}

func (m *Module) GetUsersByEmail(ctx context.Context, email string) ([]*types.GettableUser, error) {
	return m.store.GetUsersByEmail(ctx, email)
}

func (m *Module) GetUsersByRoleInOrg(ctx context.Context, orgID string, role types.Role) ([]*types.GettableUser, error) {
	return m.store.GetUsersByRoleInOrg(ctx, orgID, role)
}

func (m *Module) ListUsers(ctx context.Context, orgID string) ([]*types.GettableUser, error) {
	return m.store.ListUsers(ctx, orgID)
}

func (m *Module) UpdateUser(ctx context.Context, orgID string, id string, user *types.User) (*types.User, error) {
	return m.store.UpdateUser(ctx, orgID, id, user)
}

func (m *Module) DeleteUser(ctx context.Context, orgID string, id string) error {
	user, err := m.store.GetUserByID(ctx, orgID, id)
	if err != nil {
		return err
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(user.Email)) {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "integration user cannot be deleted")
	}

	// don't allow to delete the last admin user
	adminUsers, err := m.GetUsersByRoleInOrg(ctx, orgID, types.RoleAdmin)
	if err != nil {
		return err
	}

	if len(adminUsers) == 1 && user.Role == types.RoleAdmin.String() {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot delete the last admin")
	}

	return m.store.DeleteUser(ctx, orgID, user.ID.StringValue())
}

func (m *Module) CreateResetPasswordToken(ctx context.Context, userID string) (*types.ResetPasswordRequest, error) {
	password, err := m.store.GetPasswordByUserID(ctx, userID)
	if err != nil {
		// if the user does not have a password, we need to create a new one
		// this will happen for SSO users
		if errors.Ast(err, errors.TypeNotFound) {
			password, err = m.store.CreatePassword(ctx, &types.FactorPassword{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
				},
				Password: valuer.GenerateUUID().String(),
				UserID:   userID,
			})
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	resetPasswordRequest, err := types.NewResetPasswordRequest(password.ID.StringValue())
	if err != nil {
		return nil, err
	}

	// check if a reset password token already exists for this user
	existingRequest, err := m.store.GetResetPasswordByPasswordID(ctx, resetPasswordRequest.PasswordID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if existingRequest != nil {
		return existingRequest, nil
	}

	err = m.store.CreateResetPasswordToken(ctx, resetPasswordRequest)
	if err != nil {
		return nil, err
	}

	return resetPasswordRequest, nil
}

func (m *Module) GetPasswordByUserID(ctx context.Context, id string) (*types.FactorPassword, error) {
	return m.store.GetPasswordByUserID(ctx, id)
}

func (m *Module) GetResetPassword(ctx context.Context, token string) (*types.ResetPasswordRequest, error) {
	return m.store.GetResetPassword(ctx, token)
}

func (m *Module) UpdatePasswordAndDeleteResetPasswordEntry(ctx context.Context, passwordID string, password string) error {
	hashedPassword, err := types.HashPassword(password)
	if err != nil {
		return err
	}

	existingPassword, err := m.store.GetPasswordByID(ctx, passwordID)
	if err != nil {
		return err
	}

	return m.store.UpdatePasswordAndDeleteResetPasswordEntry(ctx, existingPassword.UserID, hashedPassword)
}

func (m *Module) UpdatePassword(ctx context.Context, userID string, password string) error {
	hashedPassword, err := types.HashPassword(password)
	if err != nil {
		return err
	}
	return m.store.UpdatePassword(ctx, userID, hashedPassword)
}

func (m *Module) GetAuthenticatedUser(ctx context.Context, orgID, email, password, refreshToken string) (*types.User, error) {
	if refreshToken != "" {
		// parse the refresh token
		claims, err := m.JWT.Claims(refreshToken)
		if err != nil {
			return nil, err
		}

		user, err := m.store.GetUserByID(ctx, claims.OrgID, claims.UserID)
		if err != nil {
			return nil, err
		}
		return &user.User, nil
	}

	var dbUser *types.User

	// when the orgID is provided
	if orgID != "" {
		user, err := m.store.GetUserByEmailInOrg(ctx, orgID, email)
		if err != nil {
			return nil, err
		}
		dbUser = &user.User
	}

	// when the orgID is not provided we login if the user exists in just one org
	user, err := m.store.GetUsersByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if len(user) == 0 {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "user with email: %s does not exist", email)
	} else if len(user) == 1 {
		dbUser = &user[0].User
	} else {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "please provide an orgID")
	}

	existingPassword, err := m.store.GetPasswordByUserID(ctx, dbUser.ID.StringValue())
	if err != nil {
		return nil, err
	}

	if !types.ComparePassword(existingPassword.Password, password) {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid password")
	}

	return dbUser, nil
}

func (m *Module) LoginPrecheck(ctx context.Context, orgID, email, sourceUrl string) (*types.GettableLoginPrecheck, error) {
	// assume user is valid unless proven otherwise and assign default values for rest of the fields
	resp := &types.GettableLoginPrecheck{IsUser: true, CanSelfRegister: false, SSO: false, SSOUrl: "", SSOError: ""}

	// check if email is a valid user
	users, err := m.GetUsersByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		resp.IsUser = false
	}

	if len(users) > 1 {
		resp.SelectOrg = true
		resp.Orgs = make([]string, len(users))
		for i, user := range users {
			resp.Orgs[i] = user.OrgID
		}
	}

	return resp, nil
}

func (m *Module) GetJWTForUser(ctx context.Context, user *types.User) (types.GettableUserJwt, error) {
	role, err := types.NewRole(user.Role)
	if err != nil {
		return types.GettableUserJwt{}, err
	}

	accessJwt, accessClaims, err := m.JWT.AccessToken(user.OrgID, user.ID.String(), user.Email, role)
	if err != nil {
		return types.GettableUserJwt{}, err
	}

	refreshJwt, refreshClaims, err := m.JWT.RefreshToken(user.OrgID, user.ID.String(), user.Email, role)
	if err != nil {
		return types.GettableUserJwt{}, err
	}

	return types.GettableUserJwt{
		AccessJwt:        accessJwt,
		RefreshJwt:       refreshJwt,
		AccessJwtExpiry:  accessClaims.ExpiresAt.Unix(),
		RefreshJwtExpiry: refreshClaims.ExpiresAt.Unix(),
	}, nil
}

func (m *Module) CreateUserForSAMLRequest(ctx context.Context, email string) (*types.User, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "SAML login is not supported")
}

func (m *Module) PrepareSsoRedirect(ctx context.Context, redirectUri, email string, jwt *authtypes.JWT) (string, error) {
	return "", errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "SSO is not supported")
}

func (m *Module) CanUsePassword(ctx context.Context, email string) (bool, error) {
	return false, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "SSO is not supported")
}

func (m *Module) GetAuthDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "SSO is not supported")
}

func (m *Module) CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error {
	return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "API Keys are not supported")
}

func (m *Module) UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "API Keys are not supported")
}

func (m *Module) ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "API Keys are not supported")
}

func (m *Module) GetAPIKey(ctx context.Context, orgID, id valuer.UUID) (*types.StorableAPIKeyUser, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "API Keys are not supported")
}

func (m *Module) RevokeAPIKey(ctx context.Context, id, removedByUserID valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "API Keys are not supported")
}
