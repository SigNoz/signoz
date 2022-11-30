package sqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
)

func (mds *ModelDaoSqlite) CreateInviteEntry(ctx context.Context,
	req *model.InvitationObject) *model.ApiError {

	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO invites (email, name, token, role, created_at, org_id)
		VALUES (?, ?, ?, ?, ?, ?);`,
		req.Email, req.Name, req.Token, req.Role, req.CreatedAt, req.OrgId)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteInvitation(ctx context.Context, email string) *model.ApiError {
	_, err := mds.db.ExecContext(ctx, `DELETE from invites where email=?;`, email)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetInviteFromEmail(ctx context.Context, email string,
) (*model.InvitationObject, *model.ApiError) {

	invites := []model.InvitationObject{}
	err := mds.db.Select(&invites,
		`SELECT * FROM invites WHERE email=?;`, email)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(invites) > 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.Errorf("Found multiple invites for the email: %s", email)}
	}

	if len(invites) == 0 {
		return nil, nil
	}
	return &invites[0], nil
}

func (mds *ModelDaoSqlite) GetInviteFromToken(ctx context.Context, token string,
) (*model.InvitationObject, *model.ApiError) {

	invites := []model.InvitationObject{}
	err := mds.db.Select(&invites,
		`SELECT * FROM invites WHERE token=?;`, token)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(invites) > 1 {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(invites) == 0 {
		return nil, nil
	}
	return &invites[0], nil
}

func (mds *ModelDaoSqlite) GetInvites(ctx context.Context,
) ([]model.InvitationObject, *model.ApiError) {

	invites := []model.InvitationObject{}
	err := mds.db.Select(&invites, "SELECT * FROM invites")
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return invites, nil
}

func (mds *ModelDaoSqlite) CreateOrg(ctx context.Context,
	org *model.Organization) (*model.Organization, *model.ApiError) {

	org.Id = uuid.NewString()
	org.CreatedAt = time.Now().Unix()
	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?);`,
		org.Id, org.Name, org.CreatedAt)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return org, nil
}

func (mds *ModelDaoSqlite) GetOrg(ctx context.Context,
	id string) (*model.Organization, *model.ApiError) {

	orgs := []model.Organization{}
	err := mds.db.Select(&orgs, `SELECT * FROM organizations WHERE id=?;`, id)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(orgs) > 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("Found multiple org with same ID"),
		}
	}

	if len(orgs) == 0 {
		return nil, nil
	}
	return &orgs[0], nil
}

func (mds *ModelDaoSqlite) GetOrgByName(ctx context.Context,
	name string) (*model.Organization, *model.ApiError) {

	orgs := []model.Organization{}

	if err := mds.db.Select(&orgs, `SELECT * FROM organizations WHERE name=?;`, name); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(orgs) > 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("Multiple orgs with same ID found"),
		}
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
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return orgs, nil
}

func (mds *ModelDaoSqlite) EditOrg(ctx context.Context, org *model.Organization) *model.ApiError {

	q := `UPDATE organizations SET name=?,has_opted_updates=?,is_anonymous=? WHERE id=?;`

	_, err := mds.db.ExecContext(ctx, q, org.Name, org.HasOptedUpdates, org.IsAnonymous, org.Id)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	telemetry.GetInstance().SetTelemetryAnonymous(org.IsAnonymous)
	return nil
}

func (mds *ModelDaoSqlite) DeleteOrg(ctx context.Context, id string) *model.ApiError {

	_, err := mds.db.ExecContext(ctx, `DELETE from organizations where id=?;`, id)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) CreateUser(ctx context.Context,
	user *model.User, isFirstUser bool) (*model.User, *model.ApiError) {

	_, err := mds.db.ExecContext(ctx,
		`INSERT INTO users (id, name, email, password, created_at, profile_picture_url, group_id, org_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?,?);`,
		user.Id, user.Name, user.Email, user.Password, user.CreatedAt,
		user.ProfilePirctureURL, user.GroupId, user.OrgId,
	)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	data := map[string]interface{}{
		"name":              user.Name,
		"email":             user.Email,
		"firstRegistration": false,
	}

	if isFirstUser {
		data["firstRegistration"] = true
	}

	telemetry.GetInstance().IdentifyUser(user)
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER, data)

	return user, nil
}

func (mds *ModelDaoSqlite) EditUser(ctx context.Context,
	update *model.User) (*model.User, *model.ApiError) {

	_, err := mds.db.ExecContext(ctx,
		`UPDATE users SET name=?,org_id=?,email=? WHERE id=?;`, update.Name,
		update.OrgId, update.Email, update.Id)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return update, nil
}

func (mds *ModelDaoSqlite) UpdateUserPassword(ctx context.Context, passwordHash,
	userId string) *model.ApiError {

	q := `UPDATE users SET password=? WHERE id=?;`
	if _, err := mds.db.ExecContext(ctx, q, passwordHash, userId); err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) UpdateUserGroup(ctx context.Context, userId, groupId string) *model.ApiError {

	q := `UPDATE users SET group_id=? WHERE id=?;`
	if _, err := mds.db.ExecContext(ctx, q, groupId, userId); err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteUser(ctx context.Context, id string) *model.ApiError {

	result, err := mds.db.ExecContext(ctx, `DELETE from users where id=?;`, id)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	if affectedRows == 0 {
		return &model.ApiError{
			Typ: model.ErrorNotFound,
			Err: fmt.Errorf("no user found with id: %s", id),
		}
	}

	return nil
}

func (mds *ModelDaoSqlite) GetUser(ctx context.Context,
	id string) (*model.UserPayload, *model.ApiError) {

	users := []model.UserPayload{}
	query := `select
				u.id,
				u.name,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				u.org_id,
				u.group_id,
				g.name as role,
				o.name as organization
			from users u, groups g, organizations o
			where
				g.id=u.group_id and
				o.id = u.org_id and
				u.id=?;`

	if err := mds.db.Select(&users, query, id); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(users) > 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("Found multiple users with same ID"),
		}
	}

	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

