package sqlite

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/pkg/errors"
)

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
