package opaquetokenizer

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
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/dgraph-io/ristretto/v2"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

var (
	emptyOrgID valuer.UUID = valuer.UUID{}
)

const (
	expectedLastObservedAtCacheEntries int64 = 5000 // 1000 users * Max 5 tokens per user
)

type provider struct {
	config              tokenizer.Config
	settings            factory.ScopedProviderSettings
	cache               cache.Cache
	tokenStore          authtypes.TokenStore
	orgGetter           organization.Getter
	stopC               chan struct{}
	lastObservedAtCache *ristretto.Cache[string, time.Time]
}

func NewFactory(cache cache.Cache, tokenStore authtypes.TokenStore, orgGetter organization.Getter) factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config] {
	return factory.NewProviderFactory(factory.MustNewName("opaque"), func(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config) (tokenizer.Tokenizer, error) {
		return New(ctx, providerSettings, config, cache, tokenStore, orgGetter)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config, cache cache.Cache, tokenStore authtypes.TokenStore, orgGetter organization.Getter) (tokenizer.Tokenizer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/tokenizer/opaquetokenizer")

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
		tokenStore:          tokenStore,
		orgGetter:           orgGetter,
		stopC:               make(chan struct{}),
		lastObservedAtCache: lastObservedAtCache,
	}), nil
}

func (provider *provider) Start(ctx context.Context) error {
	ticker := time.NewTicker(provider.config.Opaque.GC.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-provider.stopC:
			return nil
		case <-ticker.C:
			ctx, span := provider.settings.Tracer().Start(ctx, "tokenizer.GC", trace.WithAttributes(attribute.String("tokenizer.provider", provider.config.Provider)))

			orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
			if err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to get orgs data", "error", err)
				span.End()
				continue
			}

			for _, org := range orgs {
				if err := provider.gc(ctx, org); err != nil {
					span.RecordError(err)
					provider.settings.Logger().ErrorContext(ctx, "failed to garbage collect tokens", "error", err, "org_id", org.ID)
				}

				if err := provider.flushLastObservedAt(ctx, org); err != nil {
					span.RecordError(err)
					provider.settings.Logger().ErrorContext(ctx, "failed to flush tokens", "error", err, "org_id", org.ID)
				}
			}

			span.End()
		}
	}
}

func (provider *provider) CreateToken(ctx context.Context, identity *authtypes.Identity, meta map[string]string) (*authtypes.Token, error) {
	existingTokens, err := provider.tokenStore.ListByUserID(ctx, identity.UserID)
	if err != nil {
		return nil, err
	}

	if len(existingTokens) >= provider.config.Opaque.Token.MaxPerUser {
		slices.SortFunc(existingTokens, func(a, b *authtypes.Token) int {
			return a.CreatedAt.Compare(b.CreatedAt)
		})

		if err := provider.DeleteToken(ctx, existingTokens[0].AccessToken); err != nil {
			return nil, err
		}
	}

	token, err := authtypes.NewToken(meta, identity.UserID)
	if err != nil {
		return nil, err
	}

	if err := provider.setToken(ctx, token, true); err != nil {
		return nil, err
	}

	if err := provider.setIdentity(ctx, identity); err != nil {
		return nil, err
	}

	return token, nil
}

