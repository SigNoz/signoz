package sqlite

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/types"
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
		`INSERT INTO organizations (id, name, created_at,is_anonymous,has_opted_updates) VALUES (?, ?, ?, ?, ?);`,
		org.Id, org.Name, org.CreatedAt, org.IsAnonymous, org.HasOptedUpdates)

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
	telemetry.GetInstance().SetDistinctId(org.Id)

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
		user.ProfilePictureURL, user.GroupId, user.OrgId,
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
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER, data, user.Email, true, false)

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
				o.name as organization,
				COALESCE((select uf.flags
					from user_flags uf
					where u.id = uf.user_id), '') as flags
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

// GetUsers fetches total user count
func (mds *ModelDaoSqlite) GetUsers(ctx context.Context) ([]model.UserPayload, *model.ApiError) {
	return mds.GetUsersWithOpts(ctx, 0)
}

// GetUsersWithOpts fetches users and supports additional search options
func (mds *ModelDaoSqlite) GetUsersWithOpts(ctx context.Context, limit int) ([]model.UserPayload, *model.ApiError) {
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

	if limit > 0 {
		query = fmt.Sprintf("%s LIMIT %d", query, limit)
	}
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
	group *types.Group) (*types.Group, *model.ApiError) {

	group.ID = uuid.NewString()

	if _, err := mds.bundb.NewInsert().
		Model(group).
		Exec(ctx); err != nil {
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
	name string) (*types.Group, *model.ApiError) {

	groups := []types.Group{}
	err := mds.bundb.NewSelect().
		Model(&groups).
		Where("name = ?", name).
		Scan(ctx)
	if err != nil {
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

// CreateUserFlags inserts user specific flags
func (mds *ModelDaoSqlite) UpdateUserFlags(ctx context.Context, userId string, flags map[string]string) (model.UserFlag, *model.ApiError) {

	if len(flags) == 0 {
		// nothing to do as flags are empty. In this method, we only append the flags
		// but not set them to empty
		return flags, nil
	}

	// fetch existing flags
	userPayload, apiError := mds.GetUser(ctx, userId)
	if apiError != nil {
		return nil, apiError
	}

	for k, v := range userPayload.Flags {
		if _, ok := flags[k]; !ok {
			// insert only missing keys as we want to retain the
			// flags in the db that are not part of this request
			flags[k] = v
		}
	}

	// append existing flags with new ones

	// write the updated flags
	flagsBytes, err := json.Marshal(flags)
	if err != nil {
		return nil, model.InternalError(err)
	}

	if len(userPayload.Flags) == 0 {
		q := `INSERT INTO user_flags (user_id, flags) VALUES (?, ?);`

		if _, err := mds.db.ExecContext(ctx, q, userId, string(flagsBytes)); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
	} else {
		q := `UPDATE user_flags SET flags = ? WHERE user_id = ?;`

		if _, err := mds.db.ExecContext(ctx, q, userId, string(flagsBytes)); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
	}

	return flags, nil
}

func (mds *ModelDaoSqlite) PrecheckLogin(ctx context.Context, email, sourceUrl string) (*model.PrecheckResponse, model.BaseApiError) {
	// assume user is valid unless proven otherwise and assign default values for rest of the fields
	resp := &model.PrecheckResponse{IsUser: true, CanSelfRegister: false, SSO: false, SsoUrl: "", SsoError: ""}

	// check if email is a valid user
	userPayload, baseApiErr := mds.GetUserByEmail(ctx, email)
	if baseApiErr != nil {
		return resp, baseApiErr
	}

	if userPayload == nil {
		resp.IsUser = false
	}

	return resp, nil
}

func (mds *ModelDaoSqlite) GetUserRole(ctx context.Context, groupId string) (string, error) {
	role, err := mds.GetGroup(ctx, groupId)
	if err != nil || role == nil {
		return "", err
	}
	return role.Name, nil
}

func (mds *ModelDaoSqlite) GetUserCount(ctx context.Context) (int, error) {
	users, err := mds.GetUsers(ctx)
	if err != nil {
		return 0, err
	}
	return len(users), nil
}
