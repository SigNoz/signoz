package types

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

type GettablePAT struct {
	CreatedByUser PatUser `json:"createdByUser"`
	UpdatedByUser PatUser `json:"updatedByUser"`

	StorablePersonalAccessToken
}

type PatUser struct {
	types.User
	NotFound bool `json:"notFound"`
}

func NewGettablePAT(name, role, userID string, expiresAt int64) GettablePAT {
	return GettablePAT{
		StorablePersonalAccessToken: NewStorablePersonalAccessToken(name, role, userID, expiresAt),
	}
}

type StorablePersonalAccessToken struct {
	bun.BaseModel `bun:"table:personal_access_tokens"`

	types.TimeAuditable
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

func NewStorablePersonalAccessToken(name, role, userID string, expiresAt int64) StorablePersonalAccessToken {
	now := time.Now()
	if expiresAt != 0 {
		// convert expiresAt to unix timestamp from days
		expiresAt = now.Unix() + (expiresAt * 24 * 60 * 60)
	}

	// Generate a 32-byte random token.
	token := make([]byte, 32)
	rand.Read(token)
	// Encode the token in base64.
	encodedToken := base64.StdEncoding.EncodeToString(token)

	return StorablePersonalAccessToken{
		Token:           encodedToken,
		Name:            name,
		Role:            role,
		UserID:          userID,
		ExpiresAt:       expiresAt,
		LastUsed:        0,
		Revoked:         false,
		UpdatedByUserID: "",
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
	}
}
