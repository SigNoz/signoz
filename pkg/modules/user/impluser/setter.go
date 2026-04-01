package impluser

import (
	"context"
	"log/slog"
	"slices"
	"strings"
	"time"

	"github.com/dustin/go-humanize"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	root "github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type setter struct {
	store         types.UserStore
	userRoleStore authtypes.UserRoleStore
	tokenizer     tokenizer.Tokenizer
	emailing      emailing.Emailing
	settings      factory.ScopedProviderSettings
	orgSetter     organization.Setter
	authz         authz.AuthZ
	analytics     analytics.Analytics
	config        root.Config
	getter        root.Getter
}

// This module is a WIP, don't take inspiration from this.
func NewSetter(store types.UserStore, tokenizer tokenizer.Tokenizer, emailing emailing.Emailing, providerSettings factory.ProviderSettings, orgSetter organization.Setter, authz authz.AuthZ, analytics analytics.Analytics, config root.Config, userRoleStore authtypes.UserRoleStore, getter root.Getter) root.Setter {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/user/impluser")
	return &setter{
		store:         store,
		userRoleStore: userRoleStore,
		tokenizer:     tokenizer,
		emailing:      emailing,
		settings:      settings,
		orgSetter:     orgSetter,
		analytics:     analytics,
		authz:         authz,
		config:        config,
		getter:        getter,
	}
}

// CreateBulk implements invite.Module.
func (module *setter) CreateBulkInvite(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, bulkInvites *types.PostableBulkInviteRequest) ([]*types.Invite, error) {
	creator, err := module.store.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	// validate all emails to be invited
	emails := make([]string, len(bulkInvites.Invites))
	for idx, invite := range bulkInvites.Invites {
		emails[idx] = invite.Email.StringValue()
	}
	users, err := module.store.GetUsersByEmailsOrgIDAndStatuses(ctx, orgID, emails, []string{types.UserStatusActive.StringValue(), types.UserStatusPendingInvite.StringValue()})
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
		Role               types.Role
	}

	newUsersWithResetToken := make([]*userWithResetToken, len(bulkInvites.Invites))

	if err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		for idx, invite := range bulkInvites.Invites {
			// create a new user with pending invite status
			newUser, err := types.NewUser(invite.Name, invite.Email, orgID, types.UserStatusPendingInvite)
			if err != nil {
				return err
			}

			// store the user and password in db
			err = module.createUserWithoutGrant(ctx, newUser, root.WithRoleNames([]string{authtypes.MustGetSigNozManagedRoleFromExistingRole(invite.Role)}))
			if err != nil {
				return err
			}

			// generate reset password token
			resetPasswordToken, err := module.GetOrCreateResetPasswordToken(ctx, newUser.ID)
			if err != nil {
				module.settings.Logger().ErrorContext(ctx, "failed to create reset password token for invited user", errors.Attr(err))
				return err
			}

			newUsersWithResetToken[idx] = &userWithResetToken{
				User:               newUser,
				ResetPasswordToken: resetPasswordToken,
				Role:               invite.Role,
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	invites := make([]*types.Invite, len(bulkInvites.Invites))

	// send password reset emails to all the invited users
	for idx, userWithToken := range newUsersWithResetToken {
		module.analytics.TrackUser(ctx, orgID.String(), creator.ID.String(), "Invite Sent", map[string]any{
			"invitee_email": userWithToken.User.Email,
			"invitee_role":  userWithToken.Role,
		})

		invite := &types.Invite{
			Identifiable: types.Identifiable{
				ID: userWithToken.User.ID,
			},
			Name:  userWithToken.User.DisplayName,
			Email: userWithToken.User.Email,
			Token: userWithToken.ResetPasswordToken.Token,
			Role:  userWithToken.Role,
			OrgID: userWithToken.User.OrgID,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: userWithToken.User.CreatedAt,
				UpdatedAt: userWithToken.User.UpdatedAt,
			},
		}

		invites[idx] = invite

		frontendBaseUrl := bulkInvites.Invites[idx].FrontendBaseUrl
		if frontendBaseUrl == "" {
			module.settings.Logger().InfoContext(ctx, "frontend base url is not provided, skipping email", slog.Any("invitee_email", userWithToken.User.Email))
			continue
		}

		resetLink := userWithToken.ResetPasswordToken.FactorPasswordResetLink(frontendBaseUrl)

		tokenLifetime := module.config.Password.Invite.MaxTokenLifetime
		humanizedTokenLifetime := strings.TrimSpace(humanize.RelTime(time.Now(), time.Now().Add(tokenLifetime), "", ""))

		if err := module.emailing.SendHTML(ctx, userWithToken.User.Email.String(), "You're Invited to Join SigNoz", emailtypes.TemplateNameInvitationEmail, map[string]any{
			"inviter_email": creator.Email,
			"link":          resetLink,
			"Expiry":        humanizedTokenLifetime,
		}); err != nil {
			module.settings.Logger().ErrorContext(ctx, "failed to send invite email", errors.Attr(err))
		}
	}

	return invites, nil
}

