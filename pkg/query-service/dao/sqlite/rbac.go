package sqlite

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/pkg/errors"
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

func (mds *ModelDaoSqlite) UpdateUserRole(ctx context.Context, userId string, role authtypes.Role) *model.ApiError {

	_, err := mds.bundb.NewUpdate().
		Model(&types.User{}).
		Set("role = ?", role).
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
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.role").
		ColumnExpr("o.name as organization").
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
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.role").
		ColumnExpr("o.name as organization").
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
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.role").
		ColumnExpr("users.role as role").
		ColumnExpr("o.name as organization").
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
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.role").
		ColumnExpr("users.role as role").
		ColumnExpr("o.name as organization").
		Join("JOIN organizations o ON o.id = users.org_id").
		Where("users.org_id = ?", orgId)

	err := query.Scan(ctx, &users)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) GetUsersByRole(ctx context.Context, role authtypes.Role) ([]types.GettableUser, *model.ApiError) {
	users := []types.GettableUser{}

	query := mds.bundb.NewSelect().
		Table("users").
		Column("users.id", "users.name", "users.email", "users.password", "users.created_at", "users.profile_picture_url", "users.org_id", "users.role").
		ColumnExpr("users.role as role").
		ColumnExpr("o.name as organization").
		Join("JOIN organizations o ON o.id = users.org_id").
		Where("users.role = ?", role)

	err := query.Scan(ctx, &users)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return users, nil
}

func (mds *ModelDaoSqlite) CreateResetPasswordEntry(ctx context.Context, req *types.ResetPasswordRequest) *model.ApiError {

	if _, err := mds.bundb.NewInsert().
		Model(req).
		Exec(ctx); err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) DeleteResetPasswordEntry(ctx context.Context, token string) *model.ApiError {
	_, err := mds.bundb.NewDelete().
		Model(&types.ResetPasswordRequest{}).
		Where("token = ?", token).
		Exec(ctx)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetResetPasswordEntry(ctx context.Context, token string) (*types.ResetPasswordRequest, *model.ApiError) {

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

func (mds *ModelDaoSqlite) GetUserCount(ctx context.Context) (int, error) {
	users, err := mds.GetUsers(ctx)
	if err != nil {
		return 0, err
	}
	return len(users), nil
}
