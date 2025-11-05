package impluser

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	root "github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

type Module struct {
	store     types.UserStore
	tokenizer tokenizer.Tokenizer
	emailing  emailing.Emailing
	settings  factory.ScopedProviderSettings
	orgSetter organization.Setter
	analytics analytics.Analytics
}

// This module is a WIP, don't take inspiration from this.
func NewModule(store types.UserStore, tokenizer tokenizer.Tokenizer, emailing emailing.Emailing, providerSettings factory.ProviderSettings, orgSetter organization.Setter, analytics analytics.Analytics) root.Module {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/user/impluser")
	return &Module{
		store:     store,
		tokenizer: tokenizer,
		emailing:  emailing,
		settings:  settings,
		orgSetter: orgSetter,
		analytics: analytics,
	}
}

func (m *Module) AcceptInvite(ctx context.Context, token string, password string) (*types.User, error) {
	invite, err := m.store.GetInviteByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	user, err := types.NewUser(invite.Name, invite.Email, invite.Role, invite.OrgID)
	if err != nil {
		return nil, err
	}

	factorPassword, err := types.NewFactorPassword(password, user.ID.StringValue())
	if err != nil {
		return nil, err
	}

	err = m.CreateUser(ctx, user, root.WithFactorPassword(factorPassword))
	if err != nil {
		return nil, err
	}

	if err := m.DeleteInvite(ctx, invite.OrgID.String(), invite.ID); err != nil {
		return nil, err
	}

	return user, nil
}

func (m *Module) GetInviteByToken(ctx context.Context, token string) (*types.Invite, error) {
	invite, err := m.store.GetInviteByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	return invite, nil
}

// CreateBulk implements invite.Module.
func (m *Module) CreateBulkInvite(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, bulkInvites *types.PostableBulkInviteRequest) ([]*types.Invite, error) {
	creator, err := m.store.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	invites := make([]*types.Invite, 0, len(bulkInvites.Invites))

	for _, invite := range bulkInvites.Invites {
		// check if user exists
		existingUser, err := m.store.GetUserByEmailAndOrgID(ctx, invite.Email, orgID)
		if err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}

		if existingUser != nil {
			return nil, errors.New(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "User already exists with the same email")
		}

		// Check if an invite already exists
		existingInvite, err := m.store.GetInviteByEmailAndOrgID(ctx, invite.Email, orgID)
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

		newInvite, err := types.NewInvite(invite.Name, role, orgID, invite.Email)
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

	for i := 0; i < len(invites); i++ {
		m.analytics.TrackUser(ctx, orgID.String(), creator.ID.String(), "Invite Sent", map[string]any{"invitee_email": invites[i].Email, "invitee_role": invites[i].Role})

		// if the frontend base url is not provided, we don't send the email
		if bulkInvites.Invites[i].FrontendBaseUrl == "" {
			m.settings.Logger().InfoContext(ctx, "frontend base url is not provided, skipping email", "invitee_email", invites[i].Email)
			continue
		}

		if err := m.emailing.SendHTML(ctx, invites[i].Email.String(), "You are invited to join a team in SigNoz", emailtypes.TemplateNameInvitationEmail, map[string]any{
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

func (module *Module) CreateUser(ctx context.Context, input *types.User, opts ...root.CreateUserOption) error {
	createUserOpts := root.NewCreateUserOptions(opts...)

	if err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := module.store.CreateUser(ctx, input); err != nil {
			return err
		}

		if createUserOpts.FactorPassword != nil {
			if err := module.store.CreatePassword(ctx, createUserOpts.FactorPassword); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return err
	}

	traitsOrProperties := types.NewTraitsFromUser(input)
	module.analytics.IdentifyUser(ctx, input.OrgID.String(), input.ID.String(), traitsOrProperties)
	module.analytics.TrackUser(ctx, input.OrgID.String(), input.ID.String(), "User Created", traitsOrProperties)

	return nil
}

func (m *Module) UpdateUser(ctx context.Context, orgID valuer.UUID, id string, user *types.User, updatedBy string) (*types.User, error) {
	existingUser, err := m.store.GetUser(ctx, valuer.MustNewUUID(id))
	if err != nil {
		return nil, err
	}

	requestor, err := m.store.GetUser(ctx, valuer.MustNewUUID(updatedBy))
	if err != nil {
		return nil, err
	}

	// only displayName, role can be updated
	if user.DisplayName == "" {
		user.DisplayName = existingUser.DisplayName
	}

	if user.Role == "" {
		user.Role = existingUser.Role
	}

	if user.Role != existingUser.Role && requestor.Role != types.RoleAdmin {
		return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "only admins can change roles")
	}

	// Make sure that th e request is not demoting the last admin user.
	// also an admin user can only change role of their own or other user
	if user.Role != existingUser.Role && existingUser.Role == types.RoleAdmin {
		adminUsers, err := m.store.GetUsersByRoleAndOrgID(ctx, types.RoleAdmin, orgID)
		if err != nil {
			return nil, err
		}

		if len(adminUsers) == 1 {
			return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot demote the last admin")
		}
	}

	user.UpdatedAt = time.Now()

	updatedUser, err := m.store.UpdateUser(ctx, orgID, id, user)
	if err != nil {
		return nil, err
	}

	traits := types.NewTraitsFromUser(updatedUser)
	m.analytics.IdentifyUser(ctx, user.OrgID.String(), user.ID.String(), traits)

	traits["updated_by"] = updatedBy
	m.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Updated", traits)

	// if the role is updated then send an email
	if existingUser.Role != updatedUser.Role {
		if err := m.emailing.SendHTML(ctx, existingUser.Email.String(), "Your Role Has Been Updated in SigNoz", emailtypes.TemplateNameUpdateRole, map[string]any{
			"CustomerName":   existingUser.DisplayName,
			"UpdatedByEmail": requestor.Email,
			"OldRole":        cases.Title(language.English).String(strings.ToLower(existingUser.Role.String())),
			"NewRole":        cases.Title(language.English).String(strings.ToLower(updatedUser.Role.String())),
		}); err != nil {
			m.settings.Logger().ErrorContext(ctx, "failed to send email", "error", err)
		}
	}

	if err := m.tokenizer.DeleteIdentity(ctx, valuer.MustNewUUID(id)); err != nil {
		return nil, err
	}

	return updatedUser, nil
}

func (m *Module) DeleteUser(ctx context.Context, orgID valuer.UUID, id string, deletedBy string) error {
	user, err := m.store.GetUser(ctx, valuer.MustNewUUID(id))
	if err != nil {
		return err
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(user.Email.String())) {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "integration user cannot be deleted")
	}

	// don't allow to delete the last admin user
	adminUsers, err := m.store.GetUsersByRoleAndOrgID(ctx, types.RoleAdmin, orgID)
	if err != nil {
		return err
	}

	if len(adminUsers) == 1 && user.Role == types.RoleAdmin {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot delete the last admin")
	}

	if err := m.store.DeleteUser(ctx, orgID.String(), user.ID.StringValue()); err != nil {
		return err
	}

	m.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Deleted", map[string]any{
		"deleted_by": deletedBy,
	})

	return nil
}

