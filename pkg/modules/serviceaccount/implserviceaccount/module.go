package implserviceaccount

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	emptyOrgID valuer.UUID = valuer.UUID{}
)

type module struct {
	store     serviceaccounttypes.Store
	authz     authz.AuthZ
	cache     cache.Cache
	analytics analytics.Analytics
	settings  factory.ScopedProviderSettings
	config    serviceaccount.Config
}

func NewModule(store serviceaccounttypes.Store, authz authz.AuthZ, cache cache.Cache, analytics analytics.Analytics, providerSettings factory.ProviderSettings, config serviceaccount.Config) serviceaccount.Module {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/serviceaccount/implserviceaccount")
	return &module{store: store, authz: authz, cache: cache, analytics: analytics, settings: settings, config: config}
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, serviceAccount *serviceaccounttypes.ServiceAccount) error {
	err := module.store.Create(ctx, serviceAccount)
	if err != nil {
		return err
	}

	module.identifyUser(ctx, orgID.String(), serviceAccount.ID.String(), serviceAccount.Traits())
	module.trackUser(ctx, orgID.String(), serviceAccount.ID.String(), "Service Account Created", serviceAccount.Traits())
	return nil
}

func (module *module) GetOrCreate(ctx context.Context, orgID valuer.UUID, serviceAccountWithRoles *serviceaccounttypes.ServiceAccount) (*serviceaccounttypes.ServiceAccount, error) {
	existingServiceAccount, err := module.GetActiveByOrgIDAndName(ctx, serviceAccountWithRoles.OrgID, serviceAccountWithRoles.Name)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if existingServiceAccount != nil {
		return existingServiceAccount, nil
	}

	err = module.Create(ctx, orgID, serviceAccountWithRoles)
	if err != nil {
		return nil, err
	}

	return serviceAccountWithRoles, nil
}

func (module *module) GetActiveByOrgIDAndName(ctx context.Context, orgID valuer.UUID, name string) (*serviceaccounttypes.ServiceAccount, error) {
	serviceAccount, err := module.store.GetActiveByOrgIDAndName(ctx, orgID, name)
	if err != nil {
		return nil, err
	}

	return module.Get(ctx, orgID, serviceAccount.ID)
}

func (module *module) GetWithRoles(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.ServiceAccountWithRoles, error) {
	serviceAccountWithRoles, err := module.store.GetWithRoles(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return serviceAccountWithRoles, nil
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.ServiceAccount, error) {
	storableServiceAccount, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return storableServiceAccount, nil
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*serviceaccounttypes.ServiceAccount, error) {
	serviceAccounts, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return serviceAccounts, nil
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, input *serviceaccounttypes.ServiceAccount) error {
	err := module.store.Update(ctx, orgID, input)
	if err != nil {
		return err
	}

	module.identifyUser(ctx, orgID.String(), input.ID.String(), input.Traits())
	module.trackUser(ctx, orgID.String(), input.ID.String(), "Service Account Updated", input.Traits())
	return nil
}

func (module *module) SetRole(ctx context.Context, orgID valuer.UUID, id valuer.UUID, roleID valuer.UUID) error {
	role, err := module.authz.Get(ctx, orgID, roleID)
	if err != nil {
		return err
	}

	return module.setRole(ctx, orgID, id, role)
}

func (module *module) SetRoleByName(ctx context.Context, orgID valuer.UUID, id valuer.UUID, name string) error {
	role, err := module.authz.GetByOrgIDAndName(ctx, orgID, name)
	if err != nil {
		return err
	}

	return module.setRole(ctx, orgID, id, role)
}

func (module *module) DeleteRole(ctx context.Context, orgID valuer.UUID, id valuer.UUID, roleID valuer.UUID) error {
	role, err := module.authz.Get(ctx, orgID, roleID)
	if err != nil {
		return err
	}

	serviceAccount, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	err = serviceAccount.ErrIfDeleted()
	if err != nil {
		return err
	}

	err = module.store.DeleteServiceAccountRole(ctx, serviceAccount.ID, roleID)
	if err != nil {
		return err
	}

	err = module.authz.Revoke(ctx, orgID, []string{role.Name}, authtypes.MustNewSubject(authtypes.TypeableServiceAccount, id.String(), orgID, nil))
	if err != nil {
		return err
	}

	return nil
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	serviceAccount, err := module.GetWithRoles(ctx, orgID, id)
	if err != nil {
		return err
	}

	err = serviceAccount.UpdateStatus(serviceaccounttypes.ServiceAccountStatusDeleted)
	if err != nil {
		return err
	}

	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		// revoke all the API keys on disable
		err := module.store.RevokeAllFactorAPIKeys(ctx, id)
		if err != nil {
			return err
		}

		// update the status but do not delete the role mappings as we will use them for audits
		err = module.store.Update(ctx, orgID, serviceAccount.ServiceAccount)
		if err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}

	err = module.authz.Revoke(ctx, orgID, serviceAccount.RoleNames(), authtypes.MustNewSubject(authtypes.TypeableServiceAccount, id.StringValue(), orgID, nil))
	if err != nil {
		return err
	}

	// delete the cache when updating status for service account
	module.cache.Delete(ctx, emptyOrgID, identityCacheKey(id))

	module.identifyUser(ctx, orgID.String(), id.String(), serviceAccount.Traits())
	module.trackUser(ctx, orgID.String(), id.String(), "Service Account Deleted", map[string]any{})
	return nil
}

