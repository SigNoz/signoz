package model

type CreatePATRequestBody struct {
	Name          string `json:"name"`
	Role          string `json:"role"`
	ExpiresInDays int64  `json:"expiresInDays"`
}
