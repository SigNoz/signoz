package apikeyidentity

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

type resolver struct {
	store    sqlstore.SQLStore
	headers  []string
	settings factory.ScopedProviderSettings
	sfGroup  *singleflight.Group
}

// New creates an API key identity resolver that validates API keys
// from the configured headers against the factor_api_key table.
func New(providerSettings factory.ProviderSettings, store sqlstore.SQLStore, headers []string) identn.IdentNWithPostHook {
	return &resolver{
		store:    store,
		headers:  headers,
		settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/apikeyidentity"),
		sfGroup:  &singleflight.Group{},
	}
}

func (r *resolver) Name() string {
	return "api_key"
}

// Test checks if any of the configured headers contain a value.
func (r *resolver) Test(req *http.Request) bool {
	for _, header := range r.headers {
		if req.Header.Get(header) != "" {
			return true
		}
	}
	return false
}

// GetIdentity extracts the API key, looks it up in the database,
// validates expiration, resolves the user, and returns Claims.
func (r *resolver) GetIdentity(req *http.Request) (authtypes.Claims, authtypes.AuthType, error) {
	ctx := req.Context()

	// Extract API key from headers
	var apiKeyToken string
	for _, header := range r.headers {
		if v := req.Header.Get(header); v != "" {
			apiKeyToken = v
			break
		}
	}

	// Look up API key by token
	var apiKey types.StorableAPIKey
	err := r.store.
		BunDB().
		NewSelect().
		Model(&apiKey).
		Where("token = ?", apiKeyToken).
		Scan(ctx)
	if err != nil {
		return authtypes.Claims{}, authtypes.AuthType{}, err
	}

	// Check expiration
	if apiKey.ExpiresAt.Before(time.Now()) && !apiKey.ExpiresAt.Equal(types.NEVER_EXPIRES) {
		return authtypes.Claims{}, authtypes.AuthType{}, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "api key has expired")
	}

	// Look up user
	var user types.User
	err = r.store.
		BunDB().
		NewSelect().
		Model(&user).
		Where("id = ?", apiKey.UserID).
		Scan(ctx)
	if err != nil {
		return authtypes.Claims{}, authtypes.AuthType{}, err
	}

	claims := authtypes.Claims{
		UserID: user.ID.String(),
		Role:   apiKey.Role,
		Email:  user.Email.String(),
		OrgID:  user.OrgID.String(),
	}

	return claims, authtypes.AuthTypeAPIKey, nil
}

// Post updates the last_used timestamp for the API key.
func (r *resolver) Post(ctx context.Context, req *http.Request, _ authtypes.Claims) {
	var apiKeyToken string
	for _, header := range r.headers {
		if v := req.Header.Get(header); v != "" {
			apiKeyToken = v
			break
		}
	}
	if apiKeyToken == "" {
		return
	}

	_, _, _ = r.sfGroup.Do(apiKeyToken, func() (any, error) {
		_, err := r.store.
			BunDB().
			NewUpdate().
			Model(new(types.StorableAPIKey)).
			Set("last_used = ?", time.Now()).
			Where("token = ?", apiKeyToken).
			Where("revoked = false").
			Exec(ctx)
		if err != nil {
			r.settings.Logger().ErrorContext(ctx, "failed to update last used of api key", "error", err)
		}
		return true, nil
	})
}
