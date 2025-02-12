package types

import (
	"github.com/uptrace/bun"
)

type PersonalAccessToken struct {
	bun.BaseModel `bun:"table:personal_access_tokens"`

	ID              int    `bun:"id,pk,autoincrement"`
	Role            string `bun:"role,type:text,notnull,default:'ADMIN'"`
	UserID          string `bun:"user_id,type:text,notnull"`
	Token           string `bun:"token,type:text,notnull,unique"`
	Name            string `bun:"name,type:text,notnull"`
	CreatedAt       int    `bun:"created_at,notnull,default:0"`
	ExpiresAt       int    `bun:"expires_at,notnull,default:0"`
	UpdatedAt       int    `bun:"updated_at,notnull,default:0"`
	LastUsed        int    `bun:"last_used,notnull,default:0"`
	Revoked         bool   `bun:"revoked,notnull,default:false"`
	UpdatedByUserID string `bun:"updated_by_user_id,type:text,notnull,default:''"`
}

type OrgDomain struct {
	bun.BaseModel `bun:"table:org_domains"`

	ID        string `bun:"id,pk,type:text"`
	OrgID     string `bun:"org_id,type:text,notnull"`
	Name      string `bun:"name,type:varchar(50),notnull,unique"`
	CreatedAt int    `bun:"created_at,notnull"`
	UpdatedAt int    `bun:"updated_at,type:timestamp"`
	Data      string `bun:"data,type:text,notnull"`
}
