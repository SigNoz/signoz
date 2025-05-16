package authtypes

import (
	"log/slog"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/golang-jwt/jwt/v5"
)

var _ jwt.ClaimsValidator = (*Claims)(nil)

type Claims struct {
	jwt.RegisteredClaims
	UserID string     `json:"id"`
	Email  string     `json:"email"`
	Role   types.Role `json:"role"`
	OrgID  string     `json:"orgId"`
}

func (c *Claims) Validate() error {
	if c.UserID == "" {
		return errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "id is required")
	}

	// The problem is that when the "role" field is missing entirely from the JSON (as opposed to being present but empty), the UnmarshalJSON method for Role isn't called at all.
	// The JSON decoder just sets the Role field to its zero value ("").
	if c.Role == "" {
		return errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "role is required")
	}

	if c.OrgID == "" {
		return errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "orgId is required")
	}

	return nil
}

func (c *Claims) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("id", c.UserID),
		slog.String("email", c.Email),
		slog.String("role", c.Role.String()),
		slog.String("orgId", c.OrgID),
		slog.Time("exp", c.ExpiresAt.Time),
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
