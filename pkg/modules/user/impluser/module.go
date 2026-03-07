package impluser

import (
	"context"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	root "github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/dustin/go-humanize"
)

type Module struct {
	store     types.UserStore
	tokenizer tokenizer.Tokenizer
	emailing  emailing.Emailing
	settings  factory.ScopedProviderSettings
	orgSetter organization.Setter
	authz     authz.AuthZ
	analytics analytics.Analytics
	config    user.Config
}

// This module is a WIP, don't take inspiration from this.
func NewModule(store types.UserStore, tokenizer tokenizer.Tokenizer, emailing emailing.Emailing, providerSettings factory.ProviderSettings, orgSetter organization.Setter, authz authz.AuthZ, analytics analytics.Analytics, config user.Config) root.Module {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/user/impluser")
	return &Module{
		store:     store,
		tokenizer: tokenizer,
		emailing:  emailing,
		settings:  settings,
		orgSetter: orgSetter,
		analytics: analytics,
		authz:     authz,
		config:    config,
	}
}

func (m *Module) AcceptInvite(ctx context.Context, token string, password string) (*types.User, error) {
	// get the user by reset password token
	user, err := m.store.GetUserByResetPasswordToken(ctx, token)
	if err != nil {
		return nil, err
	}

	// update the password and delete the token
	err = m.UpdatePasswordByResetPasswordToken(ctx, token, password)
	if err != nil {
		return nil, err
	}

	// query the user again
	user, err = m.store.GetByOrgIDAndID(ctx, user.OrgID, user.ID)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (m *Module) GetInviteByToken(ctx context.Context, token string) (*types.Invite, error) {
	// get the user
	user, err := m.store.GetUserByResetPasswordToken(ctx, token)
	if err != nil {
		return nil, err
	}

	// create a dummy invite obj for backward compatibility
	invite := &types.Invite{
		Identifiable: types.Identifiable{
			ID: user.ID,
		},
		Name:  user.DisplayName,
		Email: user.Email,
		Token: token,
		Role:  user.Role,
		OrgID: user.OrgID,
		TimeAuditable: types.TimeAuditable{
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		},
	}

	return invite, nil
}

// CreateBulk implements invite.Module.
func (m *Module) CreateBulkInvite(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, bulkInvites *types.PostableBulkInviteRequest) ([]*types.Invite, error) {
	creator, err := m.store.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	// validate all emails to be invited
	emails := make([]string, len(bulkInvites.Invites))
	for idx, invite := range bulkInvites.Invites {
		emails[idx] = invite.Email.StringValue()
	}
	users, err := m.store.GetUsersByEmailsOrgIDAndStatuses(ctx, orgID, emails, []string{types.UserStatusActive.StringValue(), types.UserStatusPendingInvite.StringValue()})
	if err != nil {
		return nil, err
	}

	if len(users) > 0 {
		if err := users[0].ErrIfRoot(); err != nil {
			return nil, errors.WithAdditionalf(err, "Cannot send invite to root user")
		}

		if users[0].Status == types.UserStatusPendingInvite {
			return nil, errors.Newf(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "An invite already exists for this email: %s", users[0].Email.StringValue())
		}

		return nil, errors.Newf(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "User already exists with this email: %s", users[0].Email.StringValue())
	}

	type userWithResetToken struct {
		User               *types.User
		ResetPasswordToken *types.ResetPasswordToken
	}

	newUsersWithResetToken := make([]*userWithResetToken, len(bulkInvites.Invites))

	if err := m.store.RunInTx(ctx, func(ctx context.Context) error {
		for idx, invite := range bulkInvites.Invites {
			role, err := types.NewRole(invite.Role.String())
			if err != nil {
				return err
			}

			// create a new user with pending invite status
			newUser, err := types.NewUser(invite.Name, invite.Email, role, orgID, types.UserStatusPendingInvite)
			if err != nil {
				return err
			}

			// store the user and password in db
			err = m.createUserWithoutGrant(ctx, newUser)
			if err != nil {
				return err
			}

			// generate reset password token
			resetPasswordToken, err := m.GetOrCreateResetPasswordToken(ctx, newUser.ID)
			if err != nil {
				m.settings.Logger().ErrorContext(ctx, "failed to create reset password token for invited user", "error", err)
				return err
			}

			newUsersWithResetToken[idx] = &userWithResetToken{
				User:               newUser,
				ResetPasswordToken: resetPasswordToken,
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	invites := make([]*types.Invite, len(bulkInvites.Invites))

	// send password reset emails to all the invited users
	for idx, userWithToken := range newUsersWithResetToken {
		m.analytics.TrackUser(ctx, orgID.String(), creator.ID.String(), "Invite Sent", map[string]any{
			"invitee_email": userWithToken.User.Email,
			"invitee_role":  userWithToken.User.Role,
		})

		invite := &types.Invite{
			Identifiable: types.Identifiable{
				ID: userWithToken.User.ID,
			},
			Name:  userWithToken.User.DisplayName,
			Email: userWithToken.User.Email,
			Token: userWithToken.ResetPasswordToken.Token,
			Role:  userWithToken.User.Role,
			OrgID: userWithToken.User.OrgID,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: userWithToken.User.CreatedAt,
				UpdatedAt: userWithToken.User.UpdatedAt,
			},
		}

		invites[idx] = invite

		frontendBaseUrl := bulkInvites.Invites[idx].FrontendBaseUrl
		if frontendBaseUrl == "" {
			m.settings.Logger().InfoContext(ctx, "frontend base url is not provided, skipping email", "invitee_email", userWithToken.User.Email)
			continue
		}

		resetLink := userWithToken.ResetPasswordToken.FactorPasswordResetLink(frontendBaseUrl)

		tokenLifetime := m.config.Password.Reset.MaxTokenLifetime
		humanizedTokenLifetime := strings.TrimSpace(humanize.RelTime(time.Now(), time.Now().Add(tokenLifetime), "", ""))

		if err := m.emailing.SendHTML(ctx, userWithToken.User.Email.String(), "You're Invited to Join SigNoz", emailtypes.TemplateNameInvitationEmail, map[string]any{
			"inviter_email": creator.Email,
			"link":          resetLink,
			"Expiry":        humanizedTokenLifetime,
		}); err != nil {
			m.settings.Logger().ErrorContext(ctx, "failed to send invite email", "error", err)
		}
	}

	return invites, nil
}

func (m *Module) ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error) {
	// find all the users with pending_invite status
	users, err := m.store.ListUsersByOrgID(ctx, valuer.MustNewUUID(orgID))
	if err != nil {
		return nil, err
	}

	pendingUsers := slices.DeleteFunc(users, func(user *types.User) bool { return user.Status != types.UserStatusPendingInvite })

	var invites []*types.Invite

	for _, pUser := range pendingUsers {
		// get the reset password token
		resetPasswordToken, err := m.GetOrCreateResetPasswordToken(ctx, pUser.ID)
		if err != nil {
			return nil, err
		}

		// create a dummy invite obj for backward compatibility
		invite := &types.Invite{
			Identifiable: types.Identifiable{
				ID: pUser.ID,
			},
			Name:  pUser.DisplayName,
			Email: pUser.Email,
			Token: resetPasswordToken.Token,
			Role:  pUser.Role,
			OrgID: pUser.OrgID,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: pUser.CreatedAt,
				UpdatedAt: pUser.UpdatedAt, // dummy
			},
		}

		invites = append(invites, invite)
	}

	return invites, nil
}

func (module *Module) CreateUser(ctx context.Context, input *types.User, opts ...root.CreateUserOption) error {
	createUserOpts := root.NewCreateUserOptions(opts...)

	// since assign is idempotant multiple calls to assign won't cause issues in case of retries.
	err := module.authz.Grant(ctx, input.OrgID, []string{roletypes.MustGetSigNozManagedRoleFromExistingRole(input.Role)}, authtypes.MustNewSubject(authtypes.TypeableUser, input.ID.StringValue(), input.OrgID, nil))
	if err != nil {
		return err
	}

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

	if err := existingUser.ErrIfRoot(); err != nil {
		return nil, errors.WithAdditionalf(err, "cannot update root user")
	}

	if err := existingUser.ErrIfDeleted(); err != nil {
		return nil, errors.WithAdditionalf(err, "cannot update deleted user")
	}

	if err := existingUser.ErrIfPending(); err != nil {
		return nil, errors.WithAdditionalf(err, "cannot update pending user")
	}

	requestor, err := m.store.GetUser(ctx, valuer.MustNewUUID(updatedBy))
	if err != nil {
		return nil, err
	}

	if user.Role != "" && user.Role != existingUser.Role && requestor.Role != types.RoleAdmin {
		return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "only admins can change roles")
	}

	// Make sure that the request is not demoting the last admin user.
	if user.Role != "" && user.Role != existingUser.Role && existingUser.Role == types.RoleAdmin {
		adminUsers, err := m.store.GetActiveUsersByRoleAndOrgID(ctx, types.RoleAdmin, orgID)
		if err != nil {
			return nil, err
		}

		if len(adminUsers) == 1 {
			return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot demote the last admin")
		}
	}

	if user.Role != "" && user.Role != existingUser.Role {
		err = m.authz.ModifyGrant(ctx,
			orgID,
			[]string{roletypes.MustGetSigNozManagedRoleFromExistingRole(existingUser.Role)},
			[]string{roletypes.MustGetSigNozManagedRoleFromExistingRole(user.Role)},
			authtypes.MustNewSubject(authtypes.TypeableUser, id, orgID, nil),
		)
		if err != nil {
			return nil, err
		}
	}

	existingUser.Update(user.DisplayName, user.Role)
	if err := m.UpdateAnyUser(ctx, orgID, existingUser); err != nil {
		return nil, err
	}

	return existingUser, nil
}

func (module *Module) UpdateAnyUser(ctx context.Context, orgID valuer.UUID, user *types.User) error {
	if err := module.store.UpdateUser(ctx, orgID, user); err != nil {
		return err
	}

	traits := types.NewTraitsFromUser(user)
	module.analytics.IdentifyUser(ctx, user.OrgID.String(), user.ID.String(), traits)
	module.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Updated", traits)

	if err := module.tokenizer.DeleteIdentity(ctx, user.ID); err != nil {
		return err
	}

	return nil
}

func (module *Module) DeleteUser(ctx context.Context, orgID valuer.UUID, id string, deletedBy string) error {
	user, err := module.store.GetUser(ctx, valuer.MustNewUUID(id))
	if err != nil {
		return err
	}

	if err := user.ErrIfRoot(); err != nil {
		return errors.WithAdditionalf(err, "cannot delete root user")
	}

	if err := user.ErrIfDeleted(); err != nil {
		return errors.WithAdditionalf(err, "cannot delete already deleted user")
	}

	if slices.Contains(integrationtypes.AllIntegrationUserEmails, integrationtypes.IntegrationUserEmail(user.Email.String())) {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "integration user cannot be deleted")
	}

	// don't allow to delete the last admin user
	adminUsers, err := module.store.GetActiveUsersByRoleAndOrgID(ctx, types.RoleAdmin, orgID)
	if err != nil {
		return err
	}

	if len(adminUsers) == 1 && user.Role == types.RoleAdmin {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot delete the last admin")
	}

	// since revoke is idempotant multiple calls to revoke won't cause issues in case of retries
	err = module.authz.Revoke(ctx, orgID, []string{roletypes.MustGetSigNozManagedRoleFromExistingRole(user.Role)}, authtypes.MustNewSubject(authtypes.TypeableUser, id, orgID, nil))
	if err != nil {
		return err
	}

	// for now we are only soft deleting users
	if err := module.store.SoftDeleteUser(ctx, orgID.String(), user.ID.StringValue()); err != nil {
		return err
	}

	module.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Deleted", map[string]any{
		"deleted_by": deletedBy,
	})

	return nil
}

