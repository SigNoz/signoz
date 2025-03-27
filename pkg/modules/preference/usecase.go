package preference

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
)

type Usecase interface {
	GetOrgPreference(ctx context.Context, preferenceId string, orgId string) (*preferencetypes.GettablePreference, error)
	UpdateOrgPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, orgId string) error
	GetAllOrgPreferences(ctx context.Context, orgId string) ([]*preferencetypes.PreferenceWithValue, error)

	GetUserPreference(ctx context.Context, preferenceId string, orgId string, userId string) (*preferencetypes.GettablePreference, error)
	UpdateUserPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, userId string) error
	GetAllUserPreferences(ctx context.Context, orgId string, userId string) ([]*preferencetypes.PreferenceWithValue, error)
}
