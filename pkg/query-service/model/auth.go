package model

import "github.com/pkg/errors"

var (
	ErrorTokenExpired = errors.New("Token is expired")
)

type LoginRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	RefreshToken string `json:"refreshToken"`
}

// PrecheckResponse contains login precheck response

type UserJwtObject struct {
	AccessJwt        string `json:"accessJwt"`
	AccessJwtExpiry  int64  `json:"accessJwtExpiry"`
	RefreshJwt       string `json:"refreshJwt"`
	RefreshJwtExpiry int64  `json:"refreshJwtExpiry"`
}

type LoginResponse struct {
	UserJwtObject
	UserId string `json:"userId"`
}

type UserRole struct {
	UserId    string `json:"user_id"`
	GroupName string `json:"group_name"`
}
