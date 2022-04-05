package sqlite

import (
	"context"
	"fmt"

	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

func (mds *ModelDaoSqlite) FetchGroup(ctx context.Context, name string) (*model.Group, *model.ApiError) {

	groups := []model.Group{}
	query := fmt.Sprintf(`SELECT id, name FROM groups WHERE name="%s";`, name)

	err := mds.db.Select(&groups, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(groups) > 1 {
		zap.S().Debug("Error in processing sql query: ", fmt.Errorf("more than 1 row in groups found"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(groups) == 0 {
		return nil, nil
	}

	return &groups[0], nil
}

func (mds *ModelDaoSqlite) CreateNewGroup(ctx context.Context, group *model.Group) *model.ApiError {

	old, apiErr := mds.FetchGroup(ctx, group.Name)
	if apiErr != nil {
		zap.S().Errorf("Error while querying for groups: %v", apiErr.Err)
		return apiErr
	}

	if old != nil {
		zap.S().Errorf("Group already present with name: %s", group.Name)
		return &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("Group already present with name: %s", group.Name)}
	}

	zap.S().Debug("Creating new group. Name: %s\n", group.Name)
	_, err := mds.db.ExecContext(ctx, `INSERT INTO groups (name) VALUES (?);`, group.Name)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT to groups\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (mds *ModelDaoSqlite) FetchGroupUsers(ctx context.Context, name string) (*[]model.GroupUser, *model.ApiError) {

	groupUsers := []model.GroupUser{}
	query := fmt.Sprintf(`SELECT groupId, name, userId FROM group_users WHERE name="%s";`, name)

	err := mds.db.Select(&groupUsers, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return &groupUsers, nil
}

func (mds *ModelDaoSqlite) AddUserToGroup(ctx context.Context, userId int, group string) *model.ApiError {
	zap.S().Debugf("Adding user: %d to group: %s\n", userId, group)

	g, apiErr := mds.FetchGroup(ctx, group)
	if apiErr != nil {
		zap.S().Errorf("Error in fetching groupId", apiErr.Err)
		return apiErr
	}

	_, err := mds.db.ExecContext(ctx, `INSERT INTO group_users (groupId, name, userId) VALUES (?, ?, ?);`, g.Id, g.Name, userId)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT user to group\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (mds *ModelDaoSqlite) FetchGroupRules(ctx context.Context, name string) (*[]model.GroupRule, *model.ApiError) {

	groupRules := []model.GroupRule{}
	query := fmt.Sprintf(`SELECT groupId, ruleId FROM group_rules WHERE name="%s";`, name)

	err := mds.db.Select(&groupRules, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return &groupRules, nil
}

func (mds *ModelDaoSqlite) AddRuleToGroup(ctx context.Context, ruleId int, group string) *model.ApiError {
	zap.S().Debugf("Adding rule: %d to group: %s\n", ruleId, group)

	g, apiErr := mds.FetchGroup(ctx, group)
	if apiErr != nil {
		zap.S().Errorf("Error in fetching groupId", apiErr.Err)
		return apiErr
	}

	_, err := mds.db.ExecContext(ctx, `INSERT INTO group_rules (groupId, name, ruleId) VALUES (?, ?,?);`, g.Id, g.Name, ruleId)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT rule to group\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (mds *ModelDaoSqlite) FetchRule(ctx context.Context, id int) (*model.RBACRule, *model.ApiError) {

	rules := []model.RBACRule{}
	query := fmt.Sprintf(`SELECT id, api, permission FROM rbac_rules WHERE id="%d";`, id)

	err := mds.db.Select(&rules, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(rules) > 1 {
		zap.S().Debug("Error in processing sql query: ", fmt.Errorf("more than 1 row in rules found"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(rules) == 0 {
		return nil, nil
	}

	return &rules[0], nil
}

func (mds *ModelDaoSqlite) AddRule(ctx context.Context, rule *model.RBACRule) (int64, *model.ApiError) {
	zap.S().Debug("Adding rule: %+v\n", rule)
	res, err := mds.db.ExecContext(ctx, `INSERT INTO rbac_rules (api, permission) VALUES (?, ?);`, rule.Api, rule.Permission)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT rule\n", err)
		return -1, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	id, err := res.LastInsertId()
	if err != nil {
		zap.S().Errorf("Error in getting id for the rule\n", err)
		return -1, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return id, nil
}
