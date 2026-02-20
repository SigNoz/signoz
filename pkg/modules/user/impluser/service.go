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
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type service struct {
	settings  factory.ScopedProviderSettings
	store     types.UserStore
	module    user.Module
	orgGetter organization.Getter
	authz     authz.AuthZ
	config    user.RootConfig
	stopC     chan struct{}
}

func NewService(
	providerSettings factory.ProviderSettings,
	store types.UserStore,
	module user.Module,
	orgGetter organization.Getter,
	authz authz.AuthZ,
	config user.RootConfig,
) user.Service {
	return &service{
		settings:  factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/pkg/modules/user"),
		store:     store,
		module:    module,
		orgGetter: orgGetter,
		authz:     authz,
		config:    config,
		stopC:     make(chan struct{}),
	}
}

func (s *service) Start(ctx context.Context) error {
	if !s.config.Enabled {
		<-s.stopC
		return nil
	}

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		err := s.reconcile(ctx)
		if err == nil {
			s.settings.Logger().InfoContext(ctx, "root user reconciliation completed successfully")
			<-s.stopC
			return nil
		}

		s.settings.Logger().WarnContext(ctx, "root user reconciliation failed, retrying", "error", err)

		select {
		case <-s.stopC:
			return nil
		case <-ticker.C:
			continue
		}
	}
}

func (s *service) Stop(ctx context.Context) error {
	close(s.stopC)
	return nil
}

func (s *service) reconcile(ctx context.Context) error {
	org, err := s.orgGetter.GetByName(ctx, s.config.Org.Name)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			newOrg := types.NewOrganization(s.config.Org.Name, s.config.Org.Name)
			_, err := s.module.CreateFirstUser(ctx, newOrg, s.config.Email.String(), s.config.Email, s.config.Password)
			return err
		}

		return err
	}

	return s.reconcileRootUser(ctx, org.ID)
}

func (s *service) reconcileRootUser(ctx context.Context, orgID valuer.UUID) error {
	existingRoot, err := s.store.GetRootUserByOrgID(ctx, orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}

	if existingRoot == nil {
		return s.createOrPromoteRootUser(ctx, orgID)
	}

	return s.updateExistingRootUser(ctx, orgID, existingRoot)
}

func (s *service) createOrPromoteRootUser(ctx context.Context, orgID valuer.UUID) error {
	existingUser, err := s.store.GetUserByEmailAndOrgID(ctx, s.config.Email, orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}

	if existingUser != nil {
		oldRole := existingUser.Role

		existingUser.PromoteToRoot()
		if err := s.module.UpdateAnyUser(ctx, orgID, existingUser); err != nil {
			return err
		}

		if oldRole != types.RoleAdmin {
			if err := s.authz.ModifyGrant(ctx,
				orgID,
				roletypes.MustGetSigNozManagedRoleFromExistingRole(oldRole),
				roletypes.MustGetSigNozManagedRoleFromExistingRole(types.RoleAdmin),
				authtypes.MustNewSubject(authtypes.TypeableUser, existingUser.ID.StringValue(), orgID, nil),
			); err != nil {
				return err
			}
		}

		return s.setPassword(ctx, existingUser.ID)
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

	return s.module.CreateUser(ctx, newUser, user.WithFactorPassword(factorPassword))
}

func (s *service) updateExistingRootUser(ctx context.Context, orgID valuer.UUID, existingRoot *types.User) error {
	existingRoot.PromoteToRoot()

	if existingRoot.Email != s.config.Email {
		existingRoot.UpdateEmail(s.config.Email)
		if err := s.module.UpdateAnyUser(ctx, orgID, existingRoot); err != nil {
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
