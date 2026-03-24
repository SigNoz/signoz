package tokenizeridentn

import (
	"context"
	"net/http"
	"strings"
	"time"

	"golang.org/x/sync/singleflight"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type provider struct {
	tokenizer tokenizer.Tokenizer
	config    identn.Config
	settings  factory.ScopedProviderSettings
	sfGroup   *singleflight.Group
}

func NewFactory(tokenizer tokenizer.Tokenizer) factory.ProviderFactory[identn.IdentN, identn.Config] {
	return factory.NewProviderFactory(factory.MustNewName(authtypes.IdentNProviderTokenizer.StringValue()), func(ctx context.Context, providerSettings factory.ProviderSettings, config identn.Config) (identn.IdentN, error) {
		return New(providerSettings, tokenizer, config)
	})
}

func New(providerSettings factory.ProviderSettings, tokenizer tokenizer.Tokenizer, config identn.Config) (identn.IdentN, error) {
	return &provider{
		tokenizer: tokenizer,
		config:    config,
		settings:  factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/tokenizeridentn"),
		sfGroup:   &singleflight.Group{},
	}, nil
}

func (provider *provider) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderTokenizer
}

func (provider *provider) Test(req *http.Request) bool {
	for _, header := range provider.config.Tokenizer.Headers {
		if req.Header.Get(header) != "" {
			return true
		}
	}
	return false
}

func (provider *provider) Pre(req *http.Request) *http.Request {
	accessToken := provider.extractToken(req)
	if accessToken == "" {
		return req
	}

	ctx := authtypes.NewContextWithAccessToken(req.Context(), accessToken)
	return req.WithContext(ctx)
}

func (provider *provider) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()

	accessToken, err := authtypes.AccessTokenFromContext(ctx)
	if err != nil {
		return nil, err
	}

	return provider.tokenizer.GetIdentity(ctx, accessToken)
}

func (provider *provider) Post(ctx context.Context, _ *http.Request, _ authtypes.Claims) {
	if !provider.config.Tokenizer.Enabled {
		return
	}

	accessToken, err := authtypes.AccessTokenFromContext(ctx)
	if err != nil {
		return
	}

	_, _, _ = provider.sfGroup.Do(accessToken, func() (any, error) {
		if err := provider.tokenizer.SetLastObservedAt(ctx, accessToken, time.Now()); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to set last observed at", errors.Attr(err))
			return false, err
		}
		return true, nil
	})
}

func (provider *provider) extractToken(req *http.Request) string {
	var value string
	for _, header := range provider.config.Tokenizer.Headers {
		if v := req.Header.Get(header); v != "" {
			value = v
			break
		}
	}

	accessToken, ok := provider.parseBearerAuth(value)
	if !ok {
		return value
	}
	return accessToken
}

func (provider *provider) parseBearerAuth(auth string) (string, bool) {
	const prefix = "Bearer "
	if len(auth) < len(prefix) || !strings.EqualFold(auth[:len(prefix)], prefix) {
		return "", false
	}
	return auth[len(prefix):], true
}