func (module *Module) GetOrCreateResetPasswordToken(ctx context.Context, userID valuer.UUID) (*types.ResetPasswordToken, error) {
	user, err := module.store.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	if err := user.ErrIfRoot(); err != nil {
		return nil, errors.WithAdditionalf(err, "cannot reset password for root user")
	}

	if err := user.ErrIfDeleted(); err != nil {
		return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "user has been deleted")
	}

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

	// check if a token already exists for this password id
	existingResetPasswordToken, err := module.store.GetResetPasswordTokenByPasswordID(ctx, password.ID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err // return the error if it is not a not found error
	}

	// return the existing token if it is not expired
	if existingResetPasswordToken != nil && !existingResetPasswordToken.IsExpired() {
		return existingResetPasswordToken, nil // return the existing token if it is not expired
	}

	// delete the existing token entry
	if existingResetPasswordToken != nil {
		if err := module.store.DeleteResetPasswordTokenByPasswordID(ctx, password.ID); err != nil {
			return nil, err
		}
	}

	// create a new token
	resetPasswordToken, err := types.NewResetPasswordToken(password.ID, time.Now().Add(module.config.Password.Reset.MaxTokenLifetime))
	if err != nil {
		return nil, err
	}

	// create a new token
	err = module.store.CreateResetPasswordToken(ctx, resetPasswordToken)
	if err != nil {
		return nil, err
	}

	return resetPasswordToken, nil
}