func (mds *ModelDaoSqlite) GetUserByEmail(ctx context.Context,
	email string) (*model.UserPayload, *model.ApiError) {

	if email == "" {
		return nil, &model.ApiError{
			Typ: model.ErrorBadData,
			Err: fmt.Errorf("empty email address"),
		}
	}

	users := []model.UserPayload{}
	query := `select
				u.id,
				u.name,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				u.org_id,
				u.group_id,
				g.name as role,
				o.name as organization
			from users u, groups g, organizations o
			where
				g.id=u.group_id and
				o.id = u.org_id and
				u.email=?;`

	if err := mds.db.Select(&users, query, email); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(users) > 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("Found multiple users with same ID."),
		}
	}

	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

func (mds *ModelDaoSqlite) GetUsers(ctx context.Context) ([]model.UserPayload, *model.ApiError) {
	users := []model.UserPayload{}

	query := `select
				u.id,
				u.name,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				u.org_id,
				u.group_id,
				g.name as role,
				o.name as organization
			from users u, groups g, organizations o
			where
				g.id = u.group_id and
				o.id = u.org_id`

	err := mds.db.Select(&users, query)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) GetUsersByOrg(ctx context.Context,
	orgId string) ([]model.UserPayload, *model.ApiError) {

	users := []model.UserPayload{}
	query := `select
				u.id,
				u.name,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				u.org_id,
				u.group_id,
				g.name as role,
				o.name as organization
			from users u, groups g, organizations o
			where
				u.group_id = g.id and
				u.org_id = o.id and
				u.org_id=?;`

	if err := mds.db.Select(&users, query, orgId); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) GetUsersByGroup(ctx context.Context,
	groupId string) ([]model.UserPayload, *model.ApiError) {

	users := []model.UserPayload{}
	query := `select
				u.id,
				u.name,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				u.org_id,
				u.group_id,
				g.name as role,
				o.name as organization
			from users u, groups g, organizations o
			where
				u.group_id = g.id and
				o.id = u.org_id and
				u.group_id=?;`

	if err := mds.db.Select(&users, query, groupId); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) CreateGroup(ctx context.Context,
	group *model.Group) (*model.Group, *model.ApiError) {

	group.Id = uuid.NewString()

	q := `INSERT INTO groups (id, name) VALUES (?, ?);`
	if _, err := mds.db.ExecContext(ctx, q, group.Id, group.Name); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return group, nil
}

func (mds *ModelDaoSqlite) DeleteGroup(ctx context.Context, id string) *model.ApiError {

	if _, err := mds.db.ExecContext(ctx, `DELETE from groups where id=?;`, id); err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetGroup(ctx context.Context,
	id string) (*model.Group, *model.ApiError) {

	groups := []model.Group{}
	if err := mds.db.Select(&groups, `SELECT id, name FROM groups WHERE id=?`, id); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(groups) > 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("Found multiple groups with same ID."),
		}
	}

	if len(groups) == 0 {
		return nil, nil
	}
	return &groups[0], nil
}

func (mds *ModelDaoSqlite) GetGroupByName(ctx context.Context,
	name string) (*model.Group, *model.ApiError) {

	groups := []model.Group{}
	if err := mds.db.Select(&groups, `SELECT id, name FROM groups WHERE name=?`, name); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(groups) > 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: errors.New("Found multiple groups with same name"),
		}
	}

	if len(groups) == 0 {
		return nil, nil
	}

	return &groups[0], nil
}

func (mds *ModelDaoSqlite) GetGroups(ctx context.Context) ([]model.Group, *model.ApiError) {

	groups := []model.Group{}
	if err := mds.db.Select(&groups, "SELECT * FROM groups"); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return groups, nil
}

func (mds *ModelDaoSqlite) CreateResetPasswordEntry(ctx context.Context,
	req *model.ResetPasswordEntry) *model.ApiError {

	q := `INSERT INTO reset_password_request (user_id, token) VALUES (?, ?);`
	if _, err := mds.db.ExecContext(ctx, q, req.UserId, req.Token); err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteResetPasswordEntry(ctx context.Context,
	token string) *model.ApiError {
	_, err := mds.db.ExecContext(ctx, `DELETE from reset_password_request where token=?;`, token)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetResetPasswordEntry(ctx context.Context,
	token string) (*model.ResetPasswordEntry, *model.ApiError) {

	entries := []model.ResetPasswordEntry{}

	q := `SELECT user_id,token FROM reset_password_request WHERE token=?;`
	if err := mds.db.Select(&entries, q, token); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if len(entries) > 1 {
		return nil, &model.ApiError{Typ: model.ErrorInternal,
			Err: errors.New("Multiple entries for reset token is found")}
	}

	if len(entries) == 0 {
		return nil, nil
	}
	return &entries[0], nil
}
