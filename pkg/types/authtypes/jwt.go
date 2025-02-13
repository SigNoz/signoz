package authtypes

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"
)

var jwtSecret string
var JwtExpiry = 30 * time.Minute
var JwtRefresh = 30 * 24 * time.Hour

func GetJwtFromRequest(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", errors.New("missing Authorization header")
	}

	reqToken := r.Header.Get("Authorization")
	splitToken := strings.Split(reqToken, "Bearer ")
	jwt := splitToken[1]
	if len(jwt) > 0 {
		return jwt, nil
	}

	// We expect websocket connections to send auth JWT in the
	// `Sec-Websocket-Protocol` header.
	//
	// The standard js websocket API doesn't allow setting headers
	// other than the `Sec-WebSocket-Protocol` header, which is often
	// used for auth purposes as a result.
	return r.Header.Get("Sec-WebSocket-Protocol"), nil
}

func GetJwtClaims(jwtStr string) (jwt.MapClaims, error) {
	// TODO[@vikrantgupta25] : to update this to the claims check function for better integrity of JWT
	// reference - https://pkg.go.dev/github.com/golang-jwt/jwt/v5#Parser.ParseWithClaims
	token, err := jwt.Parse(jwtStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New(fmt.Sprintf("unknown signing algo: %v", token.Header["alg"]))
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, errors.New(fmt.Sprintf("failed to parse jwt token: %v", err))
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, errors.New("Not a valid jwt claim")
	}

	return claims, nil
}

func ValidateJwtClaims(claims jwt.MapClaims) error {
	now := time.Now().Unix()
	if !claims.VerifyExpiresAt(now, true) {
		return errors.New("jwt expired")
	}

	return nil
}

type contextKey string

const (
	EmailContextKey   contextKey = "email"
	OrgIDContextKey   contextKey = "orgId"
	UserIDContextKey  contextKey = "userId"
	GroupIDContextKey contextKey = "groupId"
)

// AttachClaimsToContext attaches individual claims to the context.
func AttachClaimsToContext(ctx context.Context, claims jwt.MapClaims) context.Context {
	if email, ok := claims["email"].(string); ok {
		ctx = context.WithValue(ctx, EmailContextKey, email)
	}
	if orgId, ok := claims["orgId"].(string); ok {
		ctx = context.WithValue(ctx, OrgIDContextKey, orgId)
	}
	if userId, ok := claims["id"].(string); ok {
		ctx = context.WithValue(ctx, UserIDContextKey, userId)
	}
	if groupId, ok := claims["gid"].(string); ok {
		ctx = context.WithValue(ctx, GroupIDContextKey, groupId)
	}
	return ctx
}

// GetUserIDFromContext retrieves the userId from the context.
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	userId, ok := ctx.Value(UserIDContextKey).(string)
	return userId, ok
}

// GetGroupIDFromContext retrieves the groupId from the context.
func GetGroupIDFromContext(ctx context.Context) (string, bool) {
	groupId, ok := ctx.Value(GroupIDContextKey).(string)
	return groupId, ok
}

// GetEmailFromContext retrieves the email from the context.
func GetEmailFromContext(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(EmailContextKey).(string)
	return email, ok
}

// GetOrgIDFromContext retrieves the orgId from the context.
func GetOrgIDFromContext(ctx context.Context) (string, bool) {
	orgId, ok := ctx.Value(OrgIDContextKey).(string)
	return orgId, ok
}

// TokenClaims represents the standard claims used in both access and refresh tokens
type TokenClaims struct {
	UserID  string `json:"id"`
	GroupID string `json:"gid"`
	Email   string `json:"email"`
	OrgID   string `json:"orgId"`
	Expiry  int64  `json:"exp"`
}

// signToken creates and signs a JWT token with the given claims
func signToken(claims TokenClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    claims.UserID,
		"gid":   claims.GroupID,
		"email": claims.Email,
		"orgId": claims.OrgID,
		"exp":   claims.Expiry,
	})
	return token.SignedString([]byte(jwtSecret))
}

// GetAccessJwt creates an access token with the provided claims
func GetAccessJwt(orgId, userId, groupId, email string) (string, error) {
	claims := TokenClaims{
		UserID:  userId,
		GroupID: groupId,
		Email:   email,
		OrgID:   orgId,
		Expiry:  time.Now().Add(JwtExpiry).Unix(),
	}
	return signToken(claims)
}

// GetRefreshJwt creates a refresh token with the provided claims
func GetRefreshJwt(orgId, userId, groupId, email string) (string, error) {
	claims := TokenClaims{
		UserID:  userId,
		GroupID: groupId,
		Email:   email,
		OrgID:   orgId,
		Expiry:  time.Now().Add(JwtRefresh).Unix(),
	}
	return signToken(claims)
}