func (module *setter) CreateUser(ctx context.Context, user *types.User, opts ...root.CreateUserOption) error {
	createUserOpts := root.NewCreateUserOptions(opts...)

	// since assign is idempotant multiple calls to assign won't cause issues in case of retries.
	if len(createUserOpts.RoleNames) > 0 {
		err := module.authz.Grant(
			ctx,
			user.OrgID,
			createUserOpts.RoleNames,
			authtypes.MustNewSubject(authtypes.TypeableUser, user.ID.StringValue(), user.OrgID, nil),
		)
		if err != nil {
			return err
		}
	}

	if err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := module.store.CreateUser(ctx, user); err != nil {
			return err
		}

		if createUserOpts.FactorPassword != nil {
			if err := module.store.CreatePassword(ctx, createUserOpts.FactorPassword); err != nil {
				return err
			}
		}

		// create user_role entries
		if len(createUserOpts.RoleNames) > 0 {
			err := module.createUserRoleEntries(ctx, user.OrgID, user.ID, createUserOpts.RoleNames)
			if err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return err
	}

	traitsOrProperties := types.NewTraitsFromUser(user)
	module.analytics.IdentifyUser(ctx, user.OrgID.String(), user.ID.String(), traitsOrProperties)
	module.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Created", traitsOrProperties)

	return nil
}

func (module *setter) UpdateUserDeprecated(ctx context.Context, orgID valuer.UUID, id string, user *types.DeprecatedUser, updatedBy string) (*types.DeprecatedUser, error) {
	existingUser, err := module.getter.GetDeprecatedUserByOrgIDAndID(ctx, orgID, valuer.MustNewUUID(id))
	if err != nil {
		return nil, err
	}

	if err := existingUser.ErrIfRoot(); err != nil {
		return nil, errors.WithAdditionalf(err, "cannot update root user")
	}

	if err := existingUser.ErrIfDeleted(); err != nil {
		return nil, errors.WithAdditionalf(err, "cannot update deleted user")
	}

	requestor, err := module.getter.GetDeprecatedUserByOrgIDAndID(ctx, orgID, valuer.MustNewUUID(updatedBy))
	if err != nil {
		return nil, err
	}

	roleChange := user.Role != "" && user.Role != existingUser.Role

	if roleChange && requestor.Role != types.RoleAdmin {
		return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "only admins can change roles")
	}

	// make sure the user is not demoting self from admin
	if roleChange && existingUser.ID == requestor.ID && existingUser.Role == types.RoleAdmin && user.Role != types.RoleAdmin {
		return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot change self role")
	}

	if roleChange {
		err = module.authz.ModifyGrant(ctx,
			orgID,
			[]string{authtypes.MustGetSigNozManagedRoleFromExistingRole(existingUser.Role)},
			[]string{authtypes.MustGetSigNozManagedRoleFromExistingRole(user.Role)},
			authtypes.MustNewSubject(authtypes.TypeableUser, id, orgID, nil),
		)
		if err != nil {
			return nil, err
		}
	}

	existingUser.Update(user.DisplayName, user.Role)

	// update the user - idempotent (this does analytics too so keeping it outside txn)
	if err := module.UpdateAnyUserDeprecated(ctx, orgID, existingUser); err != nil {
		return nil, err
	}

	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		if roleChange {
			// delete old role entries and create new ones
			if err := module.userRoleStore.DeleteUserRoles(ctx, existingUser.ID); err != nil {
				return err
			}

			// create new ones
			if err := module.createUserRoleEntries(ctx, existingUser.OrgID, existingUser.ID, []string{authtypes.MustGetSigNozManagedRoleFromExistingRole(user.Role)}); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return existingUser, nil
}

