package interfaces

import (
	"context"

	"go.signoz.io/query-service/model"
)

type Queries interface {
	FetchUserPreference(ctx context.Context) (*model.UserPreferences, *model.ApiError)

	GetInviteFromEmail(ctx context.Context, email string) (*model.Invitation, *model.ApiError)
	GetInviteFromToken(ctx context.Context, token string) (*model.Invitation, *model.ApiError)
	GetInvites(ctx context.Context) ([]model.Invitation, *model.ApiError)

	GetUserGroup(ctx context.Context, id string) (*model.GroupUser, *model.ApiError)

	GetUser(ctx context.Context, id string) (*model.User, *model.ApiError)
	GetUserByEmail(ctx context.Context, email string) (*model.User, *model.ApiError)
	GetUsers(ctx context.Context) ([]model.User, *model.ApiError)

	GetGroup(ctx context.Context, id string) (*model.Group, *model.ApiError)
	GetGroupByName(ctx context.Context, name string) (*model.Group, *model.ApiError)
	GetGroups(ctx context.Context) ([]model.Group, *model.ApiError)

	GetRule(ctx context.Context, id string) (*model.RBACRule, *model.ApiError)
	GetRules(ctx context.Context) ([]model.RBACRule, *model.ApiError)
	GetGroupRules(ctx context.Context, id string) ([]model.GroupRule, *model.ApiError)
	GetGroupUsers(ctx context.Context, id string) ([]model.GroupUser, *model.ApiError)

	GetOrgs(ctx context.Context) ([]model.Organization, *model.ApiError)
	GetOrgByName(ctx context.Context, name string) (*model.Organization, *model.ApiError)
	GetOrg(ctx context.Context, id string) (*model.Organization, *model.ApiError)

	GetResetPasswordEntry(ctx context.Context, token string) (*model.ResetPasswordEntry, *model.ApiError)

	UpdateUserPassword(ctx context.Context, hash, userId string) *model.ApiError
}

type Mutations interface {
	UpdateUserPreferece(ctx context.Context, userPreferences *model.UserPreferences) *model.ApiError

	CreateInviteEntry(ctx context.Context, req *model.Invitation) *model.ApiError
	DeleteInvitation(ctx context.Context, email string) *model.ApiError

	CreateUser(ctx context.Context, user *model.User) (*model.User, *model.ApiError)
	EditUser(ctx context.Context, update *model.User) (*model.User, *model.ApiError)
	DeleteUser(ctx context.Context, id string) *model.ApiError
	CreateUserWithRole(ctx context.Context, user *model.User, role string) (*model.User, *model.ApiError)

	CreateGroup(ctx context.Context, group *model.Group) (*model.Group, *model.ApiError)
	DeleteGroup(ctx context.Context, id string) *model.ApiError

	CreateRule(ctx context.Context, rule *model.RBACRule) (*model.RBACRule, *model.ApiError)
	EditRule(ctx context.Context, update *model.RBACRule) (*model.RBACRule, *model.ApiError)
	DeleteRule(ctx context.Context, id string) *model.ApiError

	AddRuleToGroup(ctx context.Context, gr *model.GroupRule) *model.ApiError
	DeleteRuleFromGroup(ctx context.Context, gr *model.GroupRule) *model.ApiError
	AddUserToGroup(ctx context.Context, gu *model.GroupUser) *model.ApiError
	DeleteUserFromGroup(ctx context.Context, gu *model.GroupUser) *model.ApiError

	CreateOrg(ctx context.Context, org *model.Organization) (*model.Organization, *model.ApiError)
	EditOrg(ctx context.Context, org *model.Organization) *model.ApiError
	DeleteOrg(ctx context.Context, id string) *model.ApiError

	CreateResetPasswordEntry(ctx context.Context, req *model.ResetPasswordEntry) *model.ApiError
	DeleteResetPasswordEntry(ctx context.Context, token string) *model.ApiError
}
