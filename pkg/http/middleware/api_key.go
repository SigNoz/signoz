package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type APIKey struct {
	store   sqlstore.SQLStore
	uuid    *authtypes.UUID
	headers []string
	logger  *slog.Logger
}

func NewAPIKey(store sqlstore.SQLStore, headers []string, logger *slog.Logger) *APIKey {
	return &APIKey{store: store, uuid: authtypes.NewUUID(), headers: headers, logger: logger}
}

func (a *APIKey) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var values []string
		var apiKeyToken string
		var apiKey types.StorableAPIKey

		for _, header := range a.headers {
			values = append(values, r.Header.Get(header))
		}

		ctx, err := a.uuid.ContextFromRequest(r.Context(), values...)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}
		apiKeyToken, ok := authtypes.UUIDFromContext(ctx)
		if !ok {
			next.ServeHTTP(w, r)
			return
		}

		err = a.store.BunDB().NewSelect().Model(&apiKey).Where("token = ?", apiKeyToken).Scan(r.Context())
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		// allow the APIKey if expires_at is not set
		if apiKey.ExpiresAt.Before(time.Now()) && !apiKey.ExpiresAt.Equal(types.NEVER_EXPIRES) {
			next.ServeHTTP(w, r)
			return
		}

		// get user from db
		user := types.User{}
		err = a.store.BunDB().NewSelect().Model(&user).Where("id = ?", apiKey.UserID).Scan(r.Context())
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		jwt := authtypes.Claims{
			UserID: user.ID.String(),
			Role:   apiKey.Role,
			Email:  user.Email,
			OrgID:  user.OrgID,
		}

		ctx = authtypes.NewContextWithClaims(ctx, jwt)

		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)

		apiKey.LastUsed = time.Now()
		_, err = a.store.BunDB().NewUpdate().Model(&apiKey).Column("last_used").Where("token = ?", apiKeyToken).Where("revoked = false").Exec(r.Context())
		if err != nil {
			a.logger.ErrorContext(r.Context(), "failed to update last used of api key", "error", err)
		}

	})

}
