package types

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type PostableAPIKey struct {
	Name          string `json:"name"`
	Role          Role   `json:"role"`
	ExpiresInDays int64  `json:"expiresInDays"`
}

type GettableAPIKey struct {
	CreatedByUser *User `json:"createdByUser" bun:"created_by_user,rel:belongs-to,join:created_by=id"`
	UpdatedByUser *User `json:"updatedByUser" bun:"updated_by_user,rel:belongs-to,join:updated_by=id"`

	StorableAPIKey `bun:",extend"`
}

type StorableAPIKey struct {
	bun.BaseModel `bun:"table:factor_api_key"`

	Identifiable

	CreatedAt time.Time `bun:"created_at,notnull,nullzero,type:timestamptz" json:"createdAt"`
	UpdatedAt time.Time `bun:"updated_at,notnull,nullzero,type:timestamptz" json:"updatedAt"`
	CreatedBy string    `bun:"created_by,notnull" json:"createdBy"`
	UpdatedBy string    `bun:"updated_by,notnull" json:"updatedBy"`

	Token     string `json:"token" bun:"token,type:text,notnull,unique"`
	Role      Role   `json:"role" bun:"role,type:text,notnull,default:'ADMIN'"`
	Name      string `json:"name" bun:"name,type:text,notnull"`
	ExpiresAt int64  `json:"expiresAt" bun:"expires_at,notnull,default:0"`
	LastUsed  int64  `json:"lastUsed" bun:"last_used,notnull,default:0"`
	Revoked   bool   `json:"revoked" bun:"revoked,notnull,default:false"`
	UserID    string `json:"userId" bun:"user_id,type:text,notnull"`
}

func NewStorableAPIKey(name, userID string, role Role, expiresAt int64) (*StorableAPIKey, error) {
	// validate
	if expiresAt < 0 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "valid expiresAt is required")
	}

	if name == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "valid name is required")
	}

	if role == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "valid role is required")
	}

	now := time.Now()
	// convert expiresAt to unix timestamp from days
	expiresAt = now.Unix() + (expiresAt * 24 * 60 * 60)

	// Generate a 32-byte random token.
	token := make([]byte, 32)
	_, err := rand.Read(token)
	if err != nil {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to generate token")
	}
	// Encode the token in base64.
	encodedToken := base64.StdEncoding.EncodeToString(token)

	return &StorableAPIKey{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		CreatedAt: now,
		UpdatedAt: now,
		CreatedBy: userID,
		UpdatedBy: userID,
		Token:     encodedToken,
		Name:      name,
		Role:      role,
		UserID:    userID,
		ExpiresAt: expiresAt,
		LastUsed:  0,
		Revoked:   false,
	}, nil
}
