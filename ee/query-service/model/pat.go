package model

type PAT struct {
	Id        string `json:"id" db:"id"`
	UserID    string `json:"userId" db:"user_id"`
	Token     string `json:"token" db:"token"`
	Name      string `json:"name" db:"name"`
	CreatedAt int64  `json:"createdAt" db:"created_at"`
	ExpiresAt int64  `json:"expiresAt" db:"expires_at"` // unused as of now
}
