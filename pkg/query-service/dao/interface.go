package dao

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type ModelDao interface {
	Queries
	Mutations
}

type Queries interface {
	GetResetPasswordEntry(ctx context.Context, token string) (*types.ResetPasswordRequest, *model.ApiError)
	GetApdexSettings(ctx context.Context, orgID string, services []string) ([]types.ApdexSettings, *model.ApiError)
	PrecheckLogin(ctx context.Context, email, sourceUrl string) (*model.PrecheckResponse, model.BaseApiError)
}

type Mutations interface {
	CreateResetPasswordEntry(ctx context.Context, req *types.ResetPasswordRequest) *model.ApiError
	DeleteResetPasswordEntry(ctx context.Context, token string) *model.ApiError

	UpdateUserPassword(ctx context.Context, hash, userId string) *model.ApiError
	UpdateUserRole(ctx context.Context, userId string, role authtypes.Role) *model.ApiError

	SetApdexSettings(ctx context.Context, orgID string, set *types.ApdexSettings) *model.ApiError
}
