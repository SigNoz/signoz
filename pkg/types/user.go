package types

import (
	"github.com/uptrace/bun"
)

type Invite struct {
	bun.BaseModel `bun:"table:user_invite"`

	Identifiable
	TimeAuditable
	OrgID string `bun:"org_id,type:text,notnull" json:"orgId"`
	Name  string `bun:"name,type:text,notnull" json:"name"`
	Email string `bun:"email,type:text,notnull,unique" json:"email"`
	Token string `bun:"token,type:text,notnull" json:"token"`
	Role  string `bun:"role,type:text,notnull" json:"role"`
}

type GettableUser struct {
	User
	Organization string `json:"organization"`
}

type User struct {
	bun.BaseModel `bun:"table:users"`

	TimeAuditable
	ID                string `bun:"id,pk,type:text" json:"id"`
	Name              string `bun:"name,type:text,notnull" json:"name"`
	Email             string `bun:"email,type:text,notnull,unique" json:"email"`
	Password          string `bun:"password,type:text,notnull" json:"-"`
	ProfilePictureURL string `bun:"profile_picture_url,type:text" json:"profilePictureURL"`
	Role              string `bun:"role,type:text,notnull" json:"role"`
	OrgID             string `bun:"org_id,type:text,notnull" json:"orgId"`
}

type ResetPasswordRequest struct {
	bun.BaseModel `bun:"table:reset_password_request"`
	Identifiable
	Token  string `bun:"token,type:text,notnull" json:"token"`
	UserID string `bun:"user_id,type:text,notnull" json:"userId"`
}
