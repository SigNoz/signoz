package preference

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
)

type Preference interface {
	GetOrgPreference(ctx context.Context, preferenceId string, orgId string) (*types.PreferenceKV, *model.ApiError)
	UpdateOrgPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, orgId string) (*types.PreferenceKV, *model.ApiError)
	GetAllOrgPreferences(ctx context.Context, orgId string) ([]*types.AllPreferences, *model.ApiError)

	GetUserPreference(ctx context.Context, preferenceId string, orgId string, userId string) (*types.PreferenceKV, *model.ApiError)
	UpdateUserPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, userId string) (*types.PreferenceKV, *model.ApiError)
	GetAllUserPreferences(ctx context.Context, orgId string, userId string) ([]*types.AllPreferences, *model.ApiError)
}
