package authtypes

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestGetAccessJwt(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	token, err := jwtService.AccessToken("orgId", "userId", "groupId", "email@example.com")

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestGetRefreshJwt(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	token, err := jwtService.RefreshToken("orgId", "userId", "groupId", "email@example.com")

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestGetJwtFromRequest(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	req, _ := http.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer testtoken")

	token, err := jwtService.GetJwtFromRequest(req)

	assert.NoError(t, err)
	assert.Equal(t, "testtoken", token)
}

func TestAttachClaimsToContext(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	claims := Claims{
		UserID: "userId",
	}

	ctx := context.Background()
	ctx = jwtService.NewContextWithClaims(ctx, claims)

	retrievedClaims, ok := NewClaimsFromContext(ctx)
	assert.True(t, ok)
	assert.Equal(t, claims, retrievedClaims)
	assert.Equal(t, "userId", retrievedClaims.UserID)
}

func TestGetJwtClaims(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	// Create a valid token
	claims := Claims{
		UserID:  "userId",
		GroupID: "groupId",
		Email:   "email@example.com",
		OrgID:   "orgId",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}
	tokenString, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	// Test retrieving claims from the token
	retrievedClaims, err := jwtService.Claims(tokenString)
	assert.NoError(t, err)
	assert.Equal(t, claims.UserID, retrievedClaims.UserID)
	assert.Equal(t, claims.GroupID, retrievedClaims.GroupID)
	assert.Equal(t, claims.Email, retrievedClaims.Email)
	assert.Equal(t, claims.OrgID, retrievedClaims.OrgID)
}

func TestGetJwtClaimsInvalidToken(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	// Test retrieving claims from an invalid token
	_, err := jwtService.Claims("invalid.token.string")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "token is malformed")
}

func TestGetJwtClaimsExpiredToken(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	// Create an expired token
	claims := Claims{
		UserID:  "userId",
		GroupID: "groupId",
		Email:   "email@example.com",
		OrgID:   "orgId",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
		},
	}
	tokenString, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	_, err = jwtService.Claims(tokenString)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "token is expired")
}

func TestGetJwtClaimsInvalidSignature(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)

	// Create a valid token
	claims := Claims{
		UserID:  "userId",
		GroupID: "groupId",
		Email:   "email@example.com",
		OrgID:   "orgId",
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
