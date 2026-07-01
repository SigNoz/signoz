package authtypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeUserRoleAlreadyExists = errors.MustNewCode("user_role_already_exists")
	ErrCodeUserRolesNotFound     = errors.MustNewCode("user_roles_not_found")
	ErrCodeUserRoleInvalidInput  = errors.MustNewCode("user_role_invalid_input")
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

type UserWithRoles struct {
	*types.User
	UserRoles []*UserRole `json:"userRoles"`
}

type PostableUser struct {
	DisplayName     string              `json:"displayName"`
	Email           valuer.Email        `json:"email" required:"true"`
	FrontendBaseUrl string              `json:"frontendBaseUrl"`
	UserRoles       []*PostableUserRole `json:"userRoles" required:"false" nullable:"false"`
}

type PostableUserRole struct {
	ID valuer.UUID `json:"id" required:"true"`
}

func (p *PostableUser) UnmarshalJSON(data []byte) error {
	type Alias PostableUser

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	for _, role := range temp.UserRoles {
		if role == nil {
			return errors.New(errors.TypeInvalidInput, ErrCodeUserRoleInvalidInput, "userRoles cannot contain null entries")
		}
	}

	*p = PostableUser(temp)
	return nil
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
