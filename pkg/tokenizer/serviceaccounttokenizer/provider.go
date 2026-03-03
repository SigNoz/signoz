package serviceaccounttokenizer

import (
	"context"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/dgraph-io/ristretto/v2"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

var (
	emptyOrgID valuer.UUID = valuer.UUID{}
)

const (
	expectedLastObservedAtCacheEntries int64 = 5000 // 1000 serviceAccounts * Max 5 keys per account
)

type provider struct {
	config              tokenizer.Config
	settings            factory.ScopedProviderSettings
	cache               cache.Cache
	apiKeyStore         serviceaccounttypes.Store
	orgGetter           organization.Getter
	stopC               chan struct{}
	lastObservedAtCache *ristretto.Cache[string, time.Time]
}

func NewFactory(cache cache.Cache, apiKeyStore serviceaccounttypes.Store, orgGetter organization.Getter) factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config] {
	return factory.NewProviderFactory(factory.MustNewName("serviceaccount"), func(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config) (tokenizer.Tokenizer, error) {
		return New(ctx, providerSettings, config, cache, apiKeyStore, orgGetter)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config, cache cache.Cache, apiKeyStore serviceaccounttypes.Store, orgGetter organization.Getter) (tokenizer.Tokenizer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/tokenizer/serviceaccounttokenizer")

	// * move these hardcoded values to a config based value when needed
	lastObservedAtCache, err := ristretto.NewCache(&ristretto.Config[string, time.Time]{
		NumCounters: 10 * expectedLastObservedAtCacheEntries, // 10x of expected entries
		MaxCost:     1 << 19,                                 // ~ 512 KB
		BufferItems: 64,
		Metrics:     false,
	})
	if err != nil {
		return nil, err
	}

	return tokenizer.NewWrappedTokenizer(settings, &provider{
		config:              config,
		settings:            settings,
		cache:               cache,
		apiKeyStore:         apiKeyStore,
		orgGetter:           orgGetter,
		stopC:               make(chan struct{}),
		lastObservedAtCache: lastObservedAtCache,
	}), nil
}

func (provider *provider) Start(ctx context.Context) error {
	ticker := time.NewTicker(provider.config.ServiceAccount.GC.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-provider.stopC:
			return nil
		case <-ticker.C:
			ctx, span := provider.settings.Tracer().Start(ctx, "tokenizer.LastObservedAt", trace.WithAttributes(attribute.String("tokenizer.provider", "serviceaccount")))

			orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
			if err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to get orgs data", "error", err)
				span.End()
				continue
			}

			for _, org := range orgs {
				if err := provider.flushLastObservedAt(ctx, org); err != nil {
					span.RecordError(err)
					provider.settings.Logger().ErrorContext(ctx, "failed to flush api keys", "error", err, "org_id", org.ID)
				}
			}

			span.End()
		}
	}
}