func (module *module) CreateFactorAPIKey(ctx context.Context, factorAPIKey *serviceaccounttypes.FactorAPIKey) error {
	err := module.store.CreateFactorAPIKey(ctx, factorAPIKey)
	if err != nil {
		return err
	}

	serviceAccount, err := module.store.GetByID(ctx, factorAPIKey.ServiceAccountID)
	if err == nil {
		module.trackUser(ctx, serviceAccount.OrgID.StringValue(), serviceAccount.ID.String(), "API Key created", factorAPIKey.Traits())
	}

	return nil
}

func (module *module) GetOrCreateFactorAPIKey(ctx context.Context, factorAPIKey *serviceaccounttypes.FactorAPIKey) (*serviceaccounttypes.FactorAPIKey, error) {
	existingFactorAPIKey, err := module.store.GetFactorAPIKeyByName(ctx, factorAPIKey.ServiceAccountID, factorAPIKey.Name)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if existingFactorAPIKey != nil {
		return existingFactorAPIKey, nil
	}

	err = module.CreateFactorAPIKey(ctx, factorAPIKey)
	if err != nil {
		return nil, err
	}

	return factorAPIKey, nil
}

func (module *module) GetFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID, id valuer.UUID) (*serviceaccounttypes.FactorAPIKey, error) {
	factorAPIKey, err := module.store.GetFactorAPIKey(ctx, serviceAccountID, id)
	if err != nil {
		return nil, err
	}

	return factorAPIKey, nil
}

func (module *module) ListFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID) ([]*serviceaccounttypes.FactorAPIKey, error) {
	factorAPIKeys, err := module.store.ListFactorAPIKey(ctx, serviceAccountID)
	if err != nil {
		return nil, err
	}

	return factorAPIKeys, nil
}

func (module *module) UpdateFactorAPIKey(ctx context.Context, orgID valuer.UUID, serviceAccountID valuer.UUID, factorAPIKey *serviceaccounttypes.FactorAPIKey) error {
	err := module.store.UpdateFactorAPIKey(ctx, serviceAccountID, factorAPIKey)
	if err != nil {
		return err
	}

	// delete the cache when updating the factor api key
	module.cache.Delete(ctx, emptyOrgID, apiKeyCacheKey(factorAPIKey.Key))
	module.trackUser(ctx, orgID.String(), serviceAccountID.String(), "API Key updated", factorAPIKey.Traits())
	return nil
}

func (module *module) RevokeFactorAPIKey(ctx context.Context, serviceAccountID valuer.UUID, id valuer.UUID) error {
	factorAPIKey, err := module.GetFactorAPIKey(ctx, serviceAccountID, id)
	if err != nil {
		return err
	}

	err = module.store.RevokeFactorAPIKey(ctx, serviceAccountID, id)
	if err != nil {
		return err
	}

	serviceAccount, err := module.store.GetByID(ctx, serviceAccountID)
	if err != nil {
		return err
	}

	// delete the cache when revoking the factor api key
	module.cache.Delete(ctx, emptyOrgID, apiKeyCacheKey(factorAPIKey.Key))
	module.trackUser(ctx, serviceAccount.OrgID.StringValue(), serviceAccountID.String(), "API Key revoked", factorAPIKey.Traits())
	return nil
}

