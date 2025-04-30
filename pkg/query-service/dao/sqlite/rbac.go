package sqlite

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
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

func (mds *ModelDaoSqlite) UpdateUserRole(ctx context.Context, userId string, role types.Role) *model.ApiError {

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
