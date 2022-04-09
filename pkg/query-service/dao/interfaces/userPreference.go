package interfaces

import (
	"context"

	"go.signoz.io/query-service/model"
)

type Queries interface {
	FetchUserPreference(ctx context.Context) (*model.UserPreferences, *model.ApiError)

	GetUser(ctx context.Context, id string) (*model.User, *model.ApiError)
	GetUserByEmail(ctx context.Context, email string) (*model.User, *model.ApiError)
	GetUsers(ctx context.Context) ([]model.User, *model.ApiError)

	GetGroup(ctx context.Context, id string) (*model.Group, *model.ApiError)
	GetGroups(ctx context.Context) ([]model.Group, *model.ApiError)

	GetRule(ctx context.Context, id string) (*model.RBACRule, *model.ApiError)
	GetRules(ctx context.Context) ([]model.RBACRule, *model.ApiError)
	GetGroupRules(ctx context.Context, id string) ([]model.GroupRule, *model.ApiError)
	GetGroupUsers(ctx context.Context, id string) ([]model.GroupUser, *model.ApiError)
}

type Mutations interface {
	UpdateUserPreferece(ctx context.Context, userPreferences *model.UserPreferences) *model.ApiError

	CreateUser(ctx context.Context, user *model.User) (*model.User, *model.ApiError)
	EditUser(ctx context.Context, update *model.User) (*model.User, *model.ApiError)
	DeleteUser(ctx context.Context, id string) *model.ApiError

	CreateGroup(ctx context.Context, group *model.Group) (*model.Group, *model.ApiError)
	DeleteGroup(ctx context.Context, id string) *model.ApiError

	CreateRule(ctx context.Context, rule *model.RBACRule) (*model.RBACRule, *model.ApiError)
	EditRule(ctx context.Context, update *model.RBACRule) (*model.RBACRule, *model.ApiError)
	DeleteRule(ctx context.Context, id string) *model.ApiError

	AddRuleToGroup(ctx context.Context, gr *model.GroupRule) *model.ApiError
	DeleteRuleFromGroup(ctx context.Context, gr *model.GroupRule) *model.ApiError
	AddUserToGroup(ctx context.Context, gu *model.GroupUser) *model.ApiError
	DeleteUserFromGroup(ctx context.Context, gu *model.GroupUser) *model.ApiError
}
