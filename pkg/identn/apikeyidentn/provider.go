package apikeyidentn

import (
	"context"
	"net/http"
	"time"

	"golang.org/x/sync/singleflight"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type provider struct {
	serviceAccount serviceaccount.Module
	config         identn.Config
	settings       factory.ScopedProviderSettings
	sfGroup        *singleflight.Group
}

func NewFactory(serviceAccount serviceaccount.Module) factory.ProviderFactory[identn.IdentN, identn.Config] {
	return factory.NewProviderFactory(factory.MustNewName(authtypes.IdentNProviderAPIKey.StringValue()), func(ctx context.Context, providerSettings factory.ProviderSettings, config identn.Config) (identn.IdentN, error) {
		return New(serviceAccount, config, providerSettings)
	})
}

func New(serviceAccount serviceaccount.Module, config identn.Config, providerSettings factory.ProviderSettings) (identn.IdentN, error) {
	return &provider{
		serviceAccount: serviceAccount,
		config:         config,
		settings:       factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/apikeyidentn"),
		sfGroup:        &singleflight.Group{},
	}, nil
}

func (provider *provider) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderAPIKey
}

func (provider *provider) Test(req *http.Request) bool {
	for _, header := range provider.config.APIKeyConfig.Headers {
		if req.Header.Get(header) != "" {
			return true
		}
	}
	return false
}

func (provider *provider) Pre(req *http.Request) *http.Request {
	apiKey := provider.extractToken(req)
	if apiKey == "" {
		return req
	}

	ctx := authtypes.NewContextWithAPIKey(req.Context(), apiKey)
	return req.WithContext(ctx)
}

func (provider *provider) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()
	apiKey, err := authtypes.APIKeyFromContext(ctx)
	if err != nil {
		return nil, err
	}

	identity, err := provider.serviceAccount.GetIdentity(ctx, apiKey)
	if err != nil {
		return nil, err
	}

	return identity, nil
}

func (provider *provider) Post(ctx context.Context, _ *http.Request, _ authtypes.Claims) {
	apiKey, err := authtypes.APIKeyFromContext(ctx)
	if err != nil {
		return
	}

	_, _, _ = provider.sfGroup.Do(apiKey, func() (any, error) {
		if err := provider.serviceAccount.SetLastObservedAt(ctx, apiKey, time.Now()); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to set last observed at", errors.Attr(err))
			return false, err
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
