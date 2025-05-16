package dao

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
)

type ModelDao interface {
	Queries
	Mutations
}

type Queries interface {
	GetApdexSettings(ctx context.Context, orgID string, services []string) ([]types.ApdexSettings, *model.ApiError)
}

type Mutations interface {
	UpdateUserRole(ctx context.Context, userId string, role types.Role) *model.ApiError
	SetApdexSettings(ctx context.Context, orgID string, set *types.ApdexSettings) *model.ApiError
}
