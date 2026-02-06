package implrootuser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/rootuser"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type reconciler struct {
	store     types.RootUserStore
	settings  factory.ScopedProviderSettings
	orgGetter organization.Getter
	config    user.RootUserConfig
}

func NewReconciler(store types.RootUserStore, settings factory.ProviderSettings, orgGetter organization.Getter, config user.RootUserConfig) rootuser.Reconciler {
	scopedSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/rootuser/implrootuser/reconciler")

	return &reconciler{
		store:     store,
		settings:  scopedSettings,
		orgGetter: orgGetter,
		config:    config,
	}
}

func (r *reconciler) Reconcile(ctx context.Context) error {
	if !r.config.IsConfigured() {
		r.settings.Logger().InfoContext(ctx, "reconciler: root user is not configured, skipping reconciliation")
		return nil
	}

	r.settings.Logger().InfoContext(ctx, "reconciler: reconciling root user(s)")

	// get the organizations that are owned by this instance of signoz
	orgs, err := r.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to get list of organizations owned by this instance of signoz")
	}

	if len(orgs) == 0 {
		r.settings.Logger().InfoContext(ctx, "reconciler: no organizations owned by this instance of signoz, skipping reconciliation")
		return nil
	}

	for _, org := range orgs {
		r.settings.Logger().InfoContext(ctx, "reconciler: reconciling root user for organization", "organization_id", org.ID, "organization_name", org.Name)

		err := r.reconcileRootUserForOrg(ctx, org)
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "reconciler: failed to reconcile root user for organization %s (%s)", org.Name, org.ID)
		}

		r.settings.Logger().InfoContext(ctx, "reconciler: root user reconciled for organization", "organization_id", org.ID, "organization_name", org.Name)
	}

	r.settings.Logger().InfoContext(ctx, "reconciler: reconciliation complete")

	return nil
}

func (r *reconciler) reconcileRootUserForOrg(ctx context.Context, org *types.Organization) error {
	// check if the root user already exists for the org
	existingRootUser, err := r.store.GetByOrgID(ctx, org.ID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}

	if existingRootUser != nil {
		// make updates to the existing root user if needed
		return r.updateRootUserForOrg(ctx, org.ID, existingRootUser)
	}

	// create a new root user
	return r.createRootUserForOrg(ctx, org.ID)
}

func (r *reconciler) createRootUserForOrg(ctx context.Context, orgID valuer.UUID) error {
	rootUser, err := types.NewRootUser(
		valuer.MustNewEmail(r.config.Email),
		r.config.Password,
		orgID,
	)
	if err != nil {
		return err
	}

	r.settings.Logger().InfoContext(ctx, "reconciler: creating new root user for organization", "organization_id", orgID, "email", r.config.Email)

	err = r.store.Create(ctx, rootUser)
	if err != nil {
		return err
	}

	r.settings.Logger().InfoContext(ctx, "reconciler: root user created for organization", "organization_id", orgID, "email", r.config.Email)

	return nil
}

func (r *reconciler) updateRootUserForOrg(ctx context.Context, orgID valuer.UUID, rootUser *types.RootUser) error {
	needsUpdate := false

	if rootUser.Email != valuer.MustNewEmail(r.config.Email) {
		rootUser.Email = valuer.MustNewEmail(r.config.Email)
		needsUpdate = true
	}

	if !rootUser.VerifyPassword(r.config.Password) {
		passwordHash, err := types.NewHashedPassword(r.config.Password)
		if err != nil {
			return err
		}
		rootUser.PasswordHash = passwordHash
		needsUpdate = true
	}

	if needsUpdate {
		r.settings.Logger().InfoContext(ctx, "reconciler: updating root user for organization", "organization_id", orgID, "email", r.config.Email)
		err := r.store.Update(ctx, orgID, rootUser.ID, rootUser)
		if err != nil {
			return err
		}
		r.settings.Logger().InfoContext(ctx, "reconciler: root user updated for organization", "organization_id", orgID, "email", r.config.Email)
		return nil
	}

	return nil
}