func (module *Module) GetOrCreateResetPasswordToken(ctx context.Context, userID valuer.UUID) (*types.ResetPasswordToken, error) {
	password, err := module.store.GetPasswordByUserID(ctx, userID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if password == nil {
		// if the user does not have a password, we need to create a new one (common for SSO/SAML users)
		password = types.MustGenerateFactorPassword(userID.String())

		if err := module.store.CreatePassword(ctx, password); err != nil {
			return nil, err
		}
	}

	resetPasswordToken, err := types.NewResetPasswordToken(password.ID)
	if err != nil {
		return nil, err
	}

	err = module.store.CreateResetPasswordToken(ctx, resetPasswordToken)
	if err != nil {
		if !errors.Ast(err, errors.TypeAlreadyExists) {
			return nil, err
		}

		// if the token already exists, we return the existing token
		resetPasswordToken, err = module.store.GetResetPasswordTokenByPasswordID(ctx, password.ID)
		if err != nil {
			return nil, err
		}
	}

	return resetPasswordToken, nil
}

func (module *Module) UpdatePasswordByResetPasswordToken(ctx context.Context, token string, passwd string) error {
	resetPasswordToken, err := module.store.GetResetPasswordToken(ctx, token)
	if err != nil {
		return err
	}

	password, err := module.store.GetPassword(ctx, resetPasswordToken.PasswordID)
	if err != nil {
		return err
	}

	if err := password.Update(passwd); err != nil {
		return err
	}

	return module.store.UpdatePassword(ctx, password)
}

func (module *Module) UpdatePassword(ctx context.Context, userID valuer.UUID, oldpasswd string, passwd string) error {
	password, err := module.store.GetPasswordByUserID(ctx, userID)
	if err != nil {
		return err
	}

	if !password.Equals(oldpasswd) {
		return errors.New(errors.TypeInvalidInput, types.ErrCodeIncorrectPassword, "old password is incorrect")
	}

	if err := password.Update(passwd); err != nil {
		return err
	}

	if err := module.store.UpdatePassword(ctx, password); err != nil {
		return err
	}

	return module.tokenizer.DeleteTokensByUserID(ctx, userID)
}

func (module *Module) GetOrCreateUser(ctx context.Context, user *types.User, opts ...root.CreateUserOption) (*types.User, error) {
	existingUser, err := module.store.GetUserByEmailAndOrgID(ctx, user.Email, user.OrgID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if existingUser != nil {
		return existingUser, nil
	}

	err = module.CreateUser(ctx, user, opts...)
	if err != nil {
		return nil, err
	}

	return user, nil
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

func (module *Module) CreateFirstUser(ctx context.Context, organization *types.Organization, name string, email valuer.Email, passwd string) (*types.User, error) {
	user, err := types.NewUser(name, email, types.RoleAdmin, organization.ID)
	if err != nil {
		return nil, err
	}

	password, err := types.NewFactorPassword(passwd, user.ID.StringValue())
	if err != nil {
		return nil, err
	}

	if err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		err := module.orgSetter.Create(ctx, organization)
		if err != nil {
			return err
		}

		err = module.CreateUser(ctx, user, root.WithFactorPassword(password))
		if err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return user, nil
}

func (module *Module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)
	count, err := module.store.CountByOrgID(ctx, orgID)
	if err == nil {
		stats["user.count"] = count
	}

	count, err = module.store.CountAPIKeyByOrgID(ctx, orgID)
	if err == nil {
		stats["factor.api_key.count"] = count
	}

	return stats, nil
}
