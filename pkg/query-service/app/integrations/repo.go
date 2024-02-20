package integrations

import (
	"context"
	"time"

	"go.signoz.io/signoz/pkg/query-service/model"
)

type InstalledIntegration struct {
	IntegrationDetails `db:"data"`
	installedAt        time.Time `db:"installed_at"`
}

type InstalledIntegrationsRepo interface {
	list(context.Context) ([]InstalledIntegration, *model.ApiError)
	get(ctx context.Context, ids []string) (map[string]InstalledIntegration, *model.ApiError)
	upsert(context.Context, IntegrationDetails) (*InstalledIntegration, *model.ApiError)
	delete(ctx context.Context, integrationId string) *model.ApiError
}

type AvailableIntegrationsRepo interface {
	list(context.Context) ([]IntegrationDetails, *model.ApiError)
	get(ctx context.Context, id string) (*IntegrationDetails, *model.ApiError)
}
