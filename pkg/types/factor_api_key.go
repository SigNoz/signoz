package types

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var NEVER_EXPIRES = time.Unix(0, 0)

type PostableAPIKey struct {
	Name          string `json:"name"`
	Role          Role   `json:"role"`
	ExpiresInDays int64  `json:"expiresInDays"`
}

type GettableAPIKey struct {
	Identifiable
	TimeAuditable
	UserAuditable
	Token         string `json:"token"`
	Role          Role   `json:"role"`
	Name          string `json:"name"`
	ExpiresAt     int64  `json:"expiresAt"`
	LastUsed      int64  `json:"lastUsed"`
	Revoked       bool   `json:"revoked"`
	UserID        string `json:"userId"`
	CreatedByUser *User  `json:"createdByUser"`
	UpdatedByUser *User  `json:"updatedByUser"`
}

type OrgUserAPIKey struct {
	*Organization `bun:",extend"`
	Users         []*UserWithAPIKey `bun:"rel:has-many,join:id=org_id"`
}

type UserWithAPIKey struct {
	*User   `bun:",extend"`
	APIKeys []*StorableAPIKeyUser `bun:"rel:has-many,join:id=user_id"`
}

type StorableAPIKeyUser struct {
	StorableAPIKey `bun:",extend"`

	CreatedByUser *User `json:"createdByUser" bun:"created_by_user,rel:belongs-to,join:created_by=id"`
	UpdatedByUser *User `json:"updatedByUser" bun:"updated_by_user,rel:belongs-to,join:updated_by=id"`
}

type StorableAPIKey struct {
	bun.BaseModel `bun:"table:factor_api_key"`

	Identifiable
	TimeAuditable
	UserAuditable
	Token     string      `json:"token" bun:"token,type:text,notnull,unique"`
	Role      Role        `json:"role" bun:"role,type:text,notnull,default:'ADMIN'"`
	Name      string      `json:"name" bun:"name,type:text,notnull"`
	ExpiresAt time.Time   `json:"-" bun:"expires_at,notnull,nullzero,type:timestamptz"`
	LastUsed  time.Time   `json:"-" bun:"last_used,notnull,nullzero,type:timestamptz"`
	Revoked   bool        `json:"revoked" bun:"revoked,notnull,default:false"`
	UserID    valuer.UUID `json:"userId" bun:"user_id,type:text,notnull"`
}

func NewStorableAPIKey(name string, userID valuer.UUID, role Role, expiresAt int64) (*StorableAPIKey, error) {
	// validate

	// we allow the APIKey if expiresAt is not set, which means it never expires
	if expiresAt < 0 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "expiresAt must be greater than 0")
	}

	if name == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "name cannot be empty")
	}

	if role == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "role cannot be empty")
	}

	now := time.Now()
	// convert expiresAt to unix timestamp from days
	// expiresAt = now.Unix() + (expiresAt * 24 * 60 * 60)
	expiresAtTime := now.AddDate(0, 0, int(expiresAt))

	// if the expiresAt is 0, it means the APIKey never expires
	if expiresAt == 0 {
		expiresAtTime = NEVER_EXPIRES
	}

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
		TimeAuditable: TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
		UserAuditable: UserAuditable{
			CreatedBy: userID.String(),
			UpdatedBy: userID.String(),
		},
		Token:     encodedToken,
		Name:      name,
		Role:      role,
		UserID:    userID,
		ExpiresAt: expiresAtTime,
		LastUsed:  now,
		Revoked:   false,
	}, nil
}

func NewGettableAPIKeyFromStorableAPIKey(storableAPIKey *StorableAPIKeyUser) *GettableAPIKey {
	lastUsed := storableAPIKey.LastUsed.Unix()
	if storableAPIKey.LastUsed == storableAPIKey.CreatedAt {
		lastUsed = 0
	}
	return &GettableAPIKey{
		Identifiable:  storableAPIKey.Identifiable,
		TimeAuditable: storableAPIKey.TimeAuditable,
		UserAuditable: storableAPIKey.UserAuditable,
		Token:         storableAPIKey.Token,
		Role:          storableAPIKey.Role,
		Name:          storableAPIKey.Name,
		ExpiresAt:     storableAPIKey.ExpiresAt.Unix(),
		LastUsed:      lastUsed,
		Revoked:       storableAPIKey.Revoked,
		UserID:        storableAPIKey.UserID.String(),
		CreatedByUser: storableAPIKey.CreatedByUser,
		UpdatedByUser: storableAPIKey.UpdatedByUser,
	}
}
