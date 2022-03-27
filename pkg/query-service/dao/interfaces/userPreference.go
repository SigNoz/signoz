package interfaces

import (
	"context"

	"go.signoz.io/query-service/model"
)

type Queries interface {
	FetchUserPreference(ctx context.Context) (*model.UserPreferences, *model.ApiError)
	FetchUser(ctx context.Context, email string) (*model.UserParams, *model.ApiError)
}

type Mutations interface {
	UpdateUserPreferece(ctx context.Context, userPreferences *model.UserPreferences) *model.ApiError
	CreateNewUser(ctx context.Context, user *model.UserParams) *model.ApiError
}
