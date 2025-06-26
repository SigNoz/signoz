package impluser

import (
	"context"
	"fmt"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
)

type Module struct {
	store     types.UserStore
	jwt       *authtypes.JWT
	emailing  emailing.Emailing
	settings  factory.ScopedProviderSettings
	orgSetter organization.Setter
	analytics analytics.Analytics
}

// This module is a WIP, don't take inspiration from this.
func NewModule(store types.UserStore, jwt *authtypes.JWT, emailing emailing.Emailing, providerSettings factory.ProviderSettings, orgSetter organization.Setter, analytics analytics.Analytics) user.Module {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/user/impluser")
	return &Module{
		store:     store,
		jwt:       jwt,
		emailing:  emailing,
		settings:  settings,
		orgSetter: orgSetter,
		analytics: analytics,
	}
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
		m.analytics.TrackUser(ctx, orgID, creator.ID.String(), "Invite Sent", map[string]any{"invitee_email": invites[i].Email, "invitee_role": invites[i].Role})

		if err := m.emailing.SendHTML(ctx, invites[i].Email, "You are invited to join a team in SigNoz", emailtypes.TemplateNameInvitationEmail, map[string]any{
			"CustomerName": invites[i].Name,
			"InviterName":  creator.DisplayName,
			"InviterEmail": creator.Email,
			"Link":         fmt.Sprintf("%s/signup?token=%s", bulkInvites.Invites[i].FrontendBaseUrl, invites[i].Token),
		}); err != nil {
			m.settings.Logger().ErrorContext(ctx, "failed to send email", "error", err)
		}

	}

	return invites, nil
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

	traitsOrProperties := types.NewTraitsFromUser(user)
	m.analytics.IdentifyUser(ctx, user.OrgID, user.ID.String(), traitsOrProperties)
	m.analytics.TrackUser(ctx, user.OrgID, user.ID.String(), "User Created", traitsOrProperties)

	return user, nil
}

func (m *Module) CreateUser(ctx context.Context, user *types.User) error {
	if err := m.store.CreateUser(ctx, user); err != nil {
		return err
	}

	traitsOrProperties := types.NewTraitsFromUser(user)
	m.analytics.IdentifyUser(ctx, user.OrgID, user.ID.String(), traitsOrProperties)
	m.analytics.TrackUser(ctx, user.OrgID, user.ID.String(), "User Created", traitsOrProperties)

	return nil
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

func (m *Module) UpdateUser(ctx context.Context, orgID string, id string, user *types.User, updatedBy string) (*types.User, error) {
	user, err := m.store.UpdateUser(ctx, orgID, id, user)
	if err != nil {
		return nil, err
	}

	traits := types.NewTraitsFromUser(user)
	m.analytics.IdentifyUser(ctx, user.OrgID, user.ID.String(), traits)

	traits["updated_by"] = updatedBy
	m.analytics.TrackUser(ctx, user.OrgID, user.ID.String(), "User Updated", traits)

	return user, nil
}

func (m *Module) DeleteUser(ctx context.Context, orgID string, id string, deletedBy string) error {
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

	if err := m.store.DeleteUser(ctx, orgID, user.ID.StringValue()); err != nil {
		return err
	}

	m.analytics.TrackUser(ctx, user.OrgID, user.ID.String(), "User Deleted", map[string]any{
		"deleted_by": deletedBy,
	})

	return nil
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
		claims, err := m.jwt.Claims(refreshToken)
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
	// when the orgID is not provided we login if the user exists in just one org
	users, err := m.store.GetUsersByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "user with email: %s does not exist", email)
	} else if len(users) == 1 {
		dbUser = &users[0].User
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

	// TODO(Nitya): in multitenancy this should use orgId as well.
	orgDomain, err := m.GetAuthDomainByEmail(ctx, email)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if orgDomain != nil && orgDomain.SsoEnabled {
		// this is to allow self registration
		resp.IsUser = true

		// saml is enabled for this domain, lets prepare sso url
		if sourceUrl == "" {
			sourceUrl = constants.GetDefaultSiteURL()
		}

		// parse source url that generated the login request
		var err error
		escapedUrl, _ := url.QueryUnescape(sourceUrl)
		siteUrl, err := url.Parse(escapedUrl)
		if err != nil {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse referer")
		}

		// build Idp URL that will authenticat the user
		// the front-end will redirect user to this url
		resp.SSOUrl, err = orgDomain.BuildSsoUrl(siteUrl)
		if err != nil {
			m.settings.Logger().ErrorContext(ctx, "failed to prepare saml request for domain", "domain", orgDomain.Name, "error", err)
			return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to prepare saml request for domain")
		}

		// set SSO to true, as the url is generated correctly
		resp.SSO = true
	}

	return resp, nil
}

func (m *Module) GetJWTForUser(ctx context.Context, user *types.User) (types.GettableUserJwt, error) {
	role, err := types.NewRole(user.Role)
	if err != nil {
		return types.GettableUserJwt{}, err
	}

	accessJwt, accessClaims, err := m.jwt.AccessToken(user.OrgID, user.ID.String(), user.Email, role)
	if err != nil {
		return types.GettableUserJwt{}, err
	}

	refreshJwt, refreshClaims, err := m.jwt.RefreshToken(user.OrgID, user.ID.String(), user.Email, role)
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
	// get auth domain from email domain
	_, err := m.GetAuthDomainByEmail(ctx, email)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	// get name from email
	parts := strings.Split(email, "@")
	if len(parts) < 2 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid email format")
	}
	name := parts[0]

	defaultOrgID, err := m.store.GetDefaultOrgID(ctx)
	if err != nil {
		return nil, err
	}

	user, err := types.NewUser(name, email, types.RoleViewer.String(), defaultOrgID)
	if err != nil {
		return nil, err
	}

	err = m.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil

}

