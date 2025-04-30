package model

import "github.com/pkg/errors"

var (
	ErrorTokenExpired = errors.New("Token is expired")
)

type UserRole struct {
	UserId    string `json:"user_id"`
	GroupName string `json:"group_name"`
}
