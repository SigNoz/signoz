package auth

import (
	"context"
	"fmt"

	"go.signoz.io/query-service/dao"
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
	AccessJwt  string `json:"accessJwt"`
	RefrestJwt string `json:"refreshJwt"`
}

// Login method returns access and refresh tokens on successful login, else it errors out.
func Login(ctx context.Context, request *LoginRequest) (*LoginResponse, error) {
	user, err := authenticateLogin(ctx, request)
	if err != nil {
		return nil, err
	}

	accessJwt, err := generateAccessJwt(user.Email, user.Groups)
	if err != nil {
		return nil, err
	}
	refreshJwt, err := generateRefreshJwt(user.Email)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{AccessJwt: accessJwt, RefrestJwt: refreshJwt}, nil
}

// authenticateLogin is responsible for querying the DB and validating the credentials.
func authenticateLogin(ctx context.Context, req *LoginRequest) (*User, error) {

	// If refresh token is valid, then simply authorize the login request.
	if len(req.RefreshToken) > 0 {
		user, err := validateToken(req.RefreshToken)
		if err != nil {
			return nil, err
		}

		return &User{Email: user.Email}, nil
	}

	user, err := dao.DB().FetchUser(ctx, req.Email)
	if err != nil {
		return nil, err.Err
	}
	if user == nil || !passwordMatch(user.Password, req.Password) {
		return nil, ErrorInvalidCreds
	}
	return &User{
		Email:    user.Email,
		Password: req.Password,
	}, nil
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
