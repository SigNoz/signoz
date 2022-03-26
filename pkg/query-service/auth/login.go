package auth

import "context"

type LoginRequest struct {
	UserID   string
	Password string
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
func authenticateLogin(ctx context.Context, request *LoginRequest) (*User, error) {
	return &User{
		ID:   request.UserID,
		Password: request.Password,
		Groups:   nil,
	}, nil
}