func (module *setter) UpdateUser(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, updatable *types.UpdatableUser) (*types.User, error) {
	existingUser, err := module.getter.GetUserByOrgIDAndID(ctx, orgID, userID)
	if err != nil {
		return nil, err
	}

	if err := existingUser.ErrIfRoot(); err != nil {
		return nil, errors.WithAdditionalf(err, "cannot update root user")
	}

	if err := existingUser.ErrIfDeleted(); err != nil {
		return nil, errors.WithAdditionalf(err, "cannot update deleted user")
	}

	existingUser.Update(updatable.DisplayName)
	if err := module.UpdateAnyUser(ctx, orgID, existingUser); err != nil {
		return nil, err
	}

	return existingUser, nil
}

func (module *setter) UpdateAnyUser(ctx context.Context, orgID valuer.UUID, user *types.User) error {
	if err := module.store.UpdateUser(ctx, orgID, user); err != nil {
		return err
	}

	if err := module.tokenizer.DeleteIdentity(ctx, user.ID); err != nil {
		return err
	}

	// stats collector things
	traits := types.NewTraitsFromUser(user)
	module.analytics.IdentifyUser(ctx, user.OrgID.String(), user.ID.String(), traits)
	module.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Updated", traits)

	return nil
}

func (module *setter) UpdateAnyUserDeprecated(ctx context.Context, orgID valuer.UUID, deprecateUser *types.DeprecatedUser) error {
	user := types.NewUserFromDeprecatedUser(deprecateUser)
	if err := module.store.UpdateUser(ctx, orgID, user); err != nil {
		return err
	}

	traits := types.NewTraitsFromDeprecatedUser(deprecateUser)
	module.analytics.IdentifyUser(ctx, user.OrgID.String(), user.ID.String(), traits)
	module.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Updated", traits)

	if err := module.tokenizer.DeleteIdentity(ctx, user.ID); err != nil {
		return err
	}

	return nil
}

func (module *setter) DeleteUser(ctx context.Context, orgID valuer.UUID, id string, deletedBy string) error {
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

	deleter, err := module.store.GetUser(ctx, valuer.MustNewUUID(deletedBy))
	if err != nil {
		return err
	}

	if deleter.ID == user.ID {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot self delete")
	}

	userRoles, err := module.getter.GetRolesByUserID(ctx, user.ID)
	if err != nil {
		return err
	}

	roleNames := roleNamesFromUserRoles(userRoles)

	// since revoke is idempotant multiple calls to revoke won't cause issues in case of retries
	err = module.authz.Revoke(
		ctx,
		orgID,
		roleNames,
		authtypes.MustNewSubject(authtypes.TypeableUser, id, orgID, nil),
	)
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

func (module *setter) GetOrCreateResetPasswordToken(ctx context.Context, userID valuer.UUID) (*types.ResetPasswordToken, error) {
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
	tokenLifetime := module.config.Password.Reset.MaxTokenLifetime
	if user.Status == types.UserStatusPendingInvite {
		tokenLifetime = module.config.Password.Invite.MaxTokenLifetime
	}
	resetPasswordToken, err := types.NewResetPasswordToken(password.ID, time.Now().Add(tokenLifetime))
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

func (module *setter) ForgotPassword(ctx context.Context, orgID valuer.UUID, email valuer.Email, frontendBaseURL string) error {
	if !module.config.Password.Reset.AllowSelf {
		return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "Users are not allowed to reset their password themselves, please contact an admin to reset your password.")
	}

	user, err := module.getter.GetNonDeletedUserByEmailAndOrgID(ctx, email, orgID)
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
		module.settings.Logger().ErrorContext(ctx, "failed to create reset password token", errors.Attr(err))
		return err
	}

	resetLink := token.FactorPasswordResetLink(frontendBaseURL)

	tokenLifetime := module.config.Password.Reset.MaxTokenLifetime
	if user.Status == types.UserStatusPendingInvite {
		tokenLifetime = module.config.Password.Invite.MaxTokenLifetime
	}
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
		module.settings.Logger().ErrorContext(ctx, "failed to send reset password email", errors.Attr(err))
		return nil
	}

	return nil
}

