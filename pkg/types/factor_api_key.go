package types

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type PostableAPIKey struct {
	Name          string `json:"name"`
	Role          string `json:"role"`
	ExpiresInDays int64  `json:"expiresInDays"`
}

type GettableAPIKey struct {
	CreatedByUser APIKeyUser `json:"createdByUser"`
	UpdatedByUser APIKeyUser `json:"updatedByUser"`

	StorableAPIKey
}

type APIKeyUser struct {
	User
	NotFound bool `json:"notFound"`
}

func NewGettableAPIKey(name, role, createdByUserID, userID string, expiresAt int64) GettableAPIKey {
	return GettableAPIKey{
		StorableAPIKey: NewStorableAPIKey(name, role, userID, expiresAt),
	}
}

type StorableAPIKey struct {
	bun.BaseModel `bun:"table:personal_access_token"`

	Identifiable
	TimeAuditable
	UserAuditable
	Token     string `json:"token" bun:"token,type:text,notnull,unique"`
	Role      string `json:"role" bun:"role,type:text,notnull,default:'ADMIN'"`
	Name      string `json:"name" bun:"name,type:text,notnull"`
	ExpiresAt int64  `json:"expiresAt" bun:"expires_at,notnull,default:0"`
	LastUsed  int64  `json:"lastUsed" bun:"last_used,notnull,default:0"`
	Revoked   bool   `json:"revoked" bun:"revoked,notnull,default:false"`
	UserID    string `json:"userId" bun:"user_id,type:text,notnull"`
}

func NewStorableAPIKey(name, role, userID string, expiresAt int64) StorableAPIKey {
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

	return StorableAPIKey{
		Token:     encodedToken,
		Name:      name,
		Role:      role,
		UserID:    userID,
		ExpiresAt: expiresAt,
		LastUsed:  0,
		Revoked:   false,
		TimeAuditable: TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
		UserAuditable: UserAuditable{
			CreatedBy: userID,
			UpdatedBy: "",
		},
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
	}
}
