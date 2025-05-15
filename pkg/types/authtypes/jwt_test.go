package authtypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestJwtAccessToken(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	token, _, err := jwtService.AccessToken("orgId", "userId", "email@example.com", types.RoleAdmin)

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestJwtRefreshToken(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	token, _, err := jwtService.RefreshToken("orgId", "userId", "email@example.com", types.RoleAdmin)

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestJwtClaims(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	// Create a valid token
	claims := Claims{
		UserID: "userId",
		Role:   types.RoleAdmin,
		Email:  "email@example.com",
		OrgID:  "orgId",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	tokenString, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	// Test retrieving claims from the token
	retrievedClaims, err := jwtService.Claims(tokenString)
	assert.NoError(t, err)
	assert.Equal(t, claims.UserID, retrievedClaims.UserID)
	assert.Equal(t, claims.Role, retrievedClaims.Role)
	assert.Equal(t, claims.Email, retrievedClaims.Email)
	assert.Equal(t, claims.OrgID, retrievedClaims.OrgID)
}

func TestJwtClaimsInvalidToken(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	_, err := jwtService.Claims("invalid.token.string")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "token is malformed")
}

func TestJwtClaimsExpiredToken(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	// Create an expired token
	claims := Claims{
		UserID: "userId",
		Role:   types.RoleAdmin,
		Email:  "email@example.com",
		OrgID:  "orgId",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	tokenString, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	_, err = jwtService.Claims(tokenString)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "token is expired")
}

func TestJwtClaimsInvalidSignature(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	// Create a valid token
	claims := Claims{
		UserID: "userId",
		Role:   types.RoleAdmin,
		Email:  "email@example.com",
		OrgID:  "orgId",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}
	validToken, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	// Modify the token to create an invalid signature
	invalidToken := validToken + "tampered"

	// Test retrieving claims from the invalid signature token
	_, err = jwtService.Claims(invalidToken)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "signature is invalid")
}

func TestJwtClaimsWithInvalidRole(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	claims := Claims{
		UserID: "userId",
		Role:   "INVALID_ROLE",
		Email:  "email@example.com",
		OrgID:  "orgId",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}
	validToken, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	_, err = jwtService.Claims(validToken)
	assert.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeUnauthenticated))
}

func TestJwtClaimsMissingUserID(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	claims := Claims{
		UserID: "",
		Role:   types.RoleAdmin,
		Email:  "email@example.com",
		OrgID:  "orgId",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}
	validToken, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	_, err = jwtService.Claims(validToken)
	assert.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeUnauthenticated))
}

func TestJwtClaimsMissingRole(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	claims := Claims{
		UserID: "userId",
		Role:   "",
		Email:  "email@example.com",
		OrgID:  "orgId",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}
	validToken, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	_, err = jwtService.Claims(validToken)
	assert.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeUnauthenticated))
}

func TestJwtClaimsMissingOrgID(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	claims := Claims{
		UserID: "userId",
		Role:   types.RoleAdmin,
		Email:  "email@example.com",
		OrgID:  "",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}
	validToken, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	_, err = jwtService.Claims(validToken)
	assert.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeUnauthenticated))
}

func TestParseBearerAuth(t *testing.T) {
	tests := []struct {
		auth     string
		expected string
		expectOk bool
	}{
		{"Bearer validToken", "validToken", true},
		{"bearer validToken", "validToken", true},
		{"InvalidToken", "", false},
		{"Bearer", "", false},
		{"", "", false},
	}

	for _, test := range tests {
		t.Run(test.auth, func(t *testing.T) {
			token, ok := parseBearerAuth(test.auth)
			assert.Equal(t, test.expected, token)
			assert.Equal(t, test.expectOk, ok)
		})
	}
}
