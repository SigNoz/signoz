package jwttokenizer

import (
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
