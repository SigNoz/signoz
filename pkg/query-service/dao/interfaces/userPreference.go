package interfaces

import (
	"context"

	"go.signoz.io/query-service/model"
)

type Queries interface {
	FetchUserPreference(ctx context.Context) (*model.UserPreferences, *model.ApiError)
	FetchUser(ctx context.Context, email string) (*model.UserParams, *model.ApiError)

	FetchGroup(ctx context.Context, name string) (*model.Group, *model.ApiError)
	FetchGroupUsers(ctx context.Context, name string) (*[]model.GroupUser, *model.ApiError)
	FetchGroupRules(ctx context.Context, name string) (*[]model.GroupRule, *model.ApiError)
	FetchRule(ctx context.Context, id int) (*model.RBACRule, *model.ApiError)
}

type Mutations interface {
	UpdateUserPreferece(ctx context.Context, userPreferences *model.UserPreferences) *model.ApiError
	CreateNewUser(ctx context.Context, user *model.UserParams) *model.ApiError
	CreateNewGroup(ctx context.Context, group *model.Group) *model.ApiError
	AddUserToGroup(ctx context.Context, userId int, group string) *model.ApiError
	AddRuleToGroup(ctx context.Context, ruleId int, group string) *model.ApiError
	AddRule(ctx context.Context, rule *model.RBACRule) (int64, *model.ApiError)
}