func (module *Module) ForgotPassword(ctx context.Context, orgID valuer.UUID, email valuer.Email, frontendBaseURL string) error {
	if !module.config.Password.Reset.AllowSelf {
		return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "Users are not allowed to reset their password themselves, please contact an admin to reset your password.")
	}

	user, err := module.GetNonDeletedUserByEmailAndOrgID(ctx, email, orgID)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return nil // for security reasons
		}
		return err
	}

	if err := user.ErrIfRoot(); err != nil {
		return errors.WithAdditionalf(err, "cannot reset password for root user")
	}

	token, err := module.GetOrCreateResetPasswordToken(ctx, user.ID)
	if err != nil {
		module.settings.Logger().ErrorContext(ctx, "failed to create reset password token", "error", err)
		return err
	}

	resetLink := token.FactorPasswordResetLink(frontendBaseURL)

	tokenLifetime := module.config.Password.Reset.MaxTokenLifetime
	humanizedTokenLifetime := strings.TrimSpace(humanize.RelTime(time.Now(), time.Now().Add(tokenLifetime), "", ""))

	if err := module.emailing.SendHTML(
		ctx,
		user.Email.String(),
		"A Password Reset Was Requested for SigNoz",
		emailtypes.TemplateNameResetPassword,
		map[string]any{
			"Link":   resetLink,
			"Expiry": humanizedTokenLifetime,
		},
	); err != nil {
		module.settings.Logger().ErrorContext(ctx, "failed to send reset password email", "error", err)
		return nil
	}

	return nil
}

