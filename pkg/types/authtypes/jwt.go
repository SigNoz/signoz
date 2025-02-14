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

type patTokenKey struct{}
type jwtClaimsKey struct{}

var PatTokenKey = patTokenKey{}
var JwtClaimsKey = jwtClaimsKey{}

type Claims struct {
	jwt.StandardClaims
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

func (j *JWT) GetJwtClaims(jwtStr string) (Claims, error) {
	// TODO[@vikrantgupta25] : to update this to the claims check function for better integrity of JWT
	// reference - https://pkg.go.dev/github.com/golang-jwt/jwt/v5#Parser.ParseWithClaims
	token, err := jwt.Parse(jwtStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New(fmt.Sprintf("unknown signing algo: %v", token.Header["alg"]))
		}
		return []byte(j.JwtSecret), nil
	})

	if err != nil {
		return Claims{}, errors.New(fmt.Sprintf("failed to parse jwt token: %v", err))
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return Claims{}, errors.New("Not a valid jwt claim")
	}

	// Populate UserClaims with standard claims and custom claims
	userClaims := Claims{
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: int64(claims["exp"].(float64)),
		},
		UserID:  j.getStringClaim(claims, "id"),
		GroupID: j.getStringClaim(claims, "gid"),
		Email:   j.getStringClaim(claims, "email"),
		OrgID:   j.getStringClaim(claims, "orgId"),
	}

	return userClaims, nil
}

func (j *JWT) ValidateJwtClaims(claims Claims) error {
	now := time.Now().Unix()
	if !claims.VerifyExpiresAt(now, true) {
		return errors.New("jwt expired")
	}

	return nil
}

// AttachClaimsToContext attaches individual claims to the context.
func (j *JWT) AttachClaimsToContext(ctx context.Context, claims Claims) context.Context {
	ctx = context.WithValue(ctx, JwtClaimsKey, claims)
	return ctx
}

// signToken creates and signs a JWT token with the given claims
func (j *JWT) signToken(claims Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    claims.UserID,
		"gid":   claims.GroupID,
		"email": claims.Email,
		"orgId": claims.OrgID,
		"exp":   claims.ExpiresAt,
	})
	return token.SignedString([]byte(j.JwtSecret))
}

// GetAccessJwt creates an access token with the provided claims
func (j *JWT) GetAccessJwt(orgId, userId, groupId, email string) (string, error) {
	claims := Claims{
		UserID:  userId,
		GroupID: groupId,
		Email:   email,
		OrgID:   orgId,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(j.JwtExpiry).Unix(),
		},
	}
	return j.signToken(claims)
}

// GetRefreshJwt creates a refresh token with the provided claims
func (j *JWT) GetRefreshJwt(orgId, userId, groupId, email string) (string, error) {
	claims := Claims{
		UserID:  userId,
		GroupID: groupId,
		Email:   email,
		OrgID:   orgId,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(j.JwtRefresh).Unix(),
		},
	}
	return j.signToken(claims)
}

// getStringClaim safely retrieves a string claim from the claims map.
func (j *JWT) getStringClaim(claims jwt.MapClaims, key string) string {
	if value, ok := claims[key].(string); ok {
		return value
	}
	return "" // Return an empty string if the claim is not present
}

func GetClaimsFromContext(ctx context.Context) (Claims, bool) {
	claims, ok := ctx.Value(JwtClaimsKey).(Claims)
	return claims, ok
}
