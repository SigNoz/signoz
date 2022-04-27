package model

type InviteRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type InviteResponse struct {
	Email       string `json:"email"`
	InviteToken string `json:"inviteToken"`
}

type InvitationResponse struct {
	Email        string `json:"email" db:"email"`
	Name         string `json:"name" db:"name"`
	Token        string `json:"token" db:"token"`
	CreatedAt    int64  `json:"createdAt" db:"created_at"`
	Role         string `json:"role" db:"role"`
	Organization string `json:"organization" db:"organization"`
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

type UserWithRole struct {
	User
	Role string `json:"role"`
}

type UserRole struct {
	UserId    string `json:"user_id"`
	GroupName string `json:"group_name"`
}
