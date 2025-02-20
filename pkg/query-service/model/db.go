package model

type ResetPasswordRequest struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}
