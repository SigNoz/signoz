package authtypes

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/stretchr/testify/assert"
)

func TestGetAccessJwt(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	token, err := jwtService.GetAccessJwt("orgId", "userId", "groupId", "email@example.com")

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestGetRefreshJwt(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	token, err := jwtService.GetRefreshJwt("orgId", "userId", "groupId", "email@example.com")

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

func TestValidateJwtClaims(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	claims := Claims{
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Minute).Unix(),
		},
	}

	err := jwtService.ValidateJwtClaims(claims)
	assert.NoError(t, err)

	claims.ExpiresAt = time.Now().Add(-time.Minute).Unix()
	err = jwtService.ValidateJwtClaims(claims)
	assert.Error(t, err)
	assert.Equal(t, "jwt expired", err.Error())
}

func TestAttachClaimsToContext(t *testing.T) {
	jwtService := NewJWT("secret", time.Minute, time.Hour)
	claims := Claims{
		UserID: "userId",
	}

	ctx := context.Background()
	ctx = jwtService.AttachClaimsToContext(ctx, claims)

	retrievedClaims, ok := GetClaimsFromContext(ctx)
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
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Minute).Unix(),
		},
	}
	tokenString, err := jwtService.signToken(claims)
	assert.NoError(t, err)

	// Test retrieving claims from the token
	retrievedClaims, err := jwtService.GetJwtClaims(tokenString)
	assert.NoError(t, err)
	assert.Equal(t, claims.UserID, retrievedClaims.UserID)
	assert.Equal(t, claims.GroupID, retrievedClaims.GroupID)
	assert.Equal(t, claims.Email, retrievedClaims.Email)
	assert.Equal(t, claims.OrgID, retrievedClaims.OrgID)
}