func (module *Module) UpdatePasswordByResetPasswordToken(ctx context.Context, token string, passwd string) error {
	resetPasswordToken, err := module.store.GetResetPasswordToken(ctx, token)
	if err != nil {
		return err
	}

	if resetPasswordToken.IsExpired() {
		return errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "reset password token has expired")
	}

	password, err := module.store.GetPassword(ctx, resetPasswordToken.PasswordID)
	if err != nil {
		return err
	}

	user, err := module.store.GetUser(ctx, valuer.MustNewUUID(password.UserID))
	if err != nil {
		return err
	}

	// handle deleted user
	if err := user.ErrIfDeleted(); err != nil {
		return errors.WithAdditionalf(err, "deleted users cannot reset their password")
	}

	if err := user.ErrIfRoot(); err != nil {
		return errors.WithAdditionalf(err, "cannot reset password for root user")
	}

	if err := password.Update(passwd); err != nil {
		return err
	}

	// since grant is idempotent, multiple calls won't cause issues in case of retries
	if user.Status == types.UserStatusPendingInvite {
		if err = module.authz.Grant(
			ctx,
			user.OrgID,
			[]string{roletypes.MustGetSigNozManagedRoleFromExistingRole(user.Role)},
			authtypes.MustNewSubject(authtypes.TypeableUser, user.ID.StringValue(), user.OrgID, nil),
		); err != nil {
			return err
		}
	}

	return module.store.RunInTx(ctx, func(ctx context.Context) error {
		if user.Status == types.UserStatusPendingInvite {
			if err := user.UpdateStatus(types.UserStatusActive); err != nil {
				return err
			}
			if err := module.store.UpdateUser(ctx, user.OrgID, user); err != nil {
				return err
			}
		}

		if err := module.store.UpdatePassword(ctx, password); err != nil {
			return err
		}

		if err := module.store.DeleteResetPasswordTokenByPasswordID(ctx, password.ID); err != nil {
			return err
		}

		return nil
	})
}

