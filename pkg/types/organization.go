package types

import (
	"time"

	"github.com/uptrace/bun"
)

// TODO: check constraints are not working
type Organization struct {
	bun.BaseModel `bun:"table:organizations"`

	ID              string `bun:"id,pk,type:text"`
	Name            string `bun:"name,type:text,notnull"`
	CreatedAt       int    `bun:"created_at,notnull"`
	IsAnonymous     int    `bun:"is_anonymous,notnull,default:0,CHECK(is_anonymous IN (0,1))"`
	HasOptedUpdates int    `bun:"has_opted_updates,notnull,default:1,CHECK(has_opted_updates IN (0,1))"`
}

type Invite struct {
	bun.BaseModel `bun:"table:invites"`

	ID        int    `bun:"id,pk,autoincrement"`
	Name      string `bun:"name,type:text,notnull"`
	Email     string `bun:"email,type:text,notnull,unique"`
	Token     string `bun:"token,type:text,notnull"`
	CreatedAt int    `bun:"created_at,notnull"`
	Role      string `bun:"role,type:text,notnull"`
	OrgID     string `bun:"org_id,type:text,notnull"`
}

type Group struct {
	bun.BaseModel `bun:"table:groups"`
	ID            string `bun:"id,pk,type:text" json:"id"`
	Name          string `bun:"name,type:text,notnull,unique" json:"name"`
}

type User struct {
	bun.BaseModel     `bun:"table:users"`
	ID                string `bun:"id,pk,type:text"`
	Name              string `bun:"name,type:text,notnull"`
	Email             string `bun:"email,type:text,notnull,unique"`
	Password          string `bun:"password,type:text,notnull"`
	CreatedAt         int    `bun:"created_at,notnull"`
	ProfilePictureURL string `bun:"profile_picture_url,type:text"`
	GroupID           string `bun:"group_id,type:text,notnull"`
	OrgID             string `bun:"org_id,type:text,notnull"`
}

type ResetPasswordRequest struct {
	bun.BaseModel `bun:"table:reset_password_request"`
	ID            int    `bun:"id,pk,autoincrement"`
	Token         string `bun:"token,type:text,notnull"`
	UserID        string `bun:"user_id,type:text,notnull"`
}

type UserFlags struct {
	bun.BaseModel `bun:"table:user_flags"`
	UserID        string `bun:"user_id,pk,type:text,notnull"`
	Flags         string `bun:"flags,type:text"`
}

type ApdexSettings struct {
	bun.BaseModel      `bun:"table:apdex_settings"`
	ServiceName        string  `bun:"service_name,pk,type:text"`
	Threshold          float64 `bun:"threshold,type:float,notnull"`
	ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull"`
}

type IngestionKey struct {
	bun.BaseModel `bun:"table:ingestion_keys"`
	KeyId         string    `bun:"key_id,pk,type:text"`
	Name          string    `bun:"name,type:text"`
	CreatedAt     time.Time `bun:"created_at,default:current_timestamp"`
	IngestionKey  string    `bun:"ingestion_key,type:text,notnull"`
	IngestionURL  string    `bun:"ingestion_url,type:text,notnull"`
	DataRegion    string    `bun:"data_region,type:text,notnull"`
}