func (module *setter) UpdatePasswordByResetPasswordToken(ctx context.Context, token string, passwd string) error {
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

	userRoles, err := module.getter.GetRolesByUserID(ctx, user.ID)
	if err != nil {
		return err
	}

	roleNames := roleNamesFromUserRoles(userRoles)

	// since grant is idempotent, multiple calls won't cause issues in case of retries
	if user.Status == types.UserStatusPendingInvite {
		if err = module.authz.Grant(
			ctx,
			user.OrgID,
			roleNames,
			authtypes.MustNewSubject(authtypes.TypeableUser, user.ID.StringValue(), user.OrgID, nil),
		); err != nil {
			return err
		}

		traitsOrProperties := types.NewTraitsFromUser(user)
		module.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Activated", traitsOrProperties)
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

func (module *setter) UpdatePassword(ctx context.Context, userID valuer.UUID, oldpasswd string, passwd string) error {
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

func (module *setter) GetOrCreateUser(ctx context.Context, user *types.User, opts ...root.CreateUserOption) (*types.User, error) {
	createUserOpts := root.NewCreateUserOptions(opts...)

	existingUser, err := module.getter.GetNonDeletedUserByEmailAndOrgID(ctx, user.Email, user.OrgID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if existingUser != nil {
		if existingUser.Status == types.UserStatusPendingInvite {
			if err = module.activatePendingUser(ctx, existingUser, root.WithRoleNames(createUserOpts.RoleNames)); err != nil {
				return nil, err
			}
		}

		return existingUser, nil
	}

	if err := module.CreateUser(ctx, user, opts...); err != nil {
		return nil, err
	}

	return user, nil
}

func (module *setter) CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error {
	return module.store.CreateAPIKey(ctx, apiKey)
}

func (module *setter) UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error {
	return module.store.UpdateAPIKey(ctx, id, apiKey, updaterID)
}

func (module *setter) ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error) {
	return module.store.ListAPIKeys(ctx, orgID)
}

func (module *setter) GetAPIKey(ctx context.Context, orgID, id valuer.UUID) (*types.StorableAPIKeyUser, error) {
	return module.store.GetAPIKey(ctx, orgID, id)
}

func (module *setter) RevokeAPIKey(ctx context.Context, id, removedByUserID valuer.UUID) error {
	return module.store.RevokeAPIKey(ctx, id, removedByUserID)
}

func (module *setter) CreateFirstUser(ctx context.Context, organization *types.Organization, name string, email valuer.Email, passwd string) (*types.User, error) {
	user, err := types.NewRootUser(name, email, organization.ID)
	if err != nil {
		return nil, err
	}

	password, err := types.NewFactorPassword(passwd, user.ID.StringValue())
	if err != nil {
		return nil, err
	}

	managedRoles := authtypes.NewManagedRoles(organization.ID)
	err = module.authz.CreateManagedUserRoleTransactions(ctx, organization.ID, user.ID)
	if err != nil {
		return nil, err
	}

	roleNames := []string{authtypes.SigNozAdminRoleName}

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

		err = module.CreateUser(ctx, user, root.WithFactorPassword(password), root.WithRoleNames(roleNames))
		if err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return user, nil
}

func (module *setter) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)
	counts, err := module.store.CountByOrgIDAndStatuses(ctx, orgID, []string{types.UserStatusActive.StringValue(), types.UserStatusDeleted.StringValue(), types.UserStatusPendingInvite.StringValue()})
	if err == nil {
		stats["user.count"] = counts[types.UserStatusActive] + counts[types.UserStatusDeleted] + counts[types.UserStatusPendingInvite]
		stats["user.count.active"] = counts[types.UserStatusActive]
		stats["user.count.deleted"] = counts[types.UserStatusDeleted]
		stats["user.count.pending_invite"] = counts[types.UserStatusPendingInvite]
	}

	count, err := module.store.CountAPIKeyByOrgID(ctx, orgID)
	if err == nil {
		stats["factor.api_key.count"] = count
	}

	return stats, nil
}

func (module *setter) createUserWithoutGrant(ctx context.Context, user *types.User, opts ...root.CreateUserOption) error {
	createUserOpts := root.NewCreateUserOptions(opts...)
	if err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := module.store.CreateUser(ctx, user); err != nil {
			return err
		}

		if createUserOpts.FactorPassword != nil {
			if err := module.store.CreatePassword(ctx, createUserOpts.FactorPassword); err != nil {
				return err
			}
		}

		// create user_role entries
		if len(createUserOpts.RoleNames) > 0 {
			err := module.createUserRoleEntries(ctx, user.OrgID, user.ID, createUserOpts.RoleNames)
			if err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return err
	}

	traitsOrProperties := types.NewTraitsFromUser(user)
	module.analytics.IdentifyUser(ctx, user.OrgID.String(), user.ID.String(), traitsOrProperties)
	module.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Created", traitsOrProperties)

	return nil
}

func (module *setter) createUserRoleEntries(ctx context.Context, orgID, userId valuer.UUID, roleNames []string) error {
	roles, err := module.authz.ListByOrgIDAndNames(ctx, orgID, roleNames)
	if err != nil {
		return err
	}

	userRoles := authtypes.NewUserRoles(userId, roles)
	return module.userRoleStore.CreateUserRoles(ctx, userRoles)
}

func (module *setter) activatePendingUser(ctx context.Context, user *types.User, opts ...root.CreateUserOption) error {
	createUserOpts := root.NewCreateUserOptions(opts...)

	if len(createUserOpts.RoleNames) > 0 {
		err := module.authz.Grant(
			ctx,
			user.OrgID,
			createUserOpts.RoleNames,
			authtypes.MustNewSubject(authtypes.TypeableUser, user.ID.StringValue(), user.OrgID, nil),
		)
		if err != nil {
			return err
		}
	}

	if err := user.UpdateStatus(types.UserStatusActive); err != nil {
		return err
	}

	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := module.store.UpdateUser(ctx, user.OrgID, user); err != nil {
			return err
		}

		if len(createUserOpts.RoleNames) > 0 {
			// delete old user_role entries and create new ones from SSO
			if err := module.userRoleStore.DeleteUserRoles(ctx, user.ID); err != nil {
				return err
			}

			return module.createUserRoleEntries(ctx, user.OrgID, user.ID, createUserOpts.RoleNames)
		}

		return nil
	})
	if err != nil {
		return err
	}

	traitsOrProperties := types.NewTraitsFromUser(user)
	module.analytics.TrackUser(ctx, user.OrgID.String(), user.ID.String(), "User Activated", traitsOrProperties)

	return nil
}

