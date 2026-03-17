package tokenizeridentn

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"golang.org/x/sync/singleflight"
)

type resolver struct {
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
	return &resolver{
		tokenizer: tokenizer,
		config:    config,
		settings:  factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/tokenizeridentn"),
		sfGroup:   &singleflight.Group{},
	}, nil
}

func (r *resolver) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderTokenizer
}

func (r *resolver) Test(req *http.Request) bool {
	if !r.config.Tokenizer.Enabled {
		return false
	}

	for _, header := range r.config.Tokenizer.Headers {
		if req.Header.Get(header) != "" {
			return true
		}
	}
	return false
}

func (r *resolver) Pre(req *http.Request) *http.Request {
	if !r.config.Tokenizer.Enabled {
		return req
	}

	accessToken := r.extractToken(req)
	if accessToken == "" {
		return req
	}

	ctx := authtypes.NewContextWithAccessToken(req.Context(), accessToken)
	return req.WithContext(ctx)
}

func (r *resolver) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	if !r.config.Tokenizer.Enabled {
		// this should never happen since Test returns false
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "identN:%s resolver is disabled", r.Name().StringValue())
	}

	ctx := req.Context()
	accessToken, err := authtypes.AccessTokenFromContext(ctx)
	if err != nil {
		return nil, err
	}

	return r.tokenizer.GetIdentity(ctx, accessToken)
}

func (r *resolver) Post(ctx context.Context, _ *http.Request, _ authtypes.Claims) {
	if !r.config.Tokenizer.Enabled {
		return
	}

	accessToken, err := authtypes.AccessTokenFromContext(ctx)
	if err != nil {
		return
	}

	_, _, _ = r.sfGroup.Do(accessToken, func() (any, error) {
		if err := r.tokenizer.SetLastObservedAt(ctx, accessToken, time.Now()); err != nil {
			r.settings.Logger().ErrorContext(ctx, "failed to set last observed at", "error", err)
			return false, err
		}
		return true, nil
	})
}

func (r *resolver) extractToken(req *http.Request) string {
	var value string
	for _, header := range r.config.Tokenizer.Headers {
		if v := req.Header.Get(header); v != "" {
			value = v
			break
		}
	}

	accessToken, ok := r.parseBearerAuth(value)
	if !ok {
		return value
	}
	return accessToken
}

func (r *resolver) parseBearerAuth(auth string) (string, bool) {
	const prefix = "Bearer "
	if len(auth) < len(prefix) || !strings.EqualFold(auth[:len(prefix)], prefix) {
		return "", false
	}
	return auth[len(prefix):], true
}
