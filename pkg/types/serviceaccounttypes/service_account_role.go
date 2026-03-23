package serviceaccounttypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type StorableServiceAccountRole struct {
	bun.BaseModel `bun:"table:service_account_role,alias:service_account_role"`

	types.Identifiable
	types.TimeAuditable
	ServiceAccountID string `bun:"service_account_id"`
	RoleID           string `bun:"role_id"`
}

func NewStorableServiceAccountRoles(serviceAccountID valuer.UUID, roles []*authtypes.Role) []*StorableServiceAccountRole {
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

func NewRolesFromStorableServiceAccountRoles(storable []*StorableServiceAccountRole, roles []*authtypes.Role) ([]string, error) {
	roleIDToName := make(map[string]string, len(roles))
	for _, role := range roles {
		roleIDToName[role.ID.String()] = role.Name
	}

	names := make([]string, 0, len(storable))
	for _, sar := range storable {
		roleName, ok := roleIDToName[sar.RoleID]
		if !ok {
			return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "role id %s not found in provided roles", sar.RoleID)
		}
		names = append(names, roleName)
	}

	return names, nil
}

func GetUniqueRolesAndServiceAccountMapping(storableServiceAccountRoles []*StorableServiceAccountRole) (map[string][]valuer.UUID, []valuer.UUID) {
	serviceAccountIDRoles := make(map[string][]valuer.UUID)
	uniqueRoleIDSet := make(map[string]struct{})

	for _, sar := range storableServiceAccountRoles {
		saID := sar.ServiceAccountID
		roleID := sar.RoleID
		if _, ok := serviceAccountIDRoles[saID]; !ok {
			serviceAccountIDRoles[saID] = make([]valuer.UUID, 0)
		}

		roleUUID := valuer.MustNewUUID(roleID)
		serviceAccountIDRoles[saID] = append(serviceAccountIDRoles[saID], roleUUID)
		uniqueRoleIDSet[roleID] = struct{}{}
	}

	roleIDs := make([]valuer.UUID, 0, len(uniqueRoleIDSet))
	for rid := range uniqueRoleIDSet {
		roleIDs = append(roleIDs, valuer.MustNewUUID(rid))
	}

	return serviceAccountIDRoles, roleIDs
}
