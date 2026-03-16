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

func New(providerSettings factory.ProviderSettings, tokenizer tokenizer.Tokenizer, headers []string) identn.IdentNWithPostHook {
	return &resolver{
		tokenizer: tokenizer,
		headers:   headers,
		settings:  factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/tokenidentity"),
		sfGroup:   &singleflight.Group{},
	}
}

func (r *resolver) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderTokenizer
}

func (r *resolver) AuthType() authtypes.AuthType {
	return authtypes.AuthTypeTokenizer
}

func (r *resolver) Test(req *http.Request) bool {
	for _, header := range r.headers {
		if req.Header.Get(header) != "" {
			return true
		}
	}
	return false
}

func (r *resolver) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()

	var value string
	for _, header := range r.headers {
		if v := req.Header.Get(header); v != "" {
			value = v
			break
		}
	}

	accessToken, ok := parseBearerAuth(value)
	if !ok {

		accessToken = value
	}

	authenticatedUser, err := r.tokenizer.GetIdentity(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	return authenticatedUser, nil
}

func (r *resolver) Post(ctx context.Context, req *http.Request, _ authtypes.Claims) {
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

func parseBearerAuth(auth string) (string, bool) {
	const prefix = "Bearer "
	if len(auth) < len(prefix) || !strings.EqualFold(auth[:len(prefix)], prefix) {
		return "", false
	}
	return auth[len(prefix):], true
}
