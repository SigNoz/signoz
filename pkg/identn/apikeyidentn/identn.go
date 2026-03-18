package apikeyidentn

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"golang.org/x/sync/singleflight"
)

// todo: will move this in types layer with service account integration
type apiKeyTokenKey struct{}

type provider struct {
	store    sqlstore.SQLStore
	config   identn.Config
	settings factory.ScopedProviderSettings
	sfGroup  *singleflight.Group
}

func NewFactory(store sqlstore.SQLStore) factory.ProviderFactory[identn.IdentN, identn.Config] {
	return factory.NewProviderFactory(factory.MustNewName(authtypes.IdentNProviderAPIkey.StringValue()), func(ctx context.Context, providerSettings factory.ProviderSettings, config identn.Config) (identn.IdentN, error) {
		return New(providerSettings, store, config)
	})
}

func New(providerSettings factory.ProviderSettings, store sqlstore.SQLStore, config identn.Config) (identn.IdentN, error) {
	return &provider{
		store:    store,
		config:   config,
		settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/apikeyidentn"),
		sfGroup:  &singleflight.Group{},
	}, nil
}

func (provider *provider) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderAPIkey
}

func (provider *provider) Test(req *http.Request) bool {
	for _, header := range provider.config.APIKeyConfig.Headers {
		if req.Header.Get(header) != "" {
			return true
		}
	}
	return false
}

func (provider *provider) Enabled() bool {
	return provider.config.APIKeyConfig.Enabled
}

func (provider *provider) Pre(req *http.Request) *http.Request {
	token := provider.extractToken(req)
	if token == "" {
		return req
	}

	ctx := context.WithValue(req.Context(), apiKeyTokenKey{}, token)
	return req.WithContext(ctx)
}

func (provider *provider) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()
	apiKeyToken, ok := ctx.Value(apiKeyTokenKey{}).(string)
	if !ok || apiKeyToken == "" {
		return nil, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "missing api key")
	}

	var apiKey types.StorableAPIKey
	err := provider.
		store.
		BunDB().
		NewSelect().
		Model(&apiKey).
		Where("token = ?", apiKeyToken).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	if apiKey.ExpiresAt.Before(time.Now()) && !apiKey.ExpiresAt.Equal(types.NEVER_EXPIRES) {
		return nil, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "api key has expired")
	}

	var user types.User
	err = provider.
		store.
		BunDB().
		NewSelect().
		Model(&user).
		Where("id = ?", apiKey.UserID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	identity := authtypes.NewIdentity(user.ID, user.OrgID, user.Email, apiKey.Role, provider.Name())
	return identity, nil
}

func (provider *provider) Post(ctx context.Context, _ *http.Request, _ authtypes.Claims) {
	apiKeyToken, ok := ctx.Value(apiKeyTokenKey{}).(string)
	if !ok || apiKeyToken == "" {
		return
	}

	_, _, _ = provider.sfGroup.Do(apiKeyToken, func() (any, error) {
		_, err := provider.
			store.
			BunDB().
			NewUpdate().
			Model(new(types.StorableAPIKey)).
			Set("last_used = ?", time.Now()).
			Where("token = ?", apiKeyToken).
			Where("revoked = false").
			Exec(ctx)
		if err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to update last used of api key", "error", err)
		}
		return true, nil
	})
}

func (provider *provider) extractToken(req *http.Request) string {
	for _, header := range provider.config.APIKeyConfig.Headers {
		if v := req.Header.Get(header); v != "" {
			return v
		}
	}
	return ""
}
