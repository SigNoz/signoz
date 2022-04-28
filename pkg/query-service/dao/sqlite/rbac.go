package sqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/telemetry"
	"go.uber.org/zap"
)

func (mds *ModelDaoSqlite) CreateInviteEntry(ctx context.Context, req *model.InvitationObject) *model.ApiError {
	zap.S().Debugf("Creating new invite entry. Red: %+v\n", req)

	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO invites (email, name, token, role, created_at, org_id) VALUES (?, ?, ?, ?, ?, ?);`,
		req.Email, req.Name, req.Token, req.Role, req.CreatedAt, req.OrgId)
	if err != nil {
		zap.S().Errorf("Error while inserting new invitation to the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteInvitation(ctx context.Context, email string) *model.ApiError {
	_, err := mds.db.ExecContext(ctx, `DELETE from invites where email=?;`, email)
	if err != nil {
		zap.S().Errorf("Error while deleting invite from the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetInviteFromEmail(ctx context.Context, email string) (*model.InvitationObject, *model.ApiError) {
	invites := []model.InvitationObject{}
	err := mds.db.Select(&invites, `SELECT email,name,token,created_at,role,org_id FROM invites WHERE email=?;`, email)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(invites) > 1 {
		zap.S().Debugf("Error in processing sql query: %v", fmt.Errorf("multiple invites found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(invites) == 0 {
		return nil, nil
	}
	return &invites[0], nil
}

func (mds *ModelDaoSqlite) GetInviteFromToken(ctx context.Context, token string) (*model.InvitationObject, *model.ApiError) {
	invites := []model.InvitationObject{}
	err := mds.db.Select(&invites, `SELECT email,name,token,created_at,role,org_id FROM invites WHERE token=?;`, token)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(invites) > 1 {
		zap.S().Debugf("Error in processing sql query: %v", fmt.Errorf("multiple invites found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(invites) == 0 {
		return nil, nil
	}
	return &invites[0], nil
}

func (mds *ModelDaoSqlite) GetInvites(ctx context.Context) ([]model.InvitationObject, *model.ApiError) {
	invites := []model.InvitationObject{}
	err := mds.db.Select(&invites, "SELECT name,email,token,created_at,role,org_id  FROM invites")

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return invites, nil
}

func (mds *ModelDaoSqlite) CreateOrg(ctx context.Context, org *model.Organization) (*model.Organization, *model.ApiError) {
	zap.S().Debugf("Creating new organization. Name: %s\n", org.Name)

	org.Id = uuid.NewString()
	org.CreatedAt = time.Now().Unix()
	_, err := mds.db.ExecContext(ctx, `INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?);`,
		org.Id, org.Name, org.CreatedAt)

	if err != nil {
		zap.S().Errorf("Error while inserting org entry to the DB\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return org, nil
}

func (mds *ModelDaoSqlite) GetOrg(ctx context.Context, id string) (*model.Organization, *model.ApiError) {
	orgs := []model.Organization{}
	err := mds.db.Select(&orgs, `SELECT * FROM organizations WHERE id=?;`, id)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(orgs) > 1 {
		zap.S().Debugf("Error in processing sql query: %v", fmt.Errorf("multiple organizations found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(orgs) == 0 {
		return nil, nil
	}
	return &orgs[0], nil
}

func (mds *ModelDaoSqlite) GetOrgByName(ctx context.Context, name string) (*model.Organization, *model.ApiError) {
	orgs := []model.Organization{}
	err := mds.db.Select(&orgs, `SELECT * FROM organizations WHERE name=?;`, name)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(orgs) > 1 {
		zap.S().Debugf("Error in processing sql query: %v", fmt.Errorf("multiple organizations found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(orgs) == 0 {
		return nil, nil
	}
	return &orgs[0], nil
}

func (mds *ModelDaoSqlite) GetOrgs(ctx context.Context) ([]model.Organization, *model.ApiError) {
	orgs := []model.Organization{}
	err := mds.db.Select(&orgs, `SELECT * FROM organizations`)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return orgs, nil
}

func (mds *ModelDaoSqlite) EditOrg(ctx context.Context, update *model.Organization) *model.ApiError {
	zap.S().Debugf("Updating org [id=%s]: %s\n", update.Id)

	_, err := mds.db.ExecContext(ctx,
		`UPDATE organizations SET name=?,has_opted_updates=?,is_anonymous=? WHERE id=?;`,
		update.Name, update.HasOptedUpdates, update.IsAnonymous, update.Id)
	if err != nil {
		zap.S().Errorf("Error while updating user entry in the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	telemetry.GetInstance().SetTelemetryAnonymous(update.IsAnonymous)
	return nil
}

func (mds *ModelDaoSqlite) DeleteOrg(ctx context.Context, id string) *model.ApiError {
	zap.S().Debugf("Deleting org [id=%s]: %s\n", id)

	_, err := mds.db.ExecContext(ctx, `DELETE from organizations where id=?;`, id)
	if err != nil {
		zap.S().Errorf("Error while deleting org from the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) CreateUser(ctx context.Context, user *model.User) (*model.User, *model.ApiError) {
	zap.S().Debugf("Creating new user. Email: %s\n", user.Email)

	user.Id = uuid.NewString()
	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO users (id, name, org_id, email, password, created_at, profile_picture_url)
		 VALUES (?, ?, ?, ?, ?, ?, ?);`,
		user.Id, user.Name, user.OrgId, user.Email, user.Password, user.CreatedAt,
		user.ProfilePirctureURL,
	)

	if err != nil {
		zap.S().Errorf("Error while inserting new user to the DB\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return user, nil
}

func (mds *ModelDaoSqlite) CreateUserWithRole(ctx context.Context, user *model.User,
	role string) (*model.User, *model.ApiError) {
	zap.S().Debugf("Creating new user with role. Email: %s, Role: %s\n", user.Email, role)

	group, apiErr := mds.GetGroupByName(ctx, role)
	if apiErr != nil {
		zap.S().Debugf("Failed to get group by name. Err: %v.", apiErr.Err)
		return nil, apiErr
	}

	if group == nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal,
			Err: errors.Errorf("Group not found for the specified role: %v", role)}
	}

	// 1. Create the user entry in the users table
	// 2. Assign the user to the group.
	// A transaction is required because otherwise it is possible that assinging the user to a group
	// fails and we still end up adding the entry for the user in the users table.
	tx, err := mds.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	user.Id = uuid.NewString()
	_, err = tx.ExecContext(ctx,
		`INSERT INTO users (id, name, org_id, email, password, created_at, profile_picture_url)
		 VALUES (?, ?, ?, ?, ?, ?, ?);`,
		user.Id, user.Name, user.OrgId, user.Email, user.Password, user.CreatedAt,
		user.ProfilePirctureURL,
	)
	if err != nil {
		zap.S().Debugf("Failed to insert user. Err: %v. Rolling back", err)
		tx.Rollback()
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	_, err = tx.ExecContext(ctx, `INSERT INTO group_users (group_id, user_id) VALUES (?, ?);`,
		group.Id, user.Id)
	if err != nil {
		zap.S().Debugf("Failed to insert user to group. Err: %v. Rolling back", err)
		tx.Rollback()
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if err := tx.Commit(); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return user, nil
}

func (mds *ModelDaoSqlite) EditUser(ctx context.Context, update *model.User) (*model.User, *model.ApiError) {
	zap.S().Debugf("Updating user. Email: %s\n", update.Email)

	_, err := mds.db.ExecContext(ctx,
		`UPDATE users SET name=?,org_id=?,email=? WHERE id=?;`, update.Name,
		update.OrgId, update.Email, update.Id)
	if err != nil {
		zap.S().Errorf("Error while updating user entry in the DB\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return update, nil
}

func (mds *ModelDaoSqlite) UpdateUserPassword(ctx context.Context, passwordHash, userId string) *model.ApiError {
	zap.S().Debugf("Updating user password. [Id=%s]\n", userId)

	_, err := mds.db.ExecContext(ctx,
		`UPDATE users SET password=? WHERE id=?;`, passwordHash, userId)
	if err != nil {
		zap.S().Errorf("Error while updating user's password entry in the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteUser(ctx context.Context, id string) *model.ApiError {
	zap.S().Debugf("Deleting user. Id: %s\n", id)

	result, err := mds.db.ExecContext(ctx, `DELETE from users where id=?;`, id)
	if err != nil {
		zap.S().Errorf("Error while deleting user from the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	if affectedRows == 0 {
		return &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no user found with id: %s", id)}
	}

	return nil
}

func (mds *ModelDaoSqlite) GetUser(ctx context.Context, id string) (*model.UserResponse, *model.ApiError) {
	users := []model.UserResponse{}

	query := `select
				u.id,
				u.name,
				u.org_id,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				g.name as role,
				o.name as organization
			from users u, groups g, group_users gu, organizations o
			where
				u.id=gu.user_id and
				g.id=gu.group_id and
				o.id = u.org_id and
				u.id=?;`

	err := mds.db.Select(&users, query, id)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(users) > 1 {
		zap.S().Debugf("Error in processing sql query: %v", fmt.Errorf("multiple user found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

func (mds *ModelDaoSqlite) GetUserByEmail(ctx context.Context, email string) (*model.UserResponse, *model.ApiError) {
	users := []model.UserResponse{}
	query := `select
				u.id,
				u.name,
				u.org_id,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				g.name as role,
				o.name as organization
			from users u, groups g, group_users gu, organizations o
			where
				u.id=gu.user_id and
				g.id=gu.group_id and
				o.id = u.org_id and
				u.email=?;`
	err := mds.db.Select(&users, query, email)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(users) > 1 {
		zap.S().Debugf("Error in processing sql query: %v", fmt.Errorf("multiple user found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

func (mds *ModelDaoSqlite) GetUsers(ctx context.Context) ([]model.UserResponse, *model.ApiError) {
	users := []model.UserResponse{}

	query := `select
				u.id,
				u.name,
				u.org_id,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				g.name as role,
				o.name as organization
			from users u, groups g, group_users gu, organizations o
			where
				u.id=gu.user_id and
				g.id=gu.group_id and
				o.id = u.org_id`

	err := mds.db.Select(&users, query)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) GetUsersByOrg(ctx context.Context, orgId string) ([]model.UserResponse, *model.ApiError) {
	users := []model.UserResponse{}

	query := `select
				u.id,
				u.name,
				u.org_id,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				g.name as role,
				o.name as organization
			from users u, groups g, group_users gu, organizations o
			where
				u.id=gu.user_id and
				g.id=gu.group_id and
				o.id = u.org_id and
				u.org_id=?;`
	err := mds.db.Select(&users, query, orgId)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) CreateGroup(ctx context.Context, group *model.Group) (*model.Group, *model.ApiError) {

	group.Id = uuid.NewString()
	zap.S().Debugf("Creating new group.  %+v\n", group)
	_, err := mds.db.ExecContext(ctx, `INSERT INTO groups (id, name) VALUES (?, ?);`,
		group.Id, group.Name)
	if err != nil {
		zap.S().Errorf("Error while creating a new group, Err: %v\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return group, nil
}

func (mds *ModelDaoSqlite) DeleteGroup(ctx context.Context, id string) *model.ApiError {
	zap.S().Debugf("Deleting group Id: %s\n", id)

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
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(groups) > 1 {
		zap.S().Debugf("Error in processing sql query: %v", fmt.Errorf("more than 1 row in groups found"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(groups) == 0 {
		return nil, nil
	}

	return &groups[0], nil
}

func (mds *ModelDaoSqlite) GetGroupByName(ctx context.Context, name string) (*model.Group, *model.ApiError) {

	groups := []model.Group{}
	err := mds.db.Select(&groups, `SELECT id, name FROM groups WHERE name=?`, name)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(groups) > 1 {
		zap.S().Debugf("Error in processing sql query, more than 1 row in groups found")
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
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return groups, nil
}

func (mds *ModelDaoSqlite) CreateRule(ctx context.Context, rule *model.RBACRule) (*model.RBACRule, *model.ApiError) {
	rule.Id = uuid.NewString()
	zap.S().Debugf("Creating rule: %+v\n", rule)

	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO rbac_rules (id, api_class, permission) VALUES (?, ?, ?);`,
		rule.Id, rule.ApiClass, rule.Permission)
	if err != nil {
		zap.S().Errorf("Error while creating rule, Err: %s\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return rule, nil
}

func (mds *ModelDaoSqlite) EditRule(ctx context.Context, update *model.RBACRule) (*model.RBACRule, *model.ApiError) {
	zap.S().Debugf("Updating rule: %+v\n", update)

	_, err := mds.db.ExecContext(ctx, `UPDATE rbac_rules SET api_class=?,permission=? WHERE id=?;`,
		update.ApiClass, update.Permission, update.Id)

	if err != nil {
		zap.S().Errorf("Error while updating rule [id=%s], Err: %s\n", update.Id, err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return update, nil
}

func (mds *ModelDaoSqlite) DeleteRule(ctx context.Context, id string) *model.ApiError {
	zap.S().Debugf("Deleting rule [Id: %s]\n", id)

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
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(rules) > 1 {
		zap.S().Debugf("Error in processing sql query: more than 1 row in rules found")
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(rules) == 0 {
		return nil, nil
	}

	return &rules[0], nil
}

func (mds *ModelDaoSqlite) GetRules(ctx context.Context) ([]model.RBACRule, *model.ApiError) {

	rules := []model.RBACRule{}
	err := mds.db.Select(&rules, "SELECT * from rbac_rules")

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
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

func (mds *ModelDaoSqlite) DeleteRuleFromGroup(ctx context.Context, gr *model.GroupRule) *model.ApiError {
	zap.S().Debugf("Deleting user from group: %+v\n", gr)

	_, err := mds.db.ExecContext(ctx,
		`DELETE from group_rules WHERE (group_id,  rule_id) = (?, ?);`, gr.GroupId, gr.RuleId)
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
		zap.S().Debugf("Error in processing sql query: %v", err)
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

func (mds *ModelDaoSqlite) UpdateUserGroup(ctx context.Context, gu *model.GroupUser) *model.ApiError {
	zap.S().Debugf("Updating user's group: %+v\n", gu)

	_, err := mds.db.ExecContext(ctx, `UPDATE group_users SET group_id=? WHERE user_id=?;`,
		gu.GroupId, gu.UserId)
	if err != nil {
		zap.S().Errorf("Error while updating user group\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (mds *ModelDaoSqlite) GetUserGroup(ctx context.Context, id string) (*model.GroupUser, *model.ApiError) {
	groupUsers := []model.GroupUser{}
	err := mds.db.Select(&groupUsers, `SELECT user_id,group_id FROM group_users WHERE user_id=?;`, id)
	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(groupUsers) > 1 {
		zap.S().Debugf("Error in processing sql query: more than 1 row in rules found")
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(groupUsers) == 0 {
		return nil, nil
	}

	return &groupUsers[0], nil
}

func (mds *ModelDaoSqlite) DeleteUserFromGroup(ctx context.Context, gu *model.GroupUser) *model.ApiError {
	zap.S().Debugf("Deleting user from group: %+v\n", gu)

	_, err := mds.db.ExecContext(ctx, `DELETE FROM group_users WHERE (group_id, user_id) = (?, ?);`,
		gu.GroupId, gu.UserId)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT user to group\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (mds *ModelDaoSqlite) GetGroupUsers(ctx context.Context, id string) ([]model.GroupUser, *model.ApiError) {
	groupUsers := []model.GroupUser{}
	err := mds.db.Select(&groupUsers, `SELECT * FROM group_users WHERE group_id=?;`, id)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return groupUsers, nil
}

func (mds *ModelDaoSqlite) CreateResetPasswordEntry(ctx context.Context, req *model.ResetPasswordEntry) *model.ApiError {
	zap.S().Debugf("Creating reset password entry. %+v\n", req)

	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO reset_password_request (user_id, token) VALUES (?, ?);`, req.UserId, req.Token)
	if err != nil {
		zap.S().Errorf("Error while inserting new reset password entry to the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteResetPasswordEntry(ctx context.Context, token string) *model.ApiError {
	_, err := mds.db.ExecContext(ctx, `DELETE from reset_password_request where token=?;`, token)
	if err != nil {
		zap.S().Errorf("Error while deleting reset password entry from the DB\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetResetPasswordEntry(ctx context.Context, token string) (*model.ResetPasswordEntry, *model.ApiError) {
	entries := []model.ResetPasswordEntry{}
	err := mds.db.Select(&entries, `SELECT user_id,token FROM reset_password_request WHERE token=?;`, token)

	if err != nil {
		zap.S().Debugf("Error in processing sql query: %v", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(entries) > 1 {
		zap.S().Debugf("Error in processing sql query: %v", fmt.Errorf("multiple entries found with same id"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(entries) == 0 {
		return nil, nil
	}
	return &entries[0], nil
}
