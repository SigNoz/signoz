package auth

import (
	"context"
	"fmt"

	"go.signoz.io/query-service/dao"
)

var (
	ErrorInvalidCreds = fmt.Errorf("Invalid credentials")
)

type LoginRequest struct {
	Email        string
	Password     string
	RefreshToken string
}

type LoginResponse struct {
	accessJwt  string
	refrestJwt string
}

// Login method returns access and refresh tokens on successful login, else it errors out.
func Login(ctx context.Context, request *LoginRequest) (*LoginResponse, error) {
	user, err := authenticateLogin(ctx, request)
	if err != nil {
		return nil, err
	}

	accessJwt, err := generateAccessJwt(user.ID, user.Groups)
	if err != nil {
		return nil, err
	}
	refreshJwt, err := generateRefreshJwt(user.ID)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{accessJwt: accessJwt, refrestJwt: refreshJwt}, nil
}

// authenticateLogin is responsible for querying the DB and validating the credentials.
func authenticateLogin(ctx context.Context, req *LoginRequest) (*User, error) {
	// TODO: Do refresh token validation.
	if len(req.RefreshToken) > 0 {
	}

	user, err := dao.DB().FetchUser(ctx, req.Email)
	if err != nil {
		return nil, err.Err
	}
	if user == nil || user.Password != req.Password {
		return nil, ErrorInvalidCreds
	}
	return &User{
		ID:       user.Email,
		Password: req.Password,
	}, nil
}
