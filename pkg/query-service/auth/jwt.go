package auth

import (
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/pkg/errors"
)

var (
	JwtSecret  = "sometestsecret"
	JwtExpiry  = 10 * time.Minute
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

func validateToken(tok string) (*User, error) {
	claims, err := ParseJWT(tok)
	if err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	if !claims.VerifyExpiresAt(now, true) {
		return nil, errors.Errorf("Token is expired")
	}
	return &User{
		Email: claims["email"].(string),
	}, nil
}

func generateAccessJwt(email string, groups []Group) (string, error) {

	getIds := func(groups []Group) []string {
		if len(groups) == 0 {
			return nil
		}

		gids := make([]string, 0, len(groups))
		for _, g := range groups {
			gids = append(gids, g.GroupID)
		}
		return gids
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email":  email,
		"groups": getIds(groups),
		"exp":    time.Now().Add(JwtExpiry).Unix(),
	})

	jwtStr, err := token.SignedString([]byte(JwtSecret))
	if err != nil {
		return "", errors.Errorf("failed to encode jwt: %v", err)
	}
	return jwtStr, nil
}

func generateRefreshJwt(email string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": email,
		"exp":   time.Now().Add(JwtRefresh).Unix(),
	})

	jwtStr, err := token.SignedString([]byte(JwtSecret))
	if err != nil {
		return "", errors.Errorf("failed to encode jwt: %v", err)
	}
	return jwtStr, nil
}

func generateInviteJwt(req *InviteRequest) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": req.Email,
		"exp":   time.Now().Add(inviteValidity).Unix(),
	})

	jwtStr, err := token.SignedString([]byte(JwtSecret))
	if err != nil {
		return "", errors.Errorf("failed to encode jwt: %v", err)
	}
	return jwtStr, nil
}
