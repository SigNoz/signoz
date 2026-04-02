package authtypes

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
)

type claimsKey struct{}
type accessTokenKey struct{}
type apiKeyKey struct{}

type Claims struct {
	UserID           string
	ServiceAccountID string
	Principal        Principal
	Email            string
	OrgID            string
	IdentNProvider   IdentNProvider
}

// NewContextWithClaims attaches individual claims to the context.
func NewContextWithClaims(ctx context.Context, claims Claims) context.Context {
	ctx = context.WithValue(ctx, claimsKey{}, claims)
	return ctx
}

func ClaimsFromContext(ctx context.Context) (Claims, error) {
	claims, ok := ctx.Value(claimsKey{}).(Claims)
	if !ok {
		return Claims{}, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated")
	}

	return claims, nil
}

func NewContextWithAccessToken(ctx context.Context, accessToken string) context.Context {
	return context.WithValue(ctx, accessTokenKey{}, accessToken)
}

func AccessTokenFromContext(ctx context.Context) (string, error) {
	accessToken, ok := ctx.Value(accessTokenKey{}).(string)
	if !ok {
		return "", errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated")
	}

	return accessToken, nil
}

func NewContextWithAPIKey(ctx context.Context, apiKey string) context.Context {
	return context.WithValue(ctx, apiKeyKey{}, apiKey)
}

func APIKeyFromContext(ctx context.Context) (string, error) {
	apiKey, ok := ctx.Value(apiKeyKey{}).(string)
	if !ok {
		return "", errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated")
	}

	return apiKey, nil
}

func (c *Claims) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("user_id", c.UserID),
		slog.String("service_account_id", c.ServiceAccountID),
		slog.String("principal", c.Principal.StringValue()),
		slog.String("email", c.Email),
		slog.String("org_id", c.OrgID),
		slog.String("identn_provider", c.IdentNProvider.StringValue()),
	)
}

func (c *Claims) IsSelfAccess(id string) error {
	if c.UserID == id {
		return nil
	}

	return errors.New(errors.TypeForbidden, errors.CodeForbidden, "only the user/admin can access their own resource")
}

func (c *Claims) IdentityID() string {
	if c.Principal == PrincipalUser {
		return c.UserID
	}

	return c.ServiceAccountID
}
