package sqlite

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

func (mds *ModelDaoSqlite) CreateUser(ctx context.Context, user *model.User) (*model.User, *model.ApiError) {
	zap.S().Debug("Creating new user. Email: %s\n", user.Email)

	user.Id = uuid.NewString()
	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO users (id, name, org_name, email, password) VALUES (?, ?, ?, ?, ?);`,
		user.Id, user.Name, user.OrganizationName, user.Email, user.Password)

	if err != nil {
		zap.S().Errorf("Error while inserting new user to the DB\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return user, nil
}

func (mds *ModelDaoSqlite) EditUser(ctx context.Context, update *model.User) (*model.User, *model.ApiError) {
	zap.S().Debug("Updating user. Email: %s\n", update.Email)

	_, err := mds.db.ExecContext(ctx,
		`UPDATE users SET name=?,org_name=?,email=?,password=? WHERE id=?;`, update.Name,
		update.OrganizationName, update.Email, update.Password, update.Id)
	if err != nil {
		zap.S().Errorf("Error while updating user entry in the DB\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return update, nil
}

func (mds *ModelDaoSqlite) DeleteUser(ctx context.Context, id string) *model.ApiError {
	zap.S().Debug("Updating user. Id: %s\n", id)

	_, err := mds.db.ExecContext(ctx, `DELETE from users where id=?;`, id)
	if err != nil {
		zap.S().Errorf("Error while deleting user from the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetUser(ctx context.Context, id string) (*model.User, *model.ApiError) {
	users := []model.User{}
	err := mds.db.Select(&users, `SELECT * FROM users WHERE id=?;`, id)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(users) > 1 {
		zap.S().Debug("Error in processing sql query: ", fmt.Errorf("multiple user found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

func (mds *ModelDaoSqlite) GetUserByEmail(ctx context.Context, email string) (*model.User, *model.ApiError) {
	users := []model.User{}
	err := mds.db.Select(&users, `SELECT * FROM users WHERE email=?;`, email)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(users) > 1 {
		zap.S().Debug("Error in processing sql query: ", fmt.Errorf("multiple user found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

func (mds *ModelDaoSqlite) GetUsers(ctx context.Context) ([]model.User, *model.ApiError) {
	users := []model.User{}
	err := mds.db.Select(&users, "SELECT * FROM users")

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) CreateGroup(ctx context.Context, group *model.Group) (*model.Group, *model.ApiError) {

	group.Id = uuid.NewString()
	zap.S().Debug("Creating new group.  %+v\n", group)
	_, err := mds.db.ExecContext(ctx, `INSERT INTO groups (id, name) VALUES (?, ?);`,
		group.Id, group.Name)
	if err != nil {
		zap.S().Errorf("Error while creating a new group\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return group, nil
}

func (mds *ModelDaoSqlite) DeleteGroup(ctx context.Context, id string) *model.ApiError {
	zap.S().Debug("Deleting group Id: %s\n", id)

	_, err := mds.db.ExecContext(ctx, `DELETE from groups where id=?;`, id)
	if err != nil {
		zap.S().Errorf("Error while deleting group [id=%s] from the DB\n", id, err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetGroup(ctx context.Context, id string) (*model.Group, *model.ApiError) {

	groups := []model.Group{}
	err := mds.db.Select(&groups, `SELECT id, name FROM groups WHERE id=?`, id)

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

func (mds *ModelDaoSqlite) GetGroups(ctx context.Context) ([]model.Group, *model.ApiError) {

	groups := []model.Group{}
	err := mds.db.Select(&groups, "SELECT * FROM groups")

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return groups, nil
}

func (mds *ModelDaoSqlite) CreateRule(ctx context.Context, rule *model.RBACRule) (*model.RBACRule, *model.ApiError) {
	rule.Id = uuid.NewString()
	zap.S().Debug("Creating rule: %+v\n", rule)

	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO rbac_rules (id, api_class, permission) VALUES (?, ?, ?);`,
		rule.Id, rule.ApiClass, rule.Permission)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT rule, Err: %s\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return rule, nil
}

func (mds *ModelDaoSqlite) EditRule(ctx context.Context, update *model.RBACRule) (*model.RBACRule, *model.ApiError) {
	zap.S().Debug("Updating rule: %+v\n", update)

	_, err := mds.db.ExecContext(ctx, `UPDATE users SET api_class=?,permission=? WHERE id=?;`,
		update.ApiClass, update.Permission, update.Id)

	if err != nil {
		zap.S().Errorf("Error while updating rule [id=%s], Err: %s\n", update.Id, err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return update, nil
}

func (mds *ModelDaoSqlite) DeleteRule(ctx context.Context, id string) *model.ApiError {
	zap.S().Debug("Deleting rule [Id: %s]\n", id)

	_, err := mds.db.ExecContext(ctx, `DELETE from rbac_rules where id=?;`, id)
	if err != nil {
		zap.S().Errorf("Error while deleting rbac_rules [id=%s] from the DB\n", id, err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetRule(ctx context.Context, id string) (*model.RBACRule, *model.ApiError) {

	rules := []model.RBACRule{}
	err := mds.db.Select(&rules, "SELECT * FROM rbac_rules WHERE id=?", id)

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

func (mds *ModelDaoSqlite) GetRules(ctx context.Context, id int) ([]model.RBACRule, *model.ApiError) {

	rules := []model.RBACRule{}
	err := mds.db.Select(&rules, "SELECT * from rbac_rules")

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return rules, nil
}

func (mds *ModelDaoSqlite) AddRuleToGroup(ctx context.Context, gr *model.GroupRule) *model.ApiError {
	zap.S().Debugf("Adding rule to group: %+v\n", gr)

	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO group_rules (group_id,  rule_id) VALUES (?, ?);`, gr.GroupId, gr.RuleId)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT rule to group\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (mds *ModelDaoSqlite) GetGroupRules(ctx context.Context, id string) ([]model.GroupRule, *model.ApiError) {

	groupRules := []model.GroupRule{}
	err := mds.db.Select(&groupRules, "SELECT * FROM group_rules WHERE group_id=?", id)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return groupRules, nil
}

func (mds *ModelDaoSqlite) AddUserToGroup(ctx context.Context, gu *model.GroupUser) *model.ApiError {
	zap.S().Debugf("Adding user to group: %+v\n", gu)

	_, err := mds.db.ExecContext(ctx, `INSERT INTO group_users (group_id, user_id) VALUES (?, ?);`,
		gu.GroupId, gu.UserId)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT user to group\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (mds *ModelDaoSqlite) GetGroupUsers(ctx context.Context, id string) ([]model.GroupUser, *model.ApiError) {
	groupUsers := []model.GroupUser{}
	err := mds.db.Select(&groupUsers, `SELECT * FROM group_users WHERE id=?;`, id)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return groupUsers, nil
}
