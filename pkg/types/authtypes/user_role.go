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
	ErrCodeUserRolesNotFound     = errors.MustNewCode("user_roles_not_found")
)

type UserRole struct {
	bun.BaseModel `bun:"table:user_role,alias:user_role"`

	ID        valuer.UUID `bun:"id,pk,type:text" json:"id" required:"true"`
	UserID    valuer.UUID `bun:"user_id" json:"userId" required:"true"`
	RoleID    valuer.UUID `bun:"role_id" json:"roleId" required:"true"`
	CreatedAt time.Time   `bun:"created_at" json:"createdAt" required:"true"`
	UpdatedAt time.Time   `bun:"updated_at" json:"updatedAt" required:"true"`

	// read only fields
	Role *Role `bun:"rel:belongs-to,join:role_id=id" json:"role" required:"true"`
}

func newUserRole(userID valuer.UUID, roleID valuer.UUID) *UserRole {
	return &UserRole{
		ID:        valuer.GenerateUUID(),
		UserID:    userID,
		RoleID:    roleID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func NewUserRoles(userID valuer.UUID, roles []*Role) []*UserRole {
	userRoles := make([]*UserRole, len(roles))

	for idx, role := range roles {
		userRoles[idx] = newUserRole(userID, role.ID)
	}

	return userRoles
}

type UserWithRoles struct {
	*types.User
	UserRoles []*UserRole `json:"userRoles"`
}

type UserRoleStore interface {
	// create user roles in bulk
	CreateUserRoles(ctx context.Context, userRoles []*UserRole) error

	// get user roles by user id
	GetUserRolesByUserID(ctx context.Context, userID valuer.UUID) ([]*UserRole, error)

	// list all user_role entries for
	ListUserRolesByOrgIDAndUserIDs(ctx context.Context, orgID valuer.UUID, userIDs []valuer.UUID) ([]*UserRole, error)

	// delete user role entries by user id
	DeleteUserRoles(ctx context.Context, userID valuer.UUID) error

	// delete a single user role entry by user id and role id
	DeleteUserRoleByUserIDAndRoleID(ctx context.Context, userID valuer.UUID, roleID valuer.UUID) error
}
