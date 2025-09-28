package opaquetokenizer

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	emptyOrgID valuer.UUID = valuer.UUID{}
)

type provider struct {
	config     tokenizer.Config
	settings   factory.ScopedProviderSettings
	cache      cache.Cache
	tokenStore authtypes.TokenStore
	stopC      chan struct{}
	sharder    sharder.Sharder
}

func NewFactory(cache cache.Cache, tokenStore authtypes.TokenStore, sharder sharder.Sharder) factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config] {
	return factory.NewProviderFactory(factory.MustNewName("opaque"), func(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config) (tokenizer.Tokenizer, error) {
		return New(ctx, providerSettings, config, cache, tokenStore, sharder)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config, cache cache.Cache, tokenStore authtypes.TokenStore, sharder sharder.Sharder) (tokenizer.Tokenizer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/tokenizer/opaquetokenizer")

	return &provider{
		config:     config,
		settings:   settings,
		cache:      cache,
		tokenStore: tokenStore,
		stopC:      make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	ticker := time.NewTicker(provider.config.GCInterval)
	defer ticker.Stop()

	for {
		select {
		case <-provider.stopC:
			if err := provider.gc(ctx); err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to garbage collect tokens", "error", err)
			}
		case <-ctx.Done():
			return nil
		}
	}
}

func (provider *provider) CreateToken(ctx context.Context, identity *authtypes.Identity, meta map[string]string) (*authtypes.Token, error) {
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

	if err := token.IsValid(provider.config.RotationInterval, provider.config.IdleDuration, provider.config.MaxDuration); err != nil {
		return nil, err
	}

	identity, err := provider.getOrGetSetIdentity(ctx, token.UserID)
	if err != nil {
		return nil, err
	}

	return identity, nil
}

func (provider *provider) DeleteToken(ctx context.Context, accessToken string) error {
	provider.cache.Delete(ctx, emptyOrgID, cachetypes.NewSha1CacheKey(accessToken))
	return provider.tokenStore.DeleteByAccessToken(ctx, accessToken)
}

func (provider *provider) RotateToken(ctx context.Context, accessToken string, refreshToken string) (*authtypes.Token, error) {
	token, err := provider.tokenStore.GetByAccessToken(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	if token.RefreshToken != refreshToken {
		return nil, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "invalid refresh token")
	}

	if err := token.IsExpired(provider.config.IdleDuration, provider.config.MaxDuration); err != nil {
		return nil, err
	}

	if err := token.Rotate(); err != nil {
		return nil, err
	}

	if err := provider.setToken(ctx, token, false); err != nil {
		return nil, err
	}

	return token, nil
}

func (provider *provider) DeleteTokensByUserID(ctx context.Context, userID valuer.UUID) error {
	tokens, err := provider.tokenStore.ListByUserID(ctx, userID)
	if err != nil {
		return err
	}

	for _, token := range tokens {
		if err := provider.DeleteToken(ctx, token.AccessToken); err != nil {
			return err
		}
	}

	return nil
}

func (provider *provider) DeleteIdentity(ctx context.Context, userID valuer.UUID) error {
	provider.cache.Delete(ctx, emptyOrgID, "identity::"+userID.String())
	return nil
}

func (provider *provider) Stop(context.Context) error {
	close(provider.stopC)
	return nil
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	tokens, err := provider.tokenStore.ListByOrgID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"tokens": len(tokens),
	}, nil
}

func (provider *provider) gc(ctx context.Context) error {
	start, end, err := provider.sharder.GetMyOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	tokens, err := provider.tokenStore.ListByOwnedKeyRange(ctx, start, end)
	if err != nil {
		return err
	}

	var tokensToDelete []valuer.UUID
	for _, token := range tokens {
		if err := token.IsExpired(provider.config.IdleDuration, provider.config.MaxDuration); err != nil {
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

func (provider *provider) getOrGetSetToken(ctx context.Context, accessToken string) (*authtypes.Token, error) {
	token := new(authtypes.Token)
	err := provider.cache.Get(ctx, emptyOrgID, cachetypes.NewSha1CacheKey(accessToken), token, false)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if err != nil {
		token, err = provider.tokenStore.GetByAccessToken(ctx, accessToken)
		if err != nil {
			return nil, err
		}

		err := provider.cache.Set(ctx, emptyOrgID, cachetypes.NewSha1CacheKey(accessToken), token, provider.config.MaxDuration)
		if err != nil {
			return nil, err
		}
	}

	return token, nil
}

func (provider *provider) setToken(ctx context.Context, token *authtypes.Token, create bool) error {
	err := provider.cache.Set(ctx, emptyOrgID, cachetypes.NewSha1CacheKey(token.AccessToken), token, provider.config.MaxDuration)
	if err != nil {
		return err
	}

	if create {
		return provider.tokenStore.Create(ctx, token)
	}

	return provider.tokenStore.Update(ctx, token)
}

func (provider *provider) setIdentity(ctx context.Context, identity *authtypes.Identity) error {
	err := provider.cache.Set(ctx, emptyOrgID, "identity::"+identity.UserID.String(), identity, -1)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) getOrGetSetIdentity(ctx context.Context, userID valuer.UUID) (*authtypes.Identity, error) {
	identity := new(authtypes.Identity)
	err := provider.cache.Get(ctx, emptyOrgID, "identity::"+userID.String(), identity, false)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if err != nil {
		identity, err = provider.tokenStore.GetIdentityByUserID(ctx, userID)
		if err != nil {
			return nil, err
		}
	}

	return identity, nil
}