func (provider *provider) GetIdentity(ctx context.Context, accessToken string) (*authtypes.Identity, error) {
	token, err := provider.getOrGetSetToken(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	if err := token.IsValid(provider.config.Rotation.Interval, provider.config.Lifetime.Idle, provider.config.Lifetime.Max); err != nil {
		return nil, err
	}

	identity, err := provider.getOrGetSetIdentity(ctx, token.UserID)
	if err != nil {
		return nil, err
	}

	return identity, nil
}

func (provider *provider) RotateToken(ctx context.Context, accessToken string, refreshToken string) (*authtypes.Token, error) {
	var rotatedToken *authtypes.Token

	if err := provider.tokenStore.GetOrUpdateByAccessTokenOrPrevAccessToken(ctx, accessToken, func(ctx context.Context, token *authtypes.StorableToken) error {
		if err := token.Rotate(accessToken, refreshToken, provider.config.Rotation.Duration, provider.config.Lifetime.Idle, provider.config.Lifetime.Max); err != nil {
			return err
		}

		// If the token passed the Rotate method and is the same as the input token, return the same token.
		if token.AccessToken == accessToken && token.RefreshToken == refreshToken {
			rotatedToken = token
			return nil
		}

		if err := provider.setToken(ctx, token, false); err != nil {
			return err
		}

		// Delete the previous access token from the cache
		provider.cache.Delete(ctx, emptyOrgID, accessTokenCacheKey(accessToken))

		rotatedToken = token
		return nil
	}); err != nil {
		// If the token is not found, return an unauthenticated error.
		if errors.Ast(err, errors.TypeNotFound) {
			return nil, errors.Wrap(err, errors.TypeUnauthenticated, errors.CodeUnauthenticated, "invalid access token")
		}

		return nil, err
	}

	return rotatedToken, nil
}

func (provider *provider) DeleteToken(ctx context.Context, accessToken string) error {
	provider.cache.Delete(ctx, emptyOrgID, accessTokenCacheKey(accessToken))
	if err := provider.tokenStore.DeleteByAccessToken(ctx, accessToken); err != nil {
		return err
	}

	return nil
}

func (provider *provider) DeleteTokensByUserID(ctx context.Context, userID valuer.UUID) error {
	tokens, err := provider.tokenStore.ListByUserID(ctx, userID)
	if err != nil {
		return err
	}

	for _, token := range tokens {
		provider.cache.Delete(ctx, emptyOrgID, accessTokenCacheKey(token.AccessToken))
	}

	if err := provider.tokenStore.DeleteByUserID(ctx, userID); err != nil {
		return err
	}

	return nil
}

func (provider *provider) DeleteIdentity(ctx context.Context, userID valuer.UUID) error {
	provider.cache.Delete(ctx, emptyOrgID, identityCacheKey(userID))
	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)

	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	for _, org := range orgs {
		// garbage collect tokens on stop
		if err := provider.gc(ctx, org); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to garbage collect tokens", "error", err, "org_id", org.ID)
		}

		// flush tokens on stop
		if err := provider.flushLastObservedAt(ctx, org); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to flush tokens", "error", err, "org_id", org.ID)
		}
	}

	return nil
}

func (provider *provider) SetLastObservedAt(ctx context.Context, accessToken string, lastObservedAt time.Time) error {
	token, err := provider.getOrGetSetToken(ctx, accessToken)
	if err != nil {
		return err
	}

	// If we can't update the last observed at, we return nil.
	if err := token.UpdateLastObservedAt(lastObservedAt); err != nil {
		return nil
	}

	if ok := provider.lastObservedAtCache.Set(lastObservedAtCacheKey(accessToken, token.UserID), lastObservedAt, 24); !ok {
		provider.settings.Logger().ErrorContext(ctx, "error caching last observed at timestamp", "user_id", token.UserID)
	}

	err = provider.cache.Set(ctx, emptyOrgID, accessTokenCacheKey(accessToken), token, provider.config.Lifetime.Max)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) Config() tokenizer.Config {
	return provider.config
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	tokens, err := provider.tokenStore.ListByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	stats := make(map[string]any)
	stats["auth_token.count"] = len(tokens)

	accessTokenToLastObservedAt, err := provider.listLastObservedAtDesc(ctx, orgID)
	if err != nil {
		return nil, err
	}

	if len(accessTokenToLastObservedAt) == 0 {
		return stats, nil
	}

	accessTokenToLastObservedAtMax := accessTokenToLastObservedAt[0]

	if lastObservedAt, ok := accessTokenToLastObservedAtMax["last_observed_at"].(time.Time); ok {
		if !lastObservedAt.IsZero() {
			stats["auth_token.last_observed_at.max.time"] = lastObservedAt.UTC()
			stats["auth_token.last_observed_at.max.time_unix"] = lastObservedAt.Unix()
		}
	}

	return stats, nil
}

func (provider *provider) ListMaxLastObservedAtByOrgID(ctx context.Context, orgID valuer.UUID) (map[valuer.UUID]time.Time, error) {
	accessTokenToLastObservedAts, err := provider.listLastObservedAtDesc(ctx, orgID)
	if err != nil {
		return nil, err
	}

	maxLastObservedAtPerUserID := make(map[valuer.UUID]time.Time)

	for _, accessTokenToLastObservedAt := range accessTokenToLastObservedAts {
		userID, ok := accessTokenToLastObservedAt["user_id"].(valuer.UUID)
		if !ok {
			continue
		}

		lastObservedAt, ok := accessTokenToLastObservedAt["last_observed_at"].(time.Time)
		if !ok {
			continue
		}

		if lastObservedAt.IsZero() {
			continue
		}

		if _, ok := maxLastObservedAtPerUserID[userID]; !ok {
			maxLastObservedAtPerUserID[userID] = lastObservedAt.UTC()
			continue
		}

		if lastObservedAt.UTC().After(maxLastObservedAtPerUserID[userID]) {
			maxLastObservedAtPerUserID[userID] = lastObservedAt.UTC()
		}
	}

	return maxLastObservedAtPerUserID, nil

}

