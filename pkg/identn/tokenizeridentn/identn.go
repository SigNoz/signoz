package tokenizeridentn

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"golang.org/x/sync/singleflight"
)

type resolver struct {
	tokenizer tokenizer.Tokenizer
	headers   []string
	settings  factory.ScopedProviderSettings
	sfGroup   *singleflight.Group
}

func New(providerSettings factory.ProviderSettings, tokenizer tokenizer.Tokenizer, headers []string) identn.IdentN {
	return &resolver{
		tokenizer: tokenizer,
		headers:   headers,
		settings:  factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/tokenizeridentn"),
		sfGroup:   &singleflight.Group{},
	}
}

func (r *resolver) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderTokenizer
}

func (r *resolver) Test(req *http.Request) bool {
	for _, header := range r.headers {
		if req.Header.Get(header) != "" {
			return true
		}
	}
	return false
}

func (r *resolver) Pre(req *http.Request) *http.Request {
	accessToken := r.extractToken(req)
	if accessToken == "" {
		return req
	}

	ctx := authtypes.NewContextWithAccessToken(req.Context(), accessToken)
	return req.WithContext(ctx)
}

func (r *resolver) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()

	accessToken, err := authtypes.AccessTokenFromContext(ctx)
	if err != nil {
		return nil, err
	}

	return r.tokenizer.GetIdentity(ctx, accessToken)
}

func (r *resolver) Post(ctx context.Context, _ *http.Request, _ authtypes.Claims) {
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
	for _, header := range r.headers {
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
