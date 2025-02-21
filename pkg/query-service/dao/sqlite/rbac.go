package sqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/types"
)

func (mds *ModelDaoSqlite) CreateInviteEntry(ctx context.Context, req *types.Invite) *model.ApiError {
	_, err := mds.bundb.NewInsert().
		Model(req).
		Exec(ctx)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteInvitation(ctx context.Context, orgID string, email string) *model.ApiError {
	_, err := mds.bundb.NewDelete().
		Model(&types.Invite{}).
		Where("org_id = ?", orgID).
		Where("email = ?", email).
		Exec(ctx)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

// TODO: Make this work with org id
func (mds *ModelDaoSqlite) GetInviteFromEmail(ctx context.Context, email string,
) (*types.Invite, *model.ApiError) {

	invites := []types.Invite{}
	err := mds.bundb.NewSelect().
		Model(&invites).
		Where("email = ?", email).
		Scan(ctx)

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
) (*types.Invite, *model.ApiError) {
	// This won't take org id because it's a public facing API

	invites := []types.Invite{}
	err := mds.bundb.NewSelect().
		Model(&invites).
		Where("token = ?", token).
		Scan(ctx)

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

func (mds *ModelDaoSqlite) GetInvites(ctx context.Context, orgID string) ([]types.Invite, *model.ApiError) {
	invites := []types.Invite{}
	err := mds.bundb.NewSelect().
		Model(&invites).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return invites, nil
}

func (mds *ModelDaoSqlite) CreateOrg(ctx context.Context,
	org *types.Organization) (*types.Organization, *model.ApiError) {

	org.ID = uuid.NewString()
	org.CreatedAt = time.Now()
	_, err := mds.bundb.NewInsert().
		Model(org).
		Exec(ctx)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return org, nil
}

func (mds *ModelDaoSqlite) GetOrg(ctx context.Context,
	id string) (*types.Organization, *model.ApiError) {

	orgs := []types.Organization{}

	if err := mds.bundb.NewSelect().
		Model(&orgs).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	// TODO(nitya): remove for multitenancy
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
	name string) (*types.Organization, *model.ApiError) {

	orgs := []types.Organization{}

	if err := mds.bundb.NewSelect().
		Model(&orgs).
		Where("name = ?", name).
		Scan(ctx); err != nil {
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

func (mds *ModelDaoSqlite) GetOrgs(ctx context.Context) ([]types.Organization, *model.ApiError) {
	var orgs []types.Organization
	err := mds.bundb.NewSelect().
		Model(&orgs).
		Scan(ctx)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return orgs, nil
}

func (mds *ModelDaoSqlite) EditOrg(ctx context.Context, org *types.Organization) *model.ApiError {
	_, err := mds.bundb.NewUpdate().
		Model(org).
		Column("name").
		Column("has_opted_updates").
		Column("is_anonymous").
		Where("id = ?", org.ID).
		Exec(ctx)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	telemetry.GetInstance().SetTelemetryAnonymous(org.IsAnonymous)
	telemetry.GetInstance().SetDistinctId(org.ID)

	return nil
}

func (mds *ModelDaoSqlite) DeleteOrg(ctx context.Context, id string) *model.ApiError {
	_, err := mds.bundb.NewDelete().
		Model(&types.Organization{}).
		Where("id = ?", id).
		Exec(ctx)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) CreateUser(ctx context.Context,
	user *types.User, isFirstUser bool) (*types.User, *model.ApiError) {
	_, err := mds.bundb.NewInsert().
		Model(user).
		Exec(ctx)

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
	update *types.User) (*types.User, *model.ApiError) {
	_, err := mds.bundb.NewUpdate().
		Model(update).
		Column("name").
		Column("org_id").
		Column("email").
		Where("id = ?", update.ID).
		Exec(ctx)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return update, nil
}

func (mds *ModelDaoSqlite) UpdateUserPassword(ctx context.Context, passwordHash,
	userId string) *model.ApiError {

	_, err := mds.bundb.NewUpdate().
		Model(&types.User{}).
		Set("password = ?", passwordHash).
		Where("id = ?", userId).
		Exec(ctx)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) UpdateUserGroup(ctx context.Context, userId, groupId string) *model.ApiError {

	_, err := mds.bundb.NewUpdate().
		Model(&types.User{}).
		Set("group_id = ?", groupId).
		Where("id = ?", userId).
		Exec(ctx)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteUser(ctx context.Context, id string) *model.ApiError {
	result, err := mds.bundb.NewDelete().
		Model(&types.User{}).
		Where("id = ?", id).
		Exec(ctx)

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
	id string) (*types.GettableUser, *model.ApiError) {

	users := []types.GettableUser{}
	query := mds.bundb.NewSelect().
		Table("users").
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.group_id").
		ColumnExpr("g.name as role").
		ColumnExpr("o.name as organization").
		Join("JOIN groups g ON g.id = users.group_id").
		Join("JOIN organizations o ON o.id = users.org_id").
		Where("users.id = ?", id)

	if err := query.Scan(ctx, &users); err != nil {
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
	email string) (*types.GettableUser, *model.ApiError) {

	if email == "" {
		return nil, &model.ApiError{
			Typ: model.ErrorBadData,
			Err: fmt.Errorf("empty email address"),
		}
	}

	users := []types.GettableUser{}
	query := mds.bundb.NewSelect().
		Table("users").
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.group_id").
		ColumnExpr("g.name as role").
		ColumnExpr("o.name as organization").
		Join("JOIN groups g ON g.id = users.group_id").
		Join("JOIN organizations o ON o.id = users.org_id").
		Where("users.email = ?", email)

	if err := query.Scan(ctx, &users); err != nil {
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
func (mds *ModelDaoSqlite) GetUsers(ctx context.Context) ([]types.GettableUser, *model.ApiError) {
	return mds.GetUsersWithOpts(ctx, 0)
}

// GetUsersWithOpts fetches users and supports additional search options
func (mds *ModelDaoSqlite) GetUsersWithOpts(ctx context.Context, limit int) ([]types.GettableUser, *model.ApiError) {
	users := []types.GettableUser{}

	query := mds.bundb.NewSelect().
		Table("users").
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.group_id").
		ColumnExpr("g.name as role").
		ColumnExpr("o.name as organization").
		Join("JOIN groups g ON g.id = users.group_id").
		Join("JOIN organizations o ON o.id = users.org_id")

	if limit > 0 {
		query.Limit(limit)
	}
	err := query.Scan(ctx, &users)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) GetUsersByOrg(ctx context.Context,
	orgId string) ([]types.GettableUser, *model.ApiError) {

	users := []types.GettableUser{}

	query := mds.bundb.NewSelect().
		Table("users").
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.group_id").
		ColumnExpr("g.name as role").
		ColumnExpr("o.name as organization").
		Join("JOIN groups g ON g.id = users.group_id").
		Join("JOIN organizations o ON o.id = users.org_id").
		Where("users.org_id = ?", orgId)

	err := query.Scan(ctx, &users)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) GetUsersByGroup(ctx context.Context,
	groupId string) ([]types.GettableUser, *model.ApiError) {

	users := []types.GettableUser{}

	query := mds.bundb.NewSelect().
		Table("users").
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.group_id").
		ColumnExpr("g.name as role").
		ColumnExpr("o.name as organization").
		Join("JOIN groups g ON g.id = users.group_id").
		Join("JOIN organizations o ON o.id = users.org_id").
		Where("users.group_id = ?", groupId)

	err := query.Scan(ctx, &users)
	if err != nil {
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

	_, err := mds.bundb.NewDelete().
		Model(&types.Group{}).
		Where("id = ?", id).
		Exec(ctx)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetGroup(ctx context.Context,
	id string) (*types.Group, *model.ApiError) {

	groups := []types.Group{}
	if err := mds.bundb.NewSelect().
		Model(&groups).
		Where("id = ?", id).
		Scan(ctx); err != nil {
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

// TODO(nitya): should have org id
func (mds *ModelDaoSqlite) GetGroups(ctx context.Context) ([]types.Group, *model.ApiError) {

	groups := []types.Group{}
	if err := mds.bundb.NewSelect().
		Model(&groups).
		Scan(ctx); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return groups, nil
}

func (mds *ModelDaoSqlite) CreateResetPasswordEntry(ctx context.Context,
	req *types.ResetPasswordRequest) *model.ApiError {

	if _, err := mds.bundb.NewInsert().
		Model(req).
		Exec(ctx); err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteResetPasswordEntry(ctx context.Context,
	token string) *model.ApiError {
	_, err := mds.bundb.NewDelete().
		Model(&types.ResetPasswordRequest{}).
		Where("token = ?", token).
		Exec(ctx)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetResetPasswordEntry(ctx context.Context,
	token string) (*types.ResetPasswordRequest, *model.ApiError) {

	entries := []types.ResetPasswordRequest{}

	if err := mds.bundb.NewSelect().
		Model(&entries).
		Where("token = ?", token).
		Scan(ctx); err != nil {
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
