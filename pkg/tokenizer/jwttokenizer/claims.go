package jwttokenizer

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/golang-jwt/jwt/v5"
)

var _ jwt.ClaimsValidator = (*Claims)(nil)

type Claims struct {
	jwt.RegisteredClaims
	UserID string `json:"id"`
	Email  string `json:"email"`
	OrgID  string `json:"orgId"`
}

func (c *Claims) Validate() error {
	if c.UserID == "" {
		return errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "id is required")
	}

	if c.OrgID == "" {
		return errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "orgId is required")
	}

	return nil
}