func (m *Module) PrepareSsoRedirect(ctx context.Context, redirectUri, email string) (string, error) {
	users, err := m.GetUsersByEmail(ctx, email)
	if err != nil {
		m.settings.Logger().ErrorContext(ctx, "failed to get user with email received from auth provider", "error", err)
		return "", err
	}
	user := &types.User{}

	if len(users) == 0 {
		newUser, err := m.CreateUserForSAMLRequest(ctx, email)
		user = newUser
		if err != nil {
			m.settings.Logger().ErrorContext(ctx, "failed to create user with email received from auth provider", "error", err)
			return "", err
		}
	} else {
		user = &users[0].User
	}

	tokenStore, err := m.GetJWTForUser(ctx, user)
	if err != nil {
		m.settings.Logger().ErrorContext(ctx, "failed to generate token for SSO login user", "error", err)
		return "", err
	}

	return fmt.Sprintf("%s?jwt=%s&usr=%s&refreshjwt=%s",
		redirectUri,
		tokenStore.AccessJwt,
		user.ID,
		tokenStore.RefreshJwt), nil
}

func (m *Module) CanUsePassword(ctx context.Context, email string) (bool, error) {
	domain, err := m.GetAuthDomainByEmail(ctx, email)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return false, err
	}

	if domain != nil && domain.SsoEnabled {
		// sso is enabled, check if the user has admin role
		users, err := m.GetUsersByEmail(ctx, email)
		if err != nil {
			return false, err
		}

		if len(users) == 0 {
			return false, errors.New(errors.TypeNotFound, errors.CodeNotFound, "user not found")
		}

		if users[0].Role != types.RoleAdmin.String() {
			return false, errors.New(errors.TypeForbidden, errors.CodeForbidden, "auth method not supported")
		}

	}

	return true, nil
}

func (m *Module) GetAuthDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, error) {

	if email == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}

	components := strings.Split(email, "@")
	if len(components) < 2 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid email format")
	}

	domain, err := m.store.GetDomainByName(ctx, components[1])
	if err != nil {
		return nil, err
	}

	gettableDomain := &types.GettableOrgDomain{StorableOrgDomain: *domain}
	if err := gettableDomain.LoadConfig(domain.Data); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to load domain config")
	}
	return gettableDomain, nil
}

func (m *Module) CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error {
	return m.store.CreateAPIKey(ctx, apiKey)
}

func (m *Module) UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error {
	return m.store.UpdateAPIKey(ctx, id, apiKey, updaterID)
}

func (m *Module) ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error) {
	return m.store.ListAPIKeys(ctx, orgID)
}

func (m *Module) GetAPIKey(ctx context.Context, orgID, id valuer.UUID) (*types.StorableAPIKeyUser, error) {
	return m.store.GetAPIKey(ctx, orgID, id)
}

func (m *Module) RevokeAPIKey(ctx context.Context, id, removedByUserID valuer.UUID) error {
	return m.store.RevokeAPIKey(ctx, id, removedByUserID)
}

func (m *Module) GetDomainFromSsoResponse(ctx context.Context, url *url.URL) (*types.GettableOrgDomain, error) {
	return m.store.GetDomainFromSsoResponse(ctx, url)
}

func (m *Module) CreateDomain(ctx context.Context, domain *types.GettableOrgDomain) error {
	return m.store.CreateDomain(ctx, domain)
}

func (m *Module) DeleteDomain(ctx context.Context, id uuid.UUID) error {
	return m.store.DeleteDomain(ctx, id)
}

func (m *Module) ListDomains(ctx context.Context, orgID valuer.UUID) ([]*types.GettableOrgDomain, error) {
	return m.store.ListDomains(ctx, orgID)
}

func (m *Module) UpdateDomain(ctx context.Context, domain *types.GettableOrgDomain) error {
	return m.store.UpdateDomain(ctx, domain)
}

func (m *Module) Register(ctx context.Context, req *types.PostableRegisterOrgAndAdmin) (*types.User, error) {
	if req.Email == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "email is required")
	}

	if req.Password == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "password is required")
	}

	organization := types.NewOrganization(req.OrgDisplayName)
	err := m.orgSetter.Create(ctx, organization)
	if err != nil {
		return nil, model.InternalError(err)
	}

	user, err := types.NewUser(req.Name, req.Email, types.RoleAdmin.String(), organization.ID.StringValue())
	if err != nil {
		return nil, model.InternalError(err)
	}

	password, err := types.NewFactorPassword(req.Password)
	if err != nil {
		return nil, model.InternalError(err)
	}

	user, err = m.CreateUserWithPassword(ctx, user, password)
	if err != nil {
		return nil, model.InternalError(err)
	}

	return user, nil
}

func (m *Module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)
	count, err := m.store.CountByOrgID(ctx, orgID)
	if err == nil {
		stats["user.count"] = count
	}

	count, err = m.store.CountAPIKeyByOrgID(ctx, orgID)
	if err == nil {
		stats["factor.api_key.count"] = count
	}

	return stats, nil
}
