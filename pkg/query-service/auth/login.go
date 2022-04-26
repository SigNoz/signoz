package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrorInvalidCreds = fmt.Errorf("Invalid credentials")
)

type LoginRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	RefreshToken string `json:"refreshToken"`
}

type LoginResponse struct {
	AccessJwt        string `json:"accessJwt"`
	AccessJwtExpiry  int64  `json:"accessJwtExpiry"`
	RefreshJwt       string `json:"refreshJwt"`
	RefreshJwtExpiry int64  `json:"refreshJwtExpiry"`
	UserId           string `json:"userId"`
}

// Login method returns access and refresh tokens on successful login, else it errors out.
func Login(ctx context.Context, request *LoginRequest) (*LoginResponse, error) {
	user, err := authenticateLogin(ctx, request)
	if err != nil {
		return nil, err
	}

	accessJwtExpiry := time.Now().Add(JwtExpiry).Unix()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.Id,
		"email": user.Email,
		"exp":   accessJwtExpiry,
	})

	accessJwt, err := token.SignedString([]byte(JwtSecret))
	if err != nil {
		return nil, errors.Errorf("failed to encode jwt: %v", err)
	}

	refreshJwtExpiry := time.Now().Add(JwtRefresh).Unix()
	token = jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.Id,
		"email": user.Email,
		"exp":   refreshJwtExpiry,
	})

	refreshJwt, err := token.SignedString([]byte(JwtSecret))
	if err != nil {
		return nil, errors.Errorf("failed to encode jwt: %v", err)
	}

	return &LoginResponse{
		AccessJwt:        accessJwt,
		AccessJwtExpiry:  accessJwtExpiry,
		RefreshJwt:       refreshJwt,
		RefreshJwtExpiry: refreshJwtExpiry,
		UserId:           user.Id,
	}, nil
}

// authenticateLogin is responsible for querying the DB and validating the credentials.
func authenticateLogin(ctx context.Context, req *LoginRequest) (*model.User, error) {

	// If refresh token is valid, then simply authorize the login request.
	if len(req.RefreshToken) > 0 {
		user, err := validateUser(req.RefreshToken)
		if err != nil {
			return nil, errors.Wrap(err, "failed to validate refresh token")
		}

		return user, nil
	}

	user, err := dao.DB().GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.Wrap(err.Err, "user not found")
	}
	if user == nil || !passwordMatch(user.Password, req.Password) {
		return nil, ErrorInvalidCreds
	}
	return user, nil
}

// Generate hash from the password.
func passwordHash(pass string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// Checks if the given password results in the given hash.
func passwordMatch(hash, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		return false
	}
	return true
}
