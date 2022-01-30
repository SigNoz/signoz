package interfaces

import (
	"context"

	"go.signoz.io/query-service/model"
)

type UserPreferenceDao interface {
	UpdateUserPreferece(ctx context.Context, userPreferences *model.UserPreferences) *model.ApiError
	FetchUserPreference(ctx context.Context) (*model.UserPreferences, *model.ApiError)
}
