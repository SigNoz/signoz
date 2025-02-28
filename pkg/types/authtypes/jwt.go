package authtypes

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type jwtClaimsKey struct{}

type Claims struct {
	jwt.RegisteredClaims
	UserID  string `json:"id"`
	GroupID string `json:"gid"`
	Email   string `json:"email"`
	OrgID   string `json:"orgId"`
}

type JWT struct {
	JwtSecret  string
	JwtExpiry  time.Duration
	JwtRefresh time.Duration
}

func NewJWT(jwtSecret string, jwtExpiry time.Duration, jwtRefresh time.Duration) *JWT {
	return &JWT{
		JwtSecret:  jwtSecret,
		JwtExpiry:  jwtExpiry,
		JwtRefresh: jwtRefresh,
	}
}

func parseBearerAuth(auth string) (string, bool) {
	const prefix = "Bearer "
	// Case insensitive prefix match
	if len(auth) < len(prefix) || !strings.EqualFold(auth[:len(prefix)], prefix) {
		return "", false
	}

	return auth[len(prefix):], true
}

func (j *JWT) ContextFromRequest(ctx context.Context, values ...string) (context.Context, error) {
	var value string
	for _, v := range values {
		if v != "" {
			value = v
			break
		}
	}

	if value == "" {
		return ctx, errors.New("missing Authorization header")
	}

	// parse from
	bearerToken, ok := parseBearerAuth(value)
	if !ok {
		// this will take care that if the value is not of type bearer token, directly use it
		bearerToken = value
	}

	claims, err := j.Claims(bearerToken)
	if err != nil {
		return ctx, err
	}

	return NewContextWithClaims(ctx, claims), nil
}

func (j *JWT) Claims(jwtStr string) (Claims, error) {
	token, err := jwt.ParseWithClaims(jwtStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unknown signing algo: %v", token.Header["alg"])
		}
		return []byte(j.JwtSecret), nil
	})

	if err != nil {
		return Claims{}, fmt.Errorf("failed to parse jwt token: %w", err)
	}

	// Type assertion to retrieve claims from the token
	userClaims, ok := token.Claims.(*Claims)
	if !ok {
		return Claims{}, errors.New("failed to retrieve claims from token")
	}

	return *userClaims, nil
}

// NewContextWithClaims attaches individual claims to the context.
func NewContextWithClaims(ctx context.Context, claims Claims) context.Context {
	ctx = context.WithValue(ctx, jwtClaimsKey{}, claims)
	return ctx
}

// signToken creates and signs a JWT token with the given claims
func (j *JWT) signToken(claims Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(j.JwtSecret))
}

// AccessToken creates an access token with the provided claims
func (j *JWT) AccessToken(orgId, userId, groupId, email string) (string, error) {
	claims := Claims{
		UserID:  userId,
		GroupID: groupId,
		Email:   email,
		OrgID:   orgId,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.JwtExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return j.signToken(claims)
}

// RefreshToken creates a refresh token with the provided claims
func (j *JWT) RefreshToken(orgId, userId, groupId, email string) (string, error) {
	claims := Claims{
		UserID:  userId,
		GroupID: groupId,
		Email:   email,
		OrgID:   orgId,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.JwtRefresh)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return j.signToken(claims)
}

func ClaimsFromContext(ctx context.Context) (Claims, bool) {
	claims, ok := ctx.Value(jwtClaimsKey{}).(Claims)
	return claims, ok
}