func (module *module) Config() serviceaccount.Config {
	return module.config
}

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	count, err := module.store.CountByOrgID(ctx, orgID)
	if err == nil {
		stats["serviceaccount.count"] = count
	}

	count, err = module.store.CountFactorAPIKeysByOrgID(ctx, orgID)
	if err == nil {
		stats["serviceaccount.keys.count"] = count
	}

	return stats, nil
}

func (module *module) GetIdentity(ctx context.Context, key string) (*authtypes.Identity, error) {
	apiKey, err := module.getOrGetSetAPIKey(ctx, key)
	if err != nil {
		return nil, err
	}

	if err := apiKey.IsExpired(); err != nil {
		return nil, err
	}

	identity, err := module.getOrGetSetIdentity(ctx, apiKey.ServiceAccountID)
	if err != nil {
		return nil, err
	}

	return identity, nil
}

func (module *module) SetLastObservedAt(ctx context.Context, key string, lastObservedAt time.Time) error {
	return module.store.UpdateLastObservedAt(ctx, key, lastObservedAt)
}

func (module *module) getOrGetSetAPIKey(ctx context.Context, key string) (*serviceaccounttypes.FactorAPIKey, error) {
	factorAPIKey := new(serviceaccounttypes.FactorAPIKey)
	err := module.cache.Get(ctx, emptyOrgID, apiKeyCacheKey(key), factorAPIKey)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if err == nil {
		return factorAPIKey, nil
	}

	factorAPIKey, err = module.store.GetFactorAPIKeyByKey(ctx, key)
	if err != nil {
		return nil, err
	}

	err = module.cache.Set(ctx, emptyOrgID, apiKeyCacheKey(key), factorAPIKey, time.Duration(factorAPIKey.ExpiresAt))
	if err != nil {
		return nil, err
	}

	return factorAPIKey, nil
}

func (module *module) getOrGetSetIdentity(ctx context.Context, serviceAccountID valuer.UUID) (*authtypes.Identity, error) {
	identity := new(authtypes.Identity)
	err := module.cache.Get(ctx, emptyOrgID, identityCacheKey(serviceAccountID), identity)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if err == nil {
		return identity, nil
	}

	storableServiceAccount, err := module.store.GetByID(ctx, serviceAccountID)
	if err != nil {
		return nil, err
	}

	identity = storableServiceAccount.ToIdentity()
	err = module.cache.Set(ctx, emptyOrgID, identityCacheKey(serviceAccountID), identity, 0)
	if err != nil {
		return nil, err
	}

	return identity, nil
}

func (module *module) setRole(ctx context.Context, orgID valuer.UUID, id valuer.UUID, role *authtypes.Role) error {
	serviceAccount, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	serviceAccountRole, err := serviceAccount.AddRole(role)
	if err != nil {
		return err
	}

	err = module.store.CreateServiceAccountRole(ctx, serviceAccountRole)
	if err != nil {
		return err
	}

	err = module.authz.Grant(ctx, orgID, []string{role.Name}, authtypes.MustNewSubject(authtypes.TypeableServiceAccount, id.String(), orgID, nil))
	if err != nil {
		return err
	}

	return nil
}

func (module *module) trackUser(ctx context.Context, orgID string, userID string, event string, attrs map[string]any) {
	if module.config.Analytics.Enabled {
		module.analytics.TrackUser(ctx, orgID, userID, event, attrs)
	}
}

func (module *module) identifyUser(ctx context.Context, orgID string, userID string, traits map[string]any) {
	if module.config.Analytics.Enabled {
		module.analytics.IdentifyUser(ctx, orgID, userID, traits)
	}
}

func apiKeyCacheKey(apiKey string) string {
	return "api_key::" + cachetypes.NewSha1CacheKey(apiKey)
}

func identityCacheKey(serviceAccountID valuer.UUID) string {
	return "identity::" + serviceAccountID.String()
}
