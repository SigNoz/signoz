package auth

import (
	"context"

	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
)

type Permission int32

const (
	ReadPermission = iota
	WritePermission
)

type Group struct {
	GroupID   string
	GroupName string
	Users     []*model.GroupUser
	Rules     []*model.RBACRule
}

func CreateGroup(ctx context.Context, name string) error {
	if apiErr := dao.DB().CreateNewGroup(ctx, &model.Group{Name: name}); apiErr != nil {
		return apiErr.Err
	}
	return nil
}

func GetGroup(ctx context.Context, name string) (*model.Group, error) {
	group, apiErr := dao.DB().FetchGroup(ctx, name)
	if apiErr != nil {
		return nil, apiErr.Err
	}
	return group, nil
}

func GroupUsers(ctx context.Context, name string) (*[]model.GroupUser, error) {
	users, apiErr := dao.DB().FetchGroupUsers(ctx, name)
	if apiErr != nil {
		return nil, apiErr.Err
	}
	return users, nil
}

func GroupRules(ctx context.Context, name string) (*[]model.GroupRule, error) {
	rules, apiErr := dao.DB().FetchGroupRules(ctx, name)
	if apiErr != nil {
		return nil, apiErr.Err
	}
	return rules, nil
}

func AddUserToGroup(ctx context.Context, req *model.GroupUser) error {
	apiErr := dao.DB().AddUserToGroup(ctx, req.UserId, req.GroupName)
	if apiErr != nil {
		return apiErr.Err
	}
	return nil
}

func CreateRule(ctx context.Context, rule *model.RBACRule) (int64, error) {
	id, apiErr := dao.DB().AddRule(ctx, rule)
	if apiErr != nil {
		return -1, apiErr.Err
	}
	return id, nil
}

func GetRule(ctx context.Context, id int) (*model.RBACRule, error) {
	rule, apiErr := dao.DB().FetchRule(ctx, id)
	if apiErr != nil {
		return nil, apiErr.Err
	}
	return rule, nil
}

func AddRuleToGroup(ctx context.Context, req *model.GroupRule) error {
	apiErr := dao.DB().AddRuleToGroup(ctx, req.RuleId, req.GroupName)
	if apiErr != nil {
		return apiErr.Err
	}
	return nil
}