func (provider *provider) CreateToken(_ context.Context, _ *authtypes.Identity, _ map[string]string) (*authtypes.Token, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (provider *provider) GetIdentity(ctx context.Context, key string) (*authtypes.Identity, error) {
	apiKey, err := provider.getOrGetSetAPIKey(ctx, key)
	if err != nil {
		return nil, err
	}

	if err := apiKey.IsExpired(); err != nil {
		return nil, err
	}

	identity, err := provider.getOrGetSetIdentity(ctx, apiKey.ServiceAccountID)
	if err != nil {
		return nil, err
	}

	return identity, nil
}

func (provider *provider) RotateToken(_ context.Context, _ string, _ string) (*authtypes.Token, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (provider *provider) DeleteToken(_ context.Context, _ string) error {
	return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (provider *provider) DeleteTokensByUserID(_ context.Context, _ valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (provider *provider) DeleteIdentity(ctx context.Context, serviceAccountID valuer.UUID) error {
	provider.cache.Delete(ctx, emptyOrgID, identityCacheKey(serviceAccountID))
	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)

	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	for _, org := range orgs {
		// flush api keys on stop
		if err := provider.flushLastObservedAt(ctx, org); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to flush tokens", "error", err, "org_id", org.ID)
		}
	}

	return nil
}

func (provider *provider) SetLastObservedAt(ctx context.Context, key string, lastObservedAt time.Time) error {
	apiKey, err := provider.getOrGetSetAPIKey(ctx, key)
	if err != nil {
		return err
	}

	// If we can't update the last observed at, we return nil.
	if err := apiKey.UpdateLastObservedAt(lastObservedAt); err != nil {
		return nil
	}

	if ok := provider.lastObservedAtCache.Set(lastObservedAtCacheKey(key, apiKey.ServiceAccountID), lastObservedAt, 24); !ok {
		provider.settings.Logger().ErrorContext(ctx, "error caching last observed at timestamp", "service_account_id", apiKey.ServiceAccountID)
	}

	err = provider.cache.Set(ctx, emptyOrgID, apiKeyCacheKey(key), apiKey, provider.config.Lifetime.Max)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) Config() tokenizer.Config {
	return provider.config
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	apiKeys, err := provider.apiKeyStore.ListFactorAPIKeyByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	stats := make(map[string]any)
	stats["api_key.count"] = len(apiKeys)

	keyToLastObservedAt, err := provider.listLastObservedAtDesc(ctx, orgID)
	if err != nil {
		return nil, err
	}

	if len(keyToLastObservedAt) == 0 {
		return stats, nil
	}

	keyToLastObservedAtMax := keyToLastObservedAt[0]

	if lastObservedAt, ok := keyToLastObservedAtMax["last_observed_at"].(time.Time); ok {
		if !lastObservedAt.IsZero() {
			stats["api_key.last_observed_at.max.time"] = lastObservedAt.UTC()
			stats["api_key.last_observed_at.max.time_unix"] = lastObservedAt.Unix()
		}
	}

	return stats, nil
}

func (provider *provider) ListMaxLastObservedAtByOrgID(ctx context.Context, orgID valuer.UUID) (map[valuer.UUID]time.Time, error) {
	apiKeyToLastObservedAts, err := provider.listLastObservedAtDesc(ctx, orgID)
	if err != nil {
		return nil, err
	}

	maxLastObservedAtPerServiceAccountID := make(map[valuer.UUID]time.Time)

	for _, apiKeyToLastObservedAt := range apiKeyToLastObservedAts {
		serviceAccountID, ok := apiKeyToLastObservedAt["service_account_id"].(valuer.UUID)
		if !ok {
			continue
		}

		lastObservedAt, ok := apiKeyToLastObservedAt["last_observed_at"].(time.Time)
		if !ok {
			continue
		}

		if lastObservedAt.IsZero() {
			continue
		}

		if _, ok := maxLastObservedAtPerServiceAccountID[serviceAccountID]; !ok {
			maxLastObservedAtPerServiceAccountID[serviceAccountID] = lastObservedAt.UTC()
			continue
		}

		if lastObservedAt.UTC().After(maxLastObservedAtPerServiceAccountID[serviceAccountID]) {
			maxLastObservedAtPerServiceAccountID[serviceAccountID] = lastObservedAt.UTC()
		}
	}

	return maxLastObservedAtPerServiceAccountID, nil

}

func (provider *provider) flushLastObservedAt(ctx context.Context, org *types.Organization) error {
	apiKeyToLastObservedAt, err := provider.listLastObservedAtDesc(ctx, org.ID)
	if err != nil {
		return err
	}

	if err := provider.apiKeyStore.UpdateLastObservedAtByKey(ctx, apiKeyToLastObservedAt); err != nil {
		return err
	}

	return nil
}

func (provider *provider) getOrGetSetAPIKey(ctx context.Context, key string) (*serviceaccounttypes.FactorAPIKey, error) {
	apiKey := new(serviceaccounttypes.FactorAPIKey)
	err := provider.cache.Get(ctx, emptyOrgID, apiKeyCacheKey(key), apiKey)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if err == nil {
		return apiKey, nil
	}

	storable, err := provider.apiKeyStore.GetFactorAPIKeyByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	apiKey = serviceaccounttypes.NewFactorAPIKeyFromStorable(storable)

	err = provider.cache.Set(ctx, emptyOrgID, apiKeyCacheKey(key), apiKey, provider.config.Lifetime.Max)
	if err != nil {
		return nil, err
	}

	return apiKey, nil
}

func (provider *provider) setIdentity(ctx context.Context, identity *authtypes.Identity) error {
	err := provider.cache.Set(ctx, emptyOrgID, identityCacheKey(identity.UserID), identity, 0)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) getOrGetSetIdentity(ctx context.Context, serviceAccountID valuer.UUID) (*authtypes.Identity, error) {
	identity := new(authtypes.Identity)
	err := provider.cache.Get(ctx, emptyOrgID, identityCacheKey(serviceAccountID), identity)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if err == nil {
		return identity, nil
	}

	storableServiceAccount, err := provider.apiKeyStore.GetByID(ctx, serviceAccountID)
	if err != nil {
		return nil, err
	}

	identity = storableServiceAccount.ToIdentity()
	err = provider.cache.Set(ctx, emptyOrgID, identityCacheKey(serviceAccountID), identity, 0)
	if err != nil {
		return nil, err
	}

	return identity, nil
}

func (provider *provider) listLastObservedAtDesc(ctx context.Context, orgID valuer.UUID) ([]map[string]any, error) {
	apiKeys, err := provider.apiKeyStore.ListFactorAPIKeyByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	var keyToLastObservedAt []map[string]any

	for _, key := range apiKeys {
		keyCachedLastObservedAt, ok := provider.lastObservedAtCache.Get(lastObservedAtCacheKey(key.Key, valuer.MustNewUUID(key.ServiceAccountID)))
		if ok {
			keyToLastObservedAt = append(keyToLastObservedAt, map[string]any{
				"service_account_id": key.ServiceAccountID,
				"key":                key.Key,
				"last_observed_at":   keyCachedLastObservedAt,
			})
		}
	}

	// sort by descending order of last_observed_at
	slices.SortFunc(keyToLastObservedAt, func(a, b map[string]any) int {
		return b["last_observed_at"].(time.Time).Compare(a["last_observed_at"].(time.Time))
	})

	return keyToLastObservedAt, nil
}

func apiKeyCacheKey(apiKey string) string {
	return "api_key::" + cachetypes.NewSha1CacheKey(apiKey)
}

func identityCacheKey(serviceAccountID valuer.UUID) string {
	return "identity::" + serviceAccountID.String()
}

func lastObservedAtCacheKey(apiKey string, serviceAccountID valuer.UUID) string {
	return "api_key::" + apiKey + "::" + serviceAccountID.String()
}