func (provider *provider) gc(ctx context.Context, org *types.Organization) error {
	tokens, err := provider.tokenStore.ListByOrgID(ctx, org.ID)
	if err != nil {
		return err
	}

	var tokensToDelete []valuer.UUID
	for _, token := range tokens {
		if err := token.IsExpired(provider.config.Lifetime.Idle, provider.config.Lifetime.Max); err != nil {
			tokensToDelete = append(tokensToDelete, token.ID)
		}
	}

	if len(tokensToDelete) > 0 {
		err := provider.tokenStore.DeleteMany(ctx, tokensToDelete)
		if err != nil {
			return err
		}
	}

	return nil
}

func (provider *provider) flushLastObservedAt(ctx context.Context, org *types.Organization) error {
	accessTokenToLastObservedAt, err := provider.listLastObservedAtDesc(ctx, org.ID)
	if err != nil {
		return err
	}

	if err := provider.tokenStore.UpdateLastObservedAtByAccessToken(ctx, accessTokenToLastObservedAt); err != nil {
		return err
	}

	return nil
}

func (provider *provider) getOrGetSetToken(ctx context.Context, accessToken string) (*authtypes.Token, error) {
	token := new(authtypes.Token)
	err := provider.cache.Get(ctx, emptyOrgID, accessTokenCacheKey(accessToken), token)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if err == nil {
		return token, nil
	}

	token, err = provider.tokenStore.GetByAccessToken(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	err = provider.cache.Set(ctx, emptyOrgID, accessTokenCacheKey(accessToken), token, provider.config.Lifetime.Max)
	if err != nil {
		return nil, err
	}

	return token, nil
}

func (provider *provider) setToken(ctx context.Context, token *authtypes.Token, create bool) error {
	err := provider.cache.Set(ctx, emptyOrgID, accessTokenCacheKey(token.AccessToken), token, provider.config.Lifetime.Max)
	if err != nil {
		return err
	}

	if create {
		return provider.tokenStore.Create(ctx, token)
	}

	return provider.tokenStore.Update(ctx, token)
}

func (provider *provider) setIdentity(ctx context.Context, identity *authtypes.Identity) error {
	err := provider.cache.Set(ctx, emptyOrgID, identityCacheKey(identity.UserID), identity, -1)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) getOrGetSetIdentity(ctx context.Context, userID valuer.UUID) (*authtypes.Identity, error) {
	identity := new(authtypes.Identity)
	err := provider.cache.Get(ctx, emptyOrgID, identityCacheKey(userID), identity)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if err == nil {
		return identity, nil
	}

	identity, err = provider.tokenStore.GetIdentityByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	err = provider.cache.Set(ctx, emptyOrgID, identityCacheKey(userID), identity, -1)
	if err != nil {
		return nil, err
	}

	return identity, nil
}

func (provider *provider) listLastObservedAtDesc(ctx context.Context, orgID valuer.UUID) ([]map[string]any, error) {
	tokens, err := provider.tokenStore.ListByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	var accessTokenToLastObservedAt []map[string]any

	for _, token := range tokens {
		tokenCachedLastObservedAt, ok := provider.lastObservedAtCache.Get(lastObservedAtCacheKey(token.AccessToken, token.UserID))
		if ok {
			accessTokenToLastObservedAt = append(accessTokenToLastObservedAt, map[string]any{
				"user_id":          token.UserID,
				"access_token":     token.AccessToken,
				"last_observed_at": tokenCachedLastObservedAt,
			})
		}
	}

	// sort by descending order of last_observed_at
	slices.SortFunc(accessTokenToLastObservedAt, func(a, b map[string]any) int {
		return b["last_observed_at"].(time.Time).Compare(a["last_observed_at"].(time.Time))
	})

	return accessTokenToLastObservedAt, nil
}

func accessTokenCacheKey(accessToken string) string {
	return "access_token::" + cachetypes.NewSha1CacheKey(accessToken)
}

func identityCacheKey(userID valuer.UUID) string {
	return "identity::" + userID.String()
}

func lastObservedAtCacheKey(accessToken string, userID valuer.UUID) string {
	return "access_token::" + accessToken + "::" + userID.String()
}
