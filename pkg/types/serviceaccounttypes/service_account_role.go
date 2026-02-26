package serviceaccounttypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type StorableServiceAccountRole struct {
	bun.BaseModel `bun:"table:service_account_role"`

	types.Identifiable
	types.TimeAuditable
	ServiceAccountID string `bun:"service_account_id"`
	RoleID           string `bun:"role_id"`
}

func NewStorableServiceAccountRoles(serviceAccountID valuer.UUID, roles []*roletypes.Role) []*StorableServiceAccountRole {
	storableServiceAccountRoles := make([]*StorableServiceAccountRole, len(roles))
	for idx, role := range roles {
		storableServiceAccountRoles[idx] = &StorableServiceAccountRole{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			ServiceAccountID: serviceAccountID.String(),
			RoleID:           role.ID.String(),
		}
	}

	return storableServiceAccountRoles
}
