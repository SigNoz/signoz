package authtypes

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type patTokenKey struct{}
type jwtClaimsKey struct{}

var PatTokenKey = patTokenKey{}
var JwtClaimsKey = jwtClaimsKey{}

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

func (j *JWT) GetJwtFromRequest(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", errors.New("missing Authorization header")
	}

	reqToken := r.Header.Get("Authorization")
	splitToken := strings.Split(reqToken, "Bearer ")
	if len(splitToken) > 1 {
		jwt := splitToken[1]
		if len(jwt) > 0 {
			return jwt, nil
		}
	}

	// We expect websocket connections to send auth JWT in the
	// `Sec-Websocket-Protocol` header.
	//
	// The standard js websocket API doesn't allow setting headers
	// other than the `Sec-WebSocket-Protocol` header, which is often
	// used for auth purposes as a result.
	return r.Header.Get("Sec-WebSocket-Protocol"), nil
}

func (j *JWT) Claims(jwtStr string) (Claims, error) {
	// TODO[@vikrantgupta25] : to update this to the claims check function for better integrity of JWT
	// reference - https://pkg.go.dev/github.com/golang-jwt/jwt/v5#Parser.ParseWithClaims
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
func (j *JWT) NewContextWithClaims(ctx context.Context, claims Claims) context.Context {
	ctx = context.WithValue(ctx, JwtClaimsKey, claims)
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

func NewClaimsFromContext(ctx context.Context) (Claims, bool) {
	claims, ok := ctx.Value(JwtClaimsKey).(Claims)
	return claims, ok
}
