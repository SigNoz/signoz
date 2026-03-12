package authtypes

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
)

type claimsKey struct{}
type accessTokenKey struct{}
type serviceAccountAPIKeyKey struct{}

type Claims struct {
	UserID           string
	ServiceAccountID string
	Principal        string
	Email            string
	OrgID            string
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

func NewContextWithServiceAccountAPIKey(ctx context.Context, apiKey string) context.Context {
	return context.WithValue(ctx, serviceAccountAPIKeyKey{}, apiKey)
}

func ServiceAccountAPIKeyFromContext(ctx context.Context) (string, error) {
	apiKey, ok := ctx.Value(serviceAccountAPIKeyKey{}).(string)
	if !ok {
		return "", errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated")
	}

	return apiKey, nil
}

func (c *Claims) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("user_id", c.UserID),
		slog.String("service_account_id", c.ServiceAccountID),
		slog.String("principal", c.Principal),
		slog.String("email", c.Email),
		slog.String("org_id", c.OrgID),
	)
}

func (c *Claims) GetIdentityID() string {
	if c.Principal == PrincipalUser.StringValue() {
		return c.UserID
	}

	return c.ServiceAccountID
}

func (c *Claims) IsSelfAccess(id string) error {
	if c.UserID == id {
		return nil
	}

	return errors.New(errors.TypeForbidden, errors.CodeForbidden, "only the user/admin can access their own resource")
}
