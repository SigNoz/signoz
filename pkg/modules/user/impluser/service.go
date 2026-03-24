package impluser

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type service struct {
	settings  factory.ScopedProviderSettings
	store     types.UserStore
	getter    user.Getter
	setter    user.Setter
	orgGetter organization.Getter
	authz     authz.AuthZ
	config    user.RootConfig
	stopC     chan struct{}
	healthyC  chan struct{}
}

func NewService(
	providerSettings factory.ProviderSettings,
	store types.UserStore,
	getter user.Getter,
	setter user.Setter,
	orgGetter organization.Getter,
	authz authz.AuthZ,
	config user.RootConfig,
) user.Service {
	return &service{
		settings:  factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/pkg/modules/user"),
		store:     store,
		getter:    getter,
		setter:    setter,
		orgGetter: orgGetter,
		authz:     authz,
		config:    config,
		stopC:    make(chan struct{}),
		healthyC: make(chan struct{}),
	}
}

func (s *service) Start(ctx context.Context) error {
	if !s.config.Enabled {
		close(s.healthyC)
		<-s.stopC
		return nil
	}

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		err := s.reconcile(ctx)
		if err == nil {
			s.settings.Logger().InfoContext(ctx, "root user reconciliation completed successfully")
			close(s.healthyC)
			<-s.stopC
			return nil
		}

		s.settings.Logger().WarnContext(ctx, "root user reconciliation failed, retrying", errors.Attr(err))

		select {
		case <-s.stopC:
			return nil
		case <-ticker.C:
			continue
		}
	}
}

func (s *service) Healthy() <-chan struct{} {
	return s.healthyC
}

func (s *service) Stop(ctx context.Context) error {
	close(s.stopC)
	return nil
}

func (s *service) reconcile(ctx context.Context) error {
	org, resolvedByName, err := s.orgGetter.GetByIDOrName(ctx, s.config.Org.ID, s.config.Org.Name)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return err // something really went wrong
		}

		if s.config.Org.ID.IsZero() {
			newOrg := types.NewOrganization(s.config.Org.Name, s.config.Org.Name)
			_, err := s.setter.CreateFirstUser(ctx, newOrg, s.config.Email.String(), s.config.Email, s.config.Password)
			return err
		}

		newOrg := types.NewOrganizationWithID(s.config.Org.ID, s.config.Org.Name, s.config.Org.Name)
		_, err = s.setter.CreateFirstUser(ctx, newOrg, s.config.Email.String(), s.config.Email, s.config.Password)
		return err
	}

	if !s.config.Org.ID.IsZero() && resolvedByName {
		// the existing org has the same name as config but org id is different; inform user with actionable message
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "organization with name %q already exists with a different ID %s (expected %s)", s.config.Org.Name, org.ID.StringValue(), s.config.Org.ID.StringValue())
	}

	return s.reconcileRootUser(ctx, org.ID)
}

func (s *service) reconcileRootUser(ctx context.Context, orgID valuer.UUID) error {
	existingStorableRoot, err := s.store.GetRootUserByOrgID(ctx, orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}

	if existingStorableRoot == nil {
		return s.createOrPromoteRootUser(ctx, orgID)
	}

	return s.updateExistingRootUser(ctx, orgID, existingStorableRoot)
}

func (s *service) createOrPromoteRootUser(ctx context.Context, orgID valuer.UUID) error {
	existingUser, err := s.getter.GetNonDeletedUserByEmailAndOrgID(ctx, s.config.Email, orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}

	if existingUser != nil {
		userRoles, err := s.getter.GetUserRoles(ctx, existingUser.ID)
		if err != nil {
			return err
		}

		existingUserRoleNames := make([]string, len(userRoles))
		for idx, userRole := range userRoles {
			existingUserRoleNames[idx] = userRole.Role.Name
		}

		// idempotent - safe to retry can't put this in a txn
		if err := s.authz.ModifyGrant(ctx,
			orgID,
			existingUserRoleNames,
			[]string{authtypes.SigNozAdminRoleName},
			authtypes.MustNewSubject(authtypes.TypeableUser, existingUser.ID.StringValue(), orgID, nil),
		); err != nil {
			return err
		}

		existingUser.PromoteToRoot()

		err = s.store.RunInTx(ctx, func(ctx context.Context) error {
			// update users table
			deprecatedUser := types.NewDeprecatedUserFromUserAndRole(existingUser, types.RoleAdmin)
			if err := s.setter.UpdateAnyUser(ctx, orgID, deprecatedUser); err != nil {
				return err
			}

			// update user_role entries
			if err := s.setter.UpdateUserRoles(
				ctx,
				existingUser.OrgID,
				existingUser.ID,
				[]string{authtypes.SigNozAdminRoleName},
			); err != nil {
				return err
			}

			// set password
			return s.setPassword(ctx, existingUser.ID)
		})
		if err != nil {
			return err
		}

		return nil
	}

	// Create new root user
	newUser, err := types.NewRootUser(s.config.Email.String(), s.config.Email, orgID)
	if err != nil {
		return err
	}

	factorPassword, err := types.NewFactorPassword(s.config.Password, newUser.ID.StringValue())
	if err != nil {
		return err
	}

	return s.setter.CreateUser(ctx, newUser, user.WithFactorPassword(factorPassword), user.WithRoleNames([]string{authtypes.SigNozAdminRoleName}))
}

func (s *service) updateExistingRootUser(ctx context.Context, orgID valuer.UUID, existingRoot *types.User) error {
	existingRoot.PromoteToRoot()

	if existingRoot.Email != s.config.Email {
		existingRoot.UpdateEmail(s.config.Email)
		deprecatedUser := types.NewDeprecatedUserFromUserAndRole(existingRoot, types.RoleAdmin)
		if err := s.setter.UpdateAnyUser(ctx, orgID, deprecatedUser); err != nil {
			return err
		}
	}

	return s.setPassword(ctx, existingRoot.ID)
}

func (s *service) setPassword(ctx context.Context, userID valuer.UUID) error {
	password, err := s.store.GetPasswordByUserID(ctx, userID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return err
		}

		factorPassword, err := types.NewFactorPassword(s.config.Password, userID.StringValue())
		if err != nil {
			return err
		}

		return s.store.CreatePassword(ctx, factorPassword)
	}

	if !password.Equals(s.config.Password) {
		if err := password.Update(s.config.Password); err != nil {
			return err
		}

		return s.store.UpdatePassword(ctx, password)
	}

	return nil
}
