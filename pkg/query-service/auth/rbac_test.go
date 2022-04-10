package auth

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
)

func TestCreateUser(t *testing.T) {
	ctx := context.Background()
	user, err := dao.DB().CreateUser(ctx, &model.User{
		Name:             "alice",
		OrganizationName: "alices_org",
		Email:            "alice@signoz.io",
		Password:         "alices_password_hash",
	})
	require.Nil(t, err)

	user2, err := dao.DB().GetUser(ctx, user.Id)
	require.Nil(t, err)
	require.Equal(t, user.Name, user2.Name)
	require.Equal(t, user.OrganizationName, user2.OrganizationName)
	require.Equal(t, user.Email, user2.Email)
	require.Equal(t, user.Password, user2.Password)
}

func TestEditUser(t *testing.T) {
	ctx := context.Background()
	user, err := dao.DB().CreateUser(ctx, &model.User{
		Name:             "alice2",
		OrganizationName: "alices2_org",
		Email:            "alice2@signoz.io",
		Password:         "alices2_password_hash",
	})
	require.Nil(t, err)

	_, err = dao.DB().EditUser(ctx, &model.User{
		Id:               user.Id,
		Name:             "bob",
		OrganizationName: "alices2_org",
		Email:            "alice2@signoz.io",
		Password:         "alices2_password_hash",
	})
	require.Nil(t, err)

	user2, err := dao.DB().GetUser(ctx, user.Id)
	require.Nil(t, err)
	require.Equal(t, "bob", user2.Name)
	require.Equal(t, user.OrganizationName, user2.OrganizationName)
	require.Equal(t, user.Email, user2.Email)
	require.Equal(t, user.Password, user2.Password)
}

func TestDeleteUser(t *testing.T) {
	ctx := context.Background()
	user, err := dao.DB().CreateUser(ctx, &model.User{
		Name:             "alice3",
		OrganizationName: "alices3_org",
		Email:            "alice3@signoz.io",
		Password:         "alices3_password_hash",
	})
	require.Nil(t, err)

	err = dao.DB().DeleteUser(ctx, user.Id)
	require.Nil(t, err)

	user2, err := dao.DB().GetUser(ctx, user.Id)
	require.Nil(t, err)
	require.Nil(t, user2)
}

func TestCreateGroup(t *testing.T) {
	ctx := context.Background()
	groupName := "dev"

	g, err := dao.DB().CreateGroup(ctx, &model.Group{Name: groupName})
	require.Nil(t, err)

	g2, err := dao.DB().GetGroup(ctx, g.Id)
	require.Nil(t, err)
	require.Equal(t, g.Name, g2.Name)

	// Creating another group with same name should fail.
	g, err = dao.DB().CreateGroup(ctx, &model.Group{Name: groupName})
	require.Contains(t, err.Err.Error(), "UNIQUE constraint failed: groups.name")
}

func TestDeleteGroup(t *testing.T) {
	ctx := context.Background()
	groupName := "dev2"

	g, err := dao.DB().CreateGroup(ctx, &model.Group{Name: groupName})
	require.Nil(t, err)

	err = dao.DB().DeleteGroup(ctx, g.Id)
	require.Nil(t, err)

	group2, err := dao.DB().GetGroup(ctx, g.Id)
	require.Nil(t, err)
	require.Nil(t, group2)
}

func TestCreateRule(t *testing.T) {
	ctx := context.Background()
	rule, err := dao.DB().CreateRule(ctx, &model.RBACRule{
		ApiClass:   "dashboard",
		Permission: ReadPermission})
	require.Nil(t, err)

	readRule, err := dao.DB().GetRule(ctx, rule.Id)
	require.Nil(t, err)

	require.Equal(t, rule.Id, readRule.Id)
	require.Equal(t, "dashboard", readRule.ApiClass)
	require.Equal(t, ReadPermission, readRule.Permission)
}

func TestEditRule(t *testing.T) {
	ctx := context.Background()
	rule, err := dao.DB().CreateRule(ctx, &model.RBACRule{
		ApiClass:   "dashboard",
		Permission: ReadPermission})
	require.Nil(t, err)

	_, err = dao.DB().EditRule(ctx, &model.RBACRule{
		Id:         rule.Id,
		ApiClass:   rule.ApiClass,
		Permission: WritePermission,
	})
	require.Nil(t, err)

	newRule, err := dao.DB().GetRule(ctx, rule.Id)
	require.Nil(t, err)
	require.Equal(t, rule.Id, newRule.Id)
	require.Equal(t, rule.ApiClass, newRule.ApiClass)
	require.Equal(t, WritePermission, newRule.Permission)
}

func TestAddRuleToGroup(t *testing.T) {
	ctx := context.Background()
	rule, err := dao.DB().CreateRule(ctx, &model.RBACRule{
		ApiClass:   "dashboard",
		Permission: ReadPermission})
	require.Nil(t, err)

	groupName := "dev2"

	g, err := dao.DB().CreateGroup(ctx, &model.Group{Name: groupName})
	require.Nil(t, err)

	err = dao.DB().AddRuleToGroup(ctx, &model.GroupRule{GroupId: g.Id, RuleId: rule.Id})
	require.Nil(t, err)

	rules, err := dao.DB().GetGroupRules(ctx, g.Id)
	require.Nil(t, err)

	require.Equal(t, rule.Id, rules[0].RuleId)
	require.Equal(t, g.Id, rules[0].GroupId)

	// Same rule cannot be added twice.
	err = dao.DB().AddRuleToGroup(ctx, &model.GroupRule{GroupId: g.Id, RuleId: rule.Id})
	require.Contains(t, err.Err.Error(), "UNIQUE constraint failed")

	err = dao.DB().DeleteRuleFromGroup(ctx, &model.GroupRule{GroupId: g.Id, RuleId: rule.Id})
	require.Nil(t, err)

	rules, err = dao.DB().GetGroupRules(ctx, g.Id)
	require.Nil(t, err)
	require.Equal(t, 0, len(rules))
}

func TestAddUserToGroup(t *testing.T) {
	ctx := context.Background()
	user, err := dao.DB().CreateUser(ctx, &model.User{
		Name:             "alice3",
		OrganizationName: "alices3_org",
		Email:            "alice3@signoz.io",
		Password:         "alices3_password_hash",
	})
	require.Nil(t, err)

	groupName := "dev3"

	g, err := dao.DB().CreateGroup(ctx, &model.Group{Name: groupName})
	require.Nil(t, err)

	err = dao.DB().AddUserToGroup(ctx, &model.GroupUser{GroupId: g.Id, UserId: user.Id})
	require.Nil(t, err)

	users, err := dao.DB().GetGroupUsers(ctx, g.Id)
	require.Nil(t, err)

	require.Equal(t, user.Id, users[0].UserId)
	require.Equal(t, g.Id, users[0].GroupId)

	// Same user cannot be added twice.
	err = dao.DB().AddUserToGroup(ctx, &model.GroupUser{GroupId: g.Id, UserId: user.Id})
	require.Contains(t, err.Err.Error(), "UNIQUE constraint failed")

	err = dao.DB().DeleteUserFromGroup(ctx, &model.GroupUser{GroupId: g.Id, UserId: user.Id})
	require.Nil(t, err)

	users, err = dao.DB().GetGroupUsers(ctx, g.Id)
	require.Nil(t, err)
	require.Equal(t, 0, len(users))
}
