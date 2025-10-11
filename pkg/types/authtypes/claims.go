package authtypes

import (
	"context"
	"log/slog"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
)

type claimsKey struct{}
type accessTokenKey struct{}

type Claims struct {
	UserID string
	Email  string
	Role   types.Role
	OrgID  string
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

func (c *Claims) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("user_id", c.UserID),
		slog.String("email", c.Email),
		slog.String("role", c.Role.String()),
		slog.String("org_id", c.OrgID),
	)
}

func (c *Claims) IsViewer() error {
	if slices.Contains([]types.Role{types.RoleViewer, types.RoleEditor, types.RoleAdmin}, c.Role) {
		return nil
	}

	return errors.New(errors.TypeForbidden, errors.CodeForbidden, "only viewers/editors/admins can access this resource")
}

func (c *Claims) IsEditor() error {
	if slices.Contains([]types.Role{types.RoleEditor, types.RoleAdmin}, c.Role) {
		return nil
	}

	return errors.New(errors.TypeForbidden, errors.CodeForbidden, "only editors/admins can access this resource")
}

func (c *Claims) IsAdmin() error {
	if c.Role == types.RoleAdmin {
		return nil
	}

	return errors.New(errors.TypeForbidden, errors.CodeForbidden, "only admins can access this resource")
}

func (c *Claims) IsSelfAccess(id string) error {
	if c.UserID == id {
		return nil
	}

	if c.Role == types.RoleAdmin {
		return nil
	}

	return errors.New(errors.TypeForbidden, errors.CodeForbidden, "only the user/admin can access their own resource")
}