func (module *setter) UpdateUserRoles(ctx context.Context, orgID, userID valuer.UUID, finalRoleNames []string) error {
	return module.store.RunInTx(ctx, func(ctx context.Context) error {
		// delete old user_role entries
		if err := module.userRoleStore.DeleteUserRoles(ctx, userID); err != nil {
			return err
		}

		// create fresh ones only if there are roles to assign
		if len(finalRoleNames) > 0 {
			return module.createUserRoleEntries(ctx, orgID, userID, finalRoleNames)
		}

		return nil
	})
}

func (module *setter) AddUserRole(ctx context.Context, orgID, userID valuer.UUID, roleName string) error {
	existingUser, err := module.getter.GetUserByOrgIDAndID(ctx, orgID, userID)
	if err != nil {
		return err
	}

	if err := existingUser.ErrIfRoot(); err != nil {
		return errors.WithAdditionalf(err, "cannot add role for root user")
	}

	if err := existingUser.ErrIfDeleted(); err != nil {
		return errors.WithAdditionalf(err, "cannot add role for deleted user")
	}

	// validate that the role name exists
	foundRoles, err := module.authz.ListByOrgIDAndNames(ctx, orgID, []string{roleName})
	if err != nil {
		return err
	}
	if len(foundRoles) != 1 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "role name not found: %s", roleName)
	}

	// check if user already has this role
	existingUserRoles, err := module.getter.GetRolesByUserID(ctx, existingUser.ID)
	if err != nil {
		return err
	}
	for _, userRole := range existingUserRoles {
		if userRole.Role != nil && userRole.Role.Name == roleName {
			return nil // role already assigned no-op
		}
	}

	// grant via authz (idempotent)
	if err := module.authz.Grant(
		ctx,
		orgID,
		[]string{roleName},
		authtypes.MustNewSubject(authtypes.TypeableUser, existingUser.ID.StringValue(), existingUser.OrgID, nil),
	); err != nil {
		return err
	}

	// create user_role entry
	userRoles := authtypes.NewUserRoles(userID, foundRoles)
	if err := module.userRoleStore.CreateUserRoles(ctx, userRoles); err != nil {
		return err
	}

	return module.tokenizer.DeleteIdentity(ctx, userID)
}

