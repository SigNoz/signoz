package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/singleflight"
)

const (
	authCrossOrgMessage string = "::AUTH-CROSS-ORG::"
)

type AuthN struct {
	tokenizer tokenizer.Tokenizer
	headers   []string
	sharder   sharder.Sharder
	logger    *slog.Logger
	sfGroup   *singleflight.Group
}

func NewAuthN(headers []string, sharder sharder.Sharder, tokenizer tokenizer.Tokenizer, logger *slog.Logger) *AuthN {
	return &AuthN{
		headers:   headers,
		sharder:   sharder,
		tokenizer: tokenizer,
		logger:    logger,
		sfGroup:   &singleflight.Group{},
	}
}

func (a *AuthN) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var values []string
		for _, header := range a.headers {
			values = append(values, r.Header.Get(header))
		}

		ctx, err := a.contextFromRequest(r.Context(), values...)
		if err != nil {
			r = r.WithContext(ctx)
			next.ServeHTTP(w, r)
			return
		}

		r = r.WithContext(ctx)

		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		if err := a.sharder.IsMyOwnedKey(r.Context(), types.NewOrganizationKey(valuer.MustNewUUID(claims.OrgID))); err != nil {
			a.logger.ErrorContext(r.Context(), authCrossOrgMessage, "claims", claims, "error", err)
			next.ServeHTTP(w, r)
			return
		}

		ctx = ctxtypes.SetAuthType(ctx, ctxtypes.AuthTypeTokenizer)

		comment := ctxtypes.CommentFromContext(ctx)
		comment.Set("auth_type", ctxtypes.AuthTypeTokenizer.StringValue())
		comment.Set("tokenizer_provider", a.tokenizer.Config().Provider)
		comment.Set("user_id", claims.UserID)
		comment.Set("org_id", claims.OrgID)

		r = r.WithContext(ctxtypes.NewContextWithComment(ctx, comment))

		next.ServeHTTP(w, r)

		accessToken, err := authtypes.AccessTokenFromContext(r.Context())
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		lastObservedAtCtx := context.WithoutCancel(r.Context())
		_, _, _ = a.sfGroup.Do(accessToken, func() (any, error) {
			if err := a.tokenizer.SetLastObservedAt(lastObservedAtCtx, accessToken, time.Now()); err != nil {
				a.logger.ErrorContext(lastObservedAtCtx, "failed to set last observed at", "error", err)
				return false, err
			}

			return true, nil
		})
	})
}

func (a *AuthN) contextFromRequest(ctx context.Context, values ...string) (context.Context, error) {
	ctx, err := a.contextFromAccessToken(ctx, values...)
	if err != nil {
		return ctx, err
	}

	accessToken, err := authtypes.AccessTokenFromContext(ctx)
	if err != nil {
		return ctx, err
	}

	authenticatedUser, err := a.tokenizer.GetIdentity(ctx, accessToken)
	if err != nil {
		return ctx, err
	}

	return authtypes.NewContextWithClaims(ctx, authenticatedUser.ToClaims()), nil
}

func (a *AuthN) contextFromAccessToken(ctx context.Context, values ...string) (context.Context, error) {
	var value string
	for _, v := range values {
		if v != "" {
			value = v
			break
		}
	}

	if value == "" {
		return ctx, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "missing authorization header")
	}

	// parse from
	bearerToken, ok := parseBearerAuth(value)
	if !ok {
		// this will take care that if the value is not of type bearer token, directly use it
		bearerToken = value
	}

	return authtypes.NewContextWithAccessToken(ctx, bearerToken), nil
}

func parseBearerAuth(auth string) (string, bool) {
	const prefix = "Bearer "
	// Case insensitive prefix match
	if len(auth) < len(prefix) || !strings.EqualFold(auth[:len(prefix)], prefix) {
		return "", false
	}

	return auth[len(prefix):], true
}
