package identitytypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// IdentityStatus represents the status of an identity
type IdentityStatus string

const (
	IdentityStatusActive   IdentityStatus = "active"
	IdentityStatusInactive IdentityStatus = "inactive"
)

// StorableIdentity represents the database entity for a user's identity
type StorableIdentity struct {
	bun.BaseModel `bun:"table:identity"`

	ID        valuer.UUID    `bun:"id,pk,type:text" json:"id"`
	Status    IdentityStatus `bun:"status" json:"status"`
	OrgID     valuer.UUID    `bun:"org_id" json:"orgId"`
	CreatedAt time.Time      `bun:"created_at" json:"createdAt"`
	UpdatedAt time.Time      `bun:"updated_at" json:"updatedAt"`
}

// StorableIdentityRole represents the relationship between identity and role in the database
type StorableIdentityRole struct {
	bun.BaseModel `bun:"table:identity_role"`

	ID         valuer.UUID `bun:"id,pk,type:text" json:"id"`
	IdentityID valuer.UUID `bun:"identity_id" json:"identityId"`
	RoleName   string      `bun:"role_name" json:"roleName"`
	CreatedAt  time.Time   `bun:"created_at" json:"createdAt"`
	UpdatedAt  time.Time   `bun:"updated_at" json:"updatedAt"`
}

// NewStorableIdentity creates a new storable identity
func NewStorableIdentity(id valuer.UUID, orgID valuer.UUID) *StorableIdentity {
	now := time.Now()
	return &StorableIdentity{
		ID:        id,
		Status:    IdentityStatusActive,
		OrgID:     orgID,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// NewStorableIdentityRole creates a new identity-role mapping
func NewStorableIdentityRole(identityID valuer.UUID, roleName string) *StorableIdentityRole {
	now := time.Now()
	return &StorableIdentityRole{
		ID:         valuer.GenerateUUID(),
		IdentityID: identityID,
		RoleName:   roleName,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}