func (module *Module) UpdatePassword(ctx context.Context, userID valuer.UUID, oldpasswd string, passwd string) error {
	user, err := module.store.GetUser(ctx, userID)
	if err != nil {
		return err
	}

	if err := user.ErrIfDeleted(); err != nil {
		return errors.WithAdditionalf(err, "cannot change password for deleted user")
	}

	if err := user.ErrIfRoot(); err != nil {
		return errors.WithAdditionalf(err, "cannot change password for root user")
	}

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

	if err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := module.store.UpdatePassword(ctx, password); err != nil {
			return err
		}

		if err := module.store.DeleteResetPasswordTokenByPasswordID(ctx, password.ID); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return err
	}

	return module.tokenizer.DeleteTokensByUserID(ctx, userID)
}

func (module *Module) GetOrCreateUser(ctx context.Context, user *types.User, opts ...root.CreateUserOption) (*types.User, error) {
	existingUser, err := module.GetNonDeletedUserByEmailAndOrgID(ctx, user.Email, user.OrgID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if existingUser != nil {
		// for users logging through SSO flow but are having status as pending_invite
		if existingUser.Status == types.UserStatusPendingInvite {
			// respect the role coming from the SSO
			existingUser.Update("", user.Role)
			// activate the user
			if err = module.activatePendingUser(ctx, existingUser); err != nil {
				return nil, err
			}
		}

		return existingUser, nil
	}

	err = module.CreateUser(ctx, user, opts...)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (module *Module) CreateFirstUser(ctx context.Context, organization *types.Organization, name string, email valuer.Email, passwd string) (*types.User, error) {
	user, err := types.NewRootUser(name, email, organization.ID)
	if err != nil {
		return nil, err
	}

	password, err := types.NewFactorPassword(passwd, user.ID.StringValue())
	if err != nil {
		return nil, err
	}

	managedRoles := roletypes.NewManagedRoles(organization.ID)
	err = module.authz.CreateManagedUserRoleTransactions(ctx, organization.ID, user.ID)
	if err != nil {
		return nil, err
	}

	if err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		err = module.orgSetter.Create(ctx, organization, func(ctx context.Context, orgID valuer.UUID) error {
			err = module.authz.CreateManagedRoles(ctx, orgID, managedRoles)
			if err != nil {
				return err
			}

			return nil
		})
		if err != nil {
			return err
		}

		err = module.createUserWithoutGrant(ctx, user, root.WithFactorPassword(password))
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
	counts, err := module.store.CountByOrgIDAndStatuses(ctx, orgID, []string{types.UserStatusActive.StringValue(), types.UserStatusDeleted.StringValue(), types.UserStatusPendingInvite.StringValue()})
	if err == nil {
		stats["user.count"] = counts[types.UserStatusActive] + counts[types.UserStatusDeleted] + counts[types.UserStatusPendingInvite]
		stats["user.count.active"] = counts[types.UserStatusActive]
		stats["user.count.deleted"] = counts[types.UserStatusDeleted]
		stats["user.count.pending_invite"] = counts[types.UserStatusPendingInvite]
	}

	return stats, nil
}

// this function restricts that only one non-deleted user email can exist for an org ID, if found more, it throws an error
func (module *Module) GetNonDeletedUserByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) (*types.User, error) {
	existingUsers, err := module.store.GetUsersByEmailAndOrgID(ctx, email, orgID)
	if err != nil {
		return nil, err
	}

	// filter out the deleted users
	existingUsers = slices.DeleteFunc(existingUsers, func(user *types.User) bool { return user.ErrIfDeleted() != nil })

	if len(existingUsers) > 1 {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "Multiple non-deleted users found for email %s in org_id: %s", email.StringValue(), orgID.StringValue())
	}

	if len(existingUsers) == 1 {
		return existingUsers[0], nil
	}

	return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "No non-deleted user found with email %s in org_id: %s", email.StringValue(), orgID.StringValue())

}

func (module *Module) createUserWithoutGrant(ctx context.Context, input *types.User, opts ...root.CreateUserOption) error {
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

func (module *Module) activatePendingUser(ctx context.Context, user *types.User) error {
	err := module.authz.Grant(
		ctx,
		user.OrgID,
		[]string{roletypes.MustGetSigNozManagedRoleFromExistingRole(user.Role)},
		authtypes.MustNewSubject(authtypes.TypeableUser, user.ID.StringValue(), user.OrgID, nil),
	)
	if err != nil {
		return err
	}

	if err := user.UpdateStatus(types.UserStatusActive); err != nil {
		return err
	}
	err = module.store.UpdateUser(ctx, user.OrgID, user)
	if err != nil {
		return err
	}

	return nil
}