func (module *setter) RemoveUserRole(ctx context.Context, orgID, userID valuer.UUID, roleID valuer.UUID) error {
	existingUser, err := module.getter.GetUserByOrgIDAndID(ctx, orgID, userID)
	if err != nil {
		return err
	}

	if err := existingUser.ErrIfRoot(); err != nil {
		return errors.WithAdditionalf(err, "cannot remove role for root user")
	}

	if err := existingUser.ErrIfDeleted(); err != nil {
		return errors.WithAdditionalf(err, "cannot remove role for deleted user")
	}

	// resolve role name for authz revoke
	existingUserRoles, err := module.getter.GetRolesByUserID(ctx, existingUser.ID)
	if err != nil {
		return err
	}

	var roleName string
	for _, ur := range existingUserRoles {
		if ur.Role != nil && ur.RoleID == roleID {
			roleName = ur.Role.Name
			break
		}
	}
	if roleName == "" {
		return errors.Newf(errors.TypeNotFound, authtypes.ErrCodeUserRolesNotFound, "role %s not found for user %s", roleID, userID)
	}

	// revoke authz grant
	if err := module.authz.Revoke(
		ctx,
		orgID,
		[]string{roleName},
		authtypes.MustNewSubject(authtypes.TypeableUser, existingUser.ID.StringValue(), existingUser.OrgID, nil),
	); err != nil {
		return err
	}

	if err := module.userRoleStore.DeleteUserRoleByUserIDAndRoleID(ctx, userID, roleID); err != nil {
		return err
	}

	return module.tokenizer.DeleteIdentity(ctx, userID)
}

func roleNamesFromUserRoles(userRoles []*authtypes.UserRole) []string {
	names := make([]string, 0, len(userRoles))
	for _, ur := range userRoles {
		if ur.Role != nil {
			names = append(names, ur.Role.Name)
		}
	}
	return names
}
