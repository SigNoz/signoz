package model

import "github.com/pkg/errors"

var (
	ErrorTokenExpired = errors.New("Token is expired")
)

type InviteRequest struct {
	Name            string `json:"name"`
	Email           string `json:"email"`
	Role            string `json:"role"`
	FrontendBaseUrl string `json:"frontendBaseUrl"`
}

type InviteResponse struct {
	Email       string `json:"email"`
	InviteToken string `json:"inviteToken"`
}

type InvitationResponseObject struct {
	Email        string `json:"email" db:"email"`
	Name         string `json:"name" db:"name"`
	Token        string `json:"token" db:"token"`
	CreatedAt    int64  `json:"createdAt" db:"created_at"`
	Role         string `json:"role" db:"role"`
	Organization string `json:"organization" db:"organization"`
}

type LoginRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	RefreshToken string `json:"refreshToken"`
}

// PrecheckResponse contains login precheck response
type PrecheckResponse struct {
	SSO             bool   `json:"sso"`
	SsoUrl          string `json:"ssoUrl"`
	CanSelfRegister bool   `json:"canSelfRegister"`
	IsUser          bool   `json:"isUser"`
	SsoError        string `json:"ssoError"`
}

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

type ChangePasswordRequest struct {
	UserId      string `json:"userId"`
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

type ResetPasswordEntry struct {
	UserId string `json:"userId" db:"user_id"`
	Token  string `json:"token" db:"token"`
}

type UserRole struct {
	UserId    string `json:"user_id"`
	GroupName string `json:"group_name"`
}
