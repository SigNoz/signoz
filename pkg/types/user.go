package types

import (
	"time"

	"github.com/uptrace/bun"
)

type Invite struct {
	bun.BaseModel `bun:"table:invites"`

	OrgID     string    `bun:"org_id,type:text,notnull" json:"orgId"`
	ID        int       `bun:"id,pk,autoincrement" json:"id"`
	Name      string    `bun:"name,type:text,notnull" json:"name"`
	Email     string    `bun:"email,type:text,notnull,unique" json:"email"`
	Token     string    `bun:"token,type:text,notnull" json:"token"`
	CreatedAt time.Time `bun:"created_at,notnull" json:"createdAt"`
	Role      string    `bun:"role,type:text,notnull" json:"role"`
}

type Group struct {
	bun.BaseModel `bun:"table:groups"`

	TimeAuditable
	OrgID string `bun:"org_id,type:text"`
	ID    string `bun:"id,pk,type:text" json:"id"`
	Name  string `bun:"name,type:text,notnull,unique" json:"name"`
}

type GettableUser struct {
	User
	Role         string `json:"role"`
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
	GroupID           string `bun:"group_id,type:text,notnull" json:"groupId"`
	OrgID             string `bun:"org_id,type:text,notnull" json:"orgId"`
}

type ResetPasswordRequest struct {
	bun.BaseModel `bun:"table:reset_password_request"`
	ID            int    `bun:"id,pk,autoincrement" json:"id"`
	Token         string `bun:"token,type:text,notnull" json:"token"`
	UserID        string `bun:"user_id,type:text,notnull" json:"userId"`
}
