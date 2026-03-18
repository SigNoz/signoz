package authtypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeUserRoleAlreadyExists = errors.MustNewCode("user_role_already_exists")
)

type StorableUserRole struct {
	bun.BaseModel `bun:"table:user_role,alias:user_role"`

	types.Identifiable

	UserID valuer.UUID `bun:"user_id"`
	RoleID valuer.UUID `bun:"role_id"`

	types.TimeAuditable
}

func newStorableUserRole(userID valuer.UUID, roleID valuer.UUID) *StorableUserRole {
	return &StorableUserRole{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		UserID: userID,
		RoleID: roleID,
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}
}

func NewStorableUserRoles(userID valuer.UUID, roles []*Role) []*StorableUserRole {
	storableUserRoles := make([]*StorableUserRole, len(roles))

	for idx, role := range roles {
		storableUserRoles[idx] = newStorableUserRole(userID, role.ID)
	}

	return storableUserRoles
}

func GetUserIDToRoleIDsMappingAndUniqueRoles(storableUserRoles []*StorableUserRole) (map[valuer.UUID][]valuer.UUID, []valuer.UUID) {
	userIDRoles := make(map[valuer.UUID][]valuer.UUID)
	uniqueRoleIDSet := make(map[valuer.UUID]struct{})

	for _, userRole := range storableUserRoles {
		userID := userRole.UserID
		if _, ok := userIDRoles[userID]; !ok {
			userIDRoles[userID] = make([]valuer.UUID, 0)
		}
		roleUUID := userRole.RoleID
		userIDRoles[userID] = append(userIDRoles[userID], roleUUID)
		uniqueRoleIDSet[userRole.RoleID] = struct{}{}
	}

	roleIDs := make([]valuer.UUID, 0, len(uniqueRoleIDSet))
	for rid := range uniqueRoleIDSet {
		roleIDs = append(roleIDs, rid)
	}

	return userIDRoles, roleIDs
}

func NewRoleNamesFromStorableUserRoles(storableUserRoles []*StorableUserRole, roles []*Role) ([]string, error) {
	roleIDToName := make(map[valuer.UUID]string, len(roles))
	for _, role := range roles {
		roleIDToName[role.ID] = role.Name
	}

	names := make([]string, 0, len(storableUserRoles))
	for _, storableUserRole := range storableUserRoles {
		roleName, ok := roleIDToName[storableUserRole.RoleID]
		if !ok {
			return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "role id %s not found in provided roles", storableUserRole.RoleID)
		}
		names = append(names, roleName)
	}

	return names, nil
}

type UserRoleStore interface {
	// create user roles in bulk
	CreateUserRoles(ctx context.Context, userRoles []*StorableUserRole) error

	// get user roles by user id
	GetUserRolesByUserID(ctx context.Context, userID valuer.UUID) ([]*StorableUserRole, error)

	// list all user_role entries for
	ListUserRolesByOrgIDAndUserIDs(ctx context.Context, orgID valuer.UUID, userIDs []valuer.UUID) ([]*StorableUserRole, error)

	// delete user role entries by user id
	DeleteUserRoles(ctx context.Context, userID valuer.UUID) error
}
