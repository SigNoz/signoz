package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/model"
	"google.golang.org/grpc/metadata"
)

var (
	JwtSecret  string
	JwtExpiry  = 15 * time.Minute
	JwtRefresh = 1 * time.Hour
)

func ParseJWT(jwtStr string) (jwt.MapClaims, error) {
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

func validateUser(tok string) (*model.User, error) {
	claims, err := ParseJWT(tok)
	if err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	if !claims.VerifyExpiresAt(now, true) {
		return nil, errors.Errorf("Token is expired")
	}
	return &model.User{
		Id:    claims["id"].(string),
		Email: claims["email"].(string),
	}, nil
}

// AttachToken attached the jwt token from the request header to the context.
func AttachToken(ctx context.Context, r *http.Request) context.Context {
	if accessJwt := r.Header.Get("AccessToken"); accessJwt != "" {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			md = metadata.New(nil)
		}

		md.Append("accessJwt", accessJwt)
		ctx = metadata.NewIncomingContext(ctx, md)
	}
	return ctx
}

func ExtractJwt(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", errors.New("No JWT metadata token found")
	}
	accessJwt := md.Get("accessJwt")
	if len(accessJwt) == 0 {
		return "", errors.New("No JWT token found")
	}

	return accessJwt[0], nil
}
