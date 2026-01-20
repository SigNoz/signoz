package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/singleflight"
)

const (
	apiKeyCrossOrgMessage string = "::API-KEY-CROSS-ORG::"
)

type APIKey struct {
	store   sqlstore.SQLStore
	uuid    *authtypes.UUID
	headers []string
	logger  *slog.Logger
	sharder sharder.Sharder
	sfGroup *singleflight.Group
}

func NewAPIKey(store sqlstore.SQLStore, headers []string, logger *slog.Logger, sharder sharder.Sharder) *APIKey {
	return &APIKey{
		store:   store,
		uuid:    authtypes.NewUUID(),
		headers: headers,
		logger:  logger,
		sharder: sharder,
		sfGroup: &singleflight.Group{},
	}
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

		err = a.
			store.
			BunDB().
			NewSelect().
			Model(&apiKey).
			Where("token = ?", apiKeyToken).
			Scan(r.Context())
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
			Email:  user.Email.String(),
			OrgID:  user.OrgID.String(),
		}

		ctx = authtypes.NewContextWithClaims(ctx, jwt)

		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		if err := a.sharder.IsMyOwnedKey(r.Context(), types.NewOrganizationKey(valuer.MustNewUUID(claims.OrgID))); err != nil {
			a.logger.ErrorContext(r.Context(), apiKeyCrossOrgMessage, "claims", claims, "error", err)
			next.ServeHTTP(w, r)
			return
		}

		ctx = ctxtypes.SetAuthType(ctx, ctxtypes.AuthTypeAPIKey)

		comment := ctxtypes.CommentFromContext(ctx)
		comment.Set("auth_type", ctxtypes.AuthTypeAPIKey.StringValue())
		comment.Set("user_id", claims.UserID)
		comment.Set("org_id", claims.OrgID)

		r = r.WithContext(ctxtypes.NewContextWithComment(ctx, comment))

		next.ServeHTTP(w, r)

		lastUsedCtx := context.WithoutCancel(r.Context())
		_, _, _ = a.sfGroup.Do(apiKey.ID.StringValue(), func() (any, error) {
			apiKey.LastUsed = time.Now()
			_, err = a.
				store.
				BunDB().
				NewUpdate().
				Model(&apiKey).
				Column("last_used").
				Where("token = ?", apiKeyToken).
				Where("revoked = false").
				Exec(lastUsedCtx)
			if err != nil {
				a.logger.ErrorContext(lastUsedCtx, "failed to update last used of api key", "error", err)
			}

			return true, nil
		})

	})

}
