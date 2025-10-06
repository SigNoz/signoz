package opaquetokenizer

import (
	"context"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/allegro/bigcache/v3"
)

var (
	emptyOrgID valuer.UUID                    = valuer.UUID{}
	_          tokenizer.TokenizerWithService = (*provider)(nil)
)

type provider struct {
	config              tokenizer.Config
	settings            factory.ScopedProviderSettings
	cache               cache.Cache
	tokenStore          authtypes.TokenStore
	orgGetter           organization.Getter
	stopC               chan struct{}
	lastObservedAtCache *bigcache.BigCache
}

func NewFactory(cache cache.Cache, tokenStore authtypes.TokenStore, orgGetter organization.Getter) factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config] {
	return factory.NewProviderFactory(factory.MustNewName("opaque"), func(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config) (tokenizer.Tokenizer, error) {
		return New(ctx, providerSettings, config, cache, tokenStore, orgGetter)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config, cache cache.Cache, tokenStore authtypes.TokenStore, orgGetter organization.Getter) (tokenizer.Tokenizer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/tokenizer/opaquetokenizer")

	lastObservedAtCache, err := bigcache.New(ctx, bigcache.Config{
		Shards:       1024,
		LifeWindow:   config.Lifetime.Max,
		CleanWindow:  config.Opaque.GC.Interval,
		StatsEnabled: false,
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
			if err := provider.gc(ctx); err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to garbage collect tokens", "error", err)
			}

			if err := provider.flushLastObservedAt(ctx); err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to flush tokens", "error", err)
			}
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
	provider.cache.Delete(ctx, emptyOrgID, cachetypes.NewSha1CacheKey(accessToken))
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
		provider.cache.Delete(ctx, emptyOrgID, cachetypes.NewSha1CacheKey(token.AccessToken))
	}

	if err := provider.tokenStore.DeleteByUserID(ctx, userID); err != nil {
		return err
	}

	return nil
}

func (provider *provider) DeleteIdentity(ctx context.Context, userID valuer.UUID) error {
	provider.cache.Delete(ctx, emptyOrgID, "identity::"+userID.String())
	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)

	// garbage collect tokens on stop
	if err := provider.gc(ctx); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to garbage collect tokens", "error", err)
	}

	// flush tokens on stop
	if err := provider.flushLastObservedAt(ctx); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to flush tokens", "error", err)
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

	if err := provider.lastObservedAtCache.Set(lastObservedAtCacheKey(accessToken, token.UserID), []byte(lastObservedAt.Format(time.RFC3339))); err != nil {
		return err
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

	accessTokenToLastObservedAt, err := provider.listLastObservedAtDesc()
	if err != nil {
		return nil, err
	}

	if len(accessTokenToLastObservedAt) == 0 {
		return stats, nil
	}

	accessTokenToLastObservedAtMax := accessTokenToLastObservedAt[0]

	if lastObservedAt, ok := accessTokenToLastObservedAtMax["last_observed_at"].(time.Time); ok {
		if !lastObservedAt.IsZero() {
			stats["auth_token.last_observed_at.max.time"] = lastObservedAt
			stats["auth_token.last_observed_at.max.time_unix"] = lastObservedAt.Unix()
		}
	}

	return stats, nil
}

func (provider *provider) gc(ctx context.Context) error {
	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	orgIDs := make([]valuer.UUID, 0, len(orgs))
	for _, org := range orgs {
		orgIDs = append(orgIDs, org.ID)
	}

	tokens, err := provider.tokenStore.ListByOrgIDs(ctx, orgIDs)
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

func (provider *provider) flushLastObservedAt(ctx context.Context) error {
	accessTokenToLastObservedAt, err := provider.listLastObservedAtDesc()
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
	err := provider.cache.Get(ctx, emptyOrgID, accessTokenCacheKey(accessToken), token, false)
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
	err := provider.cache.Get(ctx, emptyOrgID, identityCacheKey(userID), identity, false)
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

func (provider *provider) listLastObservedAtDesc() ([]map[string]any, error) {
	iterator := provider.lastObservedAtCache.Iterator()

	var accessTokenToLastObservedAt []map[string]any

	for iterator.SetNext() {
		value, err := iterator.Value()
		if err != nil {
			return nil, err
		}

		accessToken, userID, err := accessTokenAndUserIDFromLastObservedAtCacheKey(value.Key())
		if err != nil {
			return nil, err
		}

		lastObservedAt, err := time.Parse(time.RFC3339, string(value.Value()))
		if err != nil {
			return nil, err
		}

		accessTokenToLastObservedAt = append(accessTokenToLastObservedAt, map[string]any{
			"user_id":          userID,
			"access_token":     accessToken,
			"last_observed_at": lastObservedAt,
		})
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

func accessTokenAndUserIDFromLastObservedAtCacheKey(key string) (string, valuer.UUID, error) {
	parts := strings.Split(key, "::")
	if len(parts) != 3 {
		return "", valuer.UUID{}, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid last observed at cache key")
	}

	return parts[1], valuer.MustNewUUID(parts[2]), nil
}
