package preference

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types"
)

type Preference interface {
	GetOrgPreference(ctx context.Context, preferenceId string, orgId string) (*types.PreferenceKV, error)
	UpdateOrgPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, orgId string) (*types.PreferenceKV, error)
	GetAllOrgPreferences(ctx context.Context, orgId string) ([]*types.AllPreferences, error)

	GetUserPreference(ctx context.Context, preferenceId string, orgId string, userId string) (*types.PreferenceKV, error)
	UpdateUserPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, userId string) (*types.PreferenceKV, error)
	GetAllUserPreferences(ctx context.Context, orgId string, userId string) ([]*types.AllPreferences, error)
}
