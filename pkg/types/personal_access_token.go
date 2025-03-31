package types

import (
	"time"

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

func NewStorablePersonalAccessToken(token, name, role, userID string, expiresAt int64) StorablePersonalAccessToken {
	now := time.Now()
	if expiresAt != 0 {
		// convert expiresAt to unix timestamp from days
		expiresAt = time.Now().Unix() + (expiresAt * 24 * 60 * 60)
	}
	return StorablePersonalAccessToken{
		Token:           token,
		Name:            name,
		Role:            role,
		UserID:          userID,
		ExpiresAt:       expiresAt,
		LastUsed:        0,
		Revoked:         false,
		UpdatedByUserID: "",
		TimeAuditable: TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
	}
}
