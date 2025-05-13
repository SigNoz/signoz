package authtypes

import (
	"context"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/golang-jwt/jwt/v5"
)

type jwtClaimsKey struct{}

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

func (j *JWT) ContextFromRequest(ctx context.Context, values ...string) (context.Context, error) {
	var value string
	for _, v := range values {
		if v != "" {
			value = v
			break
		}
	}

	if value == "" {
		return ctx, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "missing authorization header")
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
	claims := Claims{}
	_, err := jwt.ParseWithClaims(jwtStr, &claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unrecognized signing algorithm: %s", token.Method.Alg())
		}
		return []byte(j.JwtSecret), nil
	})
	if err != nil {
		return Claims{}, errors.Wrapf(err, errors.TypeUnauthenticated, errors.CodeUnauthenticated, "failed to parse jwt token")
	}

	return claims, nil
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
func (j *JWT) AccessToken(orgId, userId, email string, role types.Role) (string, Claims, error) {
	claims := Claims{
		UserID: userId,
		Role:   role,
		Email:  email,
		OrgID:  orgId,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.JwtExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token, err := j.signToken(claims)
	if err != nil {
		return "", Claims{}, errors.Wrapf(err, errors.TypeUnauthenticated, errors.CodeUnauthenticated, "failed to sign token")
	}

	return token, claims, nil
}

// RefreshToken creates a refresh token with the provided claims
func (j *JWT) RefreshToken(orgId, userId, email string, role types.Role) (string, Claims, error) {
	claims := Claims{
		UserID: userId,
		Role:   role,
		Email:  email,
		OrgID:  orgId,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.JwtRefresh)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token, err := j.signToken(claims)
	if err != nil {
		return "", Claims{}, errors.Wrapf(err, errors.TypeUnauthenticated, errors.CodeUnauthenticated, "failed to sign token")
	}

	return token, claims, nil
}

func ClaimsFromContext(ctx context.Context) (Claims, error) {
	claims, ok := ctx.Value(jwtClaimsKey{}).(Claims)
	if !ok {
		return Claims{}, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated")
	}

	return claims, nil
}

func parseBearerAuth(auth string) (string, bool) {
	const prefix = "Bearer "
	// Case insensitive prefix match
	if len(auth) < len(prefix) || !strings.EqualFold(auth[:len(prefix)], prefix) {
		return "", false
	}

	return auth[len(prefix):], true
}
