package auth

import (
	"context"
	"fmt"
	"net/http"
	"time"

	jwtmiddleware "github.com/auth0/go-jwt-middleware"
	"github.com/golang-jwt/jwt"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

var (
	JwtSecret  string
	JwtExpiry  = 30 * time.Minute
	JwtRefresh = 30 * 24 * time.Hour
)

func ParseJWT(jwtStr string) (jwt.MapClaims, error) {
	// TODO[@vikrantgupta25] : to update this to the claims check function for better integrity of JWT
	// reference - https://pkg.go.dev/github.com/golang-jwt/jwt/v5#Parser.ParseWithClaims
	token, err := jwt.Parse(jwtStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.Errorf("unknown signing algo: %v", token.Header["alg"])
		}
		return []byte(JwtSecret), nil
	})

	if err != nil {
		return nil, errors.Wrapf(err, "failed to parse jwt token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, errors.Errorf("Not a valid jwt claim")
	}

	return claims, nil
}

func validateUser(tok string) (*model.UserPayload, error) {
	claims, err := ParseJWT(tok)
	if err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	if !claims.VerifyExpiresAt(now, true) {
		return nil, model.ErrorTokenExpired
	}

	var orgId string
	if claims["orgId"] != nil {
		orgId = claims["orgId"].(string)
	}

	return &model.UserPayload{
		User: model.User{
			Id:      claims["id"].(string),
			GroupId: claims["gid"].(string),
			Email:   claims["email"].(string),
			OrgId:   orgId,
		},
	}, nil
}

// AttachJwtToContext attached the jwt token from the request header to the context.
func AttachJwtToContext(ctx context.Context, r *http.Request) context.Context {
	token, err := ExtractJwtFromRequest(r)
	if err != nil {
		zap.L().Error("Error while getting token from header", zap.Error(err))
		return ctx
	}

	return context.WithValue(ctx, AccessJwtKey, token)
}

func ExtractJwtFromContext(ctx context.Context) (string, bool) {
	jwtToken, ok := ctx.Value(AccessJwtKey).(string)
	return jwtToken, ok
}

func ExtractJwtFromRequest(r *http.Request) (string, error) {
	authHeaderJwt, err := jwtmiddleware.FromAuthHeader(r)
	if err != nil {
		return "", err
	}

	if len(authHeaderJwt) > 0 {
		return authHeaderJwt, nil
	}

	// We expect websocket connections to send auth JWT in the
	// `Sec-Websocket-Protocol` header.
	//
	// The standard js websocket API doesn't allow setting headers
	// other than the `Sec-WebSocket-Protocol` header, which is often
	// used for auth purposes as a result.
	return r.Header.Get("Sec-WebSocket-Protocol"), nil
}

func ExtractUserIdFromContext(ctx context.Context) (string, error) {
	userId := ""
	jwt, ok := ExtractJwtFromContext(ctx)
	if !ok {
		return "", model.InternalError(fmt.Errorf("failed to extract jwt from context"))
	}

	claims, err := ParseJWT(jwt)
	if err != nil {
		return "", model.InternalError(fmt.Errorf("failed get claims from jwt %v", err))
	}

	if v, ok := claims["id"]; ok {
		userId = v.(string)
	}
	return userId, nil
}

func GetEmailFromJwt(ctx context.Context) (string, error) {
	jwt, ok := ExtractJwtFromContext(ctx)
	if !ok {
		return "", model.InternalError(fmt.Errorf("failed to extract jwt from context"))
	}

	claims, err := ParseJWT(jwt)
	if err != nil {
		return "", model.InternalError(fmt.Errorf("failed get claims from jwt %v", err))
	}

	return claims["email"].(string), nil
}
