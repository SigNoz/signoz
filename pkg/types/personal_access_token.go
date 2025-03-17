package types

import (
	"github.com/uptrace/bun"
)

type StorablePersonalAccessToken struct {
	bun.BaseModel `bun:"table:personal_access_tokens"`

	TimeAuditable
	OrgID           string `json:"orgId" bun:"org_id,type:text,notnull"`
	ID              int    `json:"id" bun:"id,pk,autoincrement"`
	Role            string `json:"role" bun:"role,type:text,notnull,default:'ADMIN'"`
	UserID          string `json:"userId" bun:"user_id,type:text,notnull"`
	Token           string `json:"token" bun:"token,type:text,notnull,unique"`
	Name            string `json:"name" bun:"name,type:text,notnull"`
	ExpiresAt       int64  `json:"expiresAt" bun:"expires_at,notnull,default:0"`
	LastUsed        int64  `json:"lastUsed" bun:"last_used,notnull,default:0"`
	Revoked         bool   `json:"revoked" bun:"revoked,notnull,default:false"`
	UpdatedByUserID string `json:"updatedByUserId" bun:"updated_by_user_id,type:text,notnull,default:''"`
}
type OrgDomain struct {
	bun.BaseModel `bun:"table:org_domains"`

	TimeAuditable
	ID    string `json:"id" bun:"id,pk,type:text"`
	OrgID string `json:"orgId" bun:"org_id,type:text,notnull"`
	Name  string `json:"name" bun:"name,type:varchar(50),notnull,unique"`
	Data  string `json:"data" bun:"data,type:text,notnull"`
}
