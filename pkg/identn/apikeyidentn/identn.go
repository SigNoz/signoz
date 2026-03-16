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

type resolver struct {
	store    sqlstore.SQLStore
	headers  []string
	settings factory.ScopedProviderSettings
	sfGroup  *singleflight.Group
}

func New(providerSettings factory.ProviderSettings, store sqlstore.SQLStore, headers []string) identn.IdentN {
	return &resolver{
		store:    store,
		headers:  headers,
		settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/apikeyidentn"),
		sfGroup:  &singleflight.Group{},
	}
}

func (r *resolver) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderAPIkey
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
	token := r.extractToken(req)
	if token == "" {
		return req
	}

	ctx := context.WithValue(req.Context(), apiKeyTokenKey{}, token)
	return req.WithContext(ctx)
}

func (r *resolver) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()

	apiKeyToken, ok := ctx.Value(apiKeyTokenKey{}).(string)
	if !ok || apiKeyToken == "" {
		return nil, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "missing api key")
	}

	var apiKey types.StorableAPIKey
	err := r.store.
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
	err = r.store.
		BunDB().
		NewSelect().
		Model(&user).
		Where("id = ?", apiKey.UserID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	identity := authtypes.Identity{
		UserID: user.ID,
		Role:   apiKey.Role,
		Email:  user.Email,
		OrgID:  user.OrgID,
	}
	return &identity, nil
}

func (r *resolver) Post(ctx context.Context, _ *http.Request, _ authtypes.Claims) {
	apiKeyToken, ok := ctx.Value(apiKeyTokenKey{}).(string)
	if !ok || apiKeyToken == "" {
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

func (r *resolver) extractToken(req *http.Request) string {
	for _, header := range r.headers {
		if v := req.Header.Get(header); v != "" {
			return v
		}
	}
	return ""
}
