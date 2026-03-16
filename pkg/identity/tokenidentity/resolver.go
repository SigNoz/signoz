package tokenidentity

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"golang.org/x/sync/singleflight"
)

type resolver struct {
	tokenizer tokenizer.Tokenizer
	headers   []string
	settings  factory.ScopedProviderSettings
	sfGroup   *singleflight.Group
}

// New creates a token identity resolver that validates user access tokens
// via the Tokenizer interface.
func New(providerSettings factory.ProviderSettings, tokenizer tokenizer.Tokenizer, headers []string) *resolver {
	return &resolver{
		tokenizer: tokenizer,
		headers:   headers,
		settings:  factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identity/tokenidentity"),
		sfGroup:   &singleflight.Group{},
	}
}

func (r *resolver) Name() string {
	return "tokenizer"
}

// Test checks if any of the configured headers contain a value.
func (r *resolver) Test(_ context.Context, req *http.Request) bool {
	for _, header := range r.headers {
		if req.Header.Get(header) != "" {
			return true
		}
	}
	return false
}

// Authenticate extracts the bearer token, validates it via the tokenizer,
// and returns the resolved identity as Claims.
func (r *resolver) Authenticate(ctx context.Context, req *http.Request) (authtypes.Claims, ctxtypes.AuthType, error) {
	// Extract token from headers
	var value string
	for _, header := range r.headers {
		if v := req.Header.Get(header); v != "" {
			value = v
			break
		}
	}

	// Parse bearer token format
	accessToken, ok := parseBearerAuth(value)
	if !ok {
		// If not bearer format, use the raw value
		accessToken = value
	}

	// Store access token in context for token rotation handler.
	ctx = authtypes.NewContextWithAccessToken(ctx, accessToken)

	// Resolve identity from token
	authenticatedUser, err := r.tokenizer.GetIdentity(ctx, accessToken)
	if err != nil {
		return authtypes.Claims{}, ctxtypes.AuthType{}, err
	}

	return authenticatedUser.ToClaims(), ctxtypes.AuthTypeTokenizer, nil
}

// PostAuth updates the last observed timestamp for the access token.
func (r *resolver) PostAuth(ctx context.Context, _ *http.Request, _ authtypes.Claims) {
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
