package model

type User struct {
	Id                string `json:"id" db:"id"`
	Name              string `json:"name" db:"name"`
	Email             string `json:"email" db:"email"`
	CreatedAt         int64  `json:"createdAt" db:"created_at"`
	ProfilePictureURL string `json:"profilePictureURL" db:"profile_picture_url"`
	NotFound           bool   `json:"notFound"`
}

type PAT struct {
	Id              string `json:"id" db:"id"`
	UserID          string `json:"userId" db:"user_id"`
	CreatedByUser   User   `json:"createdByUser"`
	UpdatedByUser   User   `json:"updatedByUser"`
	Token           string `json:"token" db:"token"`
	Role            string `json:"role" db:"role"`
	Name            string `json:"name" db:"name"`
	CreatedAt       int64  `json:"createdAt" db:"created_at"`
	ExpiresAt       int64  `json:"expiresAt" db:"expires_at"`
	UpdatedAt        int64  `json:"updateAt" db:"updated_at"`
	LastUsed        int64  `json:"lastUsed" db:"last_used"`
	Revoked         bool   `json:"revoked" db:"revoked"`
	UpdatedByUserID string `json:"updatedByUserId" db:"updated_by_user_id"`
}
