package identitytypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	IdentityStatusActive   = valuer.NewString("active")
	IdentityStatusInactive = valuer.NewString("inactive")
)

type StorableIdentity struct {
	bun.BaseModel `bun:"table:identity"`

	ID        valuer.UUID `bun:"id,pk,type:text" json:"id"`
	Status    string      `bun:"status" json:"status"`
	OrgID     valuer.UUID `bun:"org_id" json:"orgId"`
	CreatedAt time.Time   `bun:"created_at" json:"createdAt"`
	UpdatedAt time.Time   `bun:"updated_at" json:"updatedAt"`
}

type StorableIdentityRole struct {
	bun.BaseModel `bun:"table:identity_role"`

	ID         valuer.UUID `bun:"id,pk,type:text" json:"id"`
	IdentityID valuer.UUID `bun:"identity_id" json:"identityId"`
	RoleName   string      `bun:"role_name" json:"roleName"`
	CreatedAt  time.Time   `bun:"created_at" json:"createdAt"`
	UpdatedAt  time.Time   `bun:"updated_at" json:"updatedAt"`
}

func NewStorableIdentity(id valuer.UUID, orgID valuer.UUID) *StorableIdentity {
	now := time.Now()
	return &StorableIdentity{
		ID:        id,
		Status:    IdentityStatusActive.StringValue(),
		OrgID:     orgID,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

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
