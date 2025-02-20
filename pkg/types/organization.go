package types

import (
	"time"

	"github.com/uptrace/bun"
)

type AuditableModel struct {
	CreatedAt time.Time `bun:"created_at" json:"createdAt"`
	CreatedBy string    `bun:"created_by" json:"createdBy"`
	UpdatedAt time.Time `bun:"updated_at" json:"updatedAt"`
	UpdatedBy string    `bun:"updated_by" json:"updatedBy"`
}

// TODO: check constraints are not working
type Organization struct {
	bun.BaseModel `bun:"table:organizations"`

	AuditableModel
	ID              string `bun:"id,pk,type:text" json:"id"`
	Name            string `bun:"name,type:text,notnull" json:"name"`
	IsAnonymous     bool   `bun:"is_anonymous,notnull,default:0,CHECK(is_anonymous IN (0,1))" json:"isAnonymous"`
	HasOptedUpdates bool   `bun:"has_opted_updates,notnull,default:1,CHECK(has_opted_updates IN (0,1))" json:"hasOptedUpdates"`
}

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

	AuditableModel
	OrgID string `bun:"org_id,type:text"`
	ID    string `bun:"id,pk,type:text" json:"id"`
	Name  string `bun:"name,type:text,notnull,unique" json:"name"`
}

type GettableUser struct {
	User
	Role         string    `json:"role"`
	Organization string    `json:"organization"`
	Flags        UserFlags `json:"flags,omitempty"`
}

type User struct {
	bun.BaseModel `bun:"table:users"`

	AuditableModel
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

type UserFlags struct {
	bun.BaseModel `bun:"table:user_flags"`
	UserID        *string `bun:"user_id,pk,type:text,notnull" json:"userId,omitempty"`
	Flags         *string `bun:"flags,type:text" json:"flags,omitempty"`
}

type ApdexSettings struct {
	bun.BaseModel      `bun:"table:apdex_settings"`
	ServiceName        string  `bun:"service_name,pk,type:text" json:"serviceName"`
	Threshold          float64 `bun:"threshold,type:float,notnull" json:"threshold"`
	ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull" json:"excludeStatusCodes"`
}

type IngestionKey struct {
	bun.BaseModel `bun:"table:ingestion_keys"`

	AuditableModel
	OrgID        string `bun:"org_id,type:text,notnull" json:"orgId"`
	KeyId        string `bun:"key_id,pk,type:text" json:"keyId"`
	Name         string `bun:"name,type:text" json:"name"`
	IngestionKey string `bun:"ingestion_key,type:text,notnull" json:"ingestionKey"`
	IngestionURL string `bun:"ingestion_url,type:text,notnull" json:"ingestionURL"`
	DataRegion   string `bun:"data_region,type:text,notnull" json:"dataRegion"`
}
