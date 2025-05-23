package integrations

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
)

type InstalledIntegrationsRepo interface {
	list(ctx context.Context, orgId string) ([]types.InstalledIntegration, *model.ApiError)

	get(
		ctx context.Context, orgId string, integrationTypes []string,
	) (map[string]types.InstalledIntegration, *model.ApiError)

	upsert(
		ctx context.Context,
		orgId string,
		integrationType string,
		config types.InstalledIntegrationConfig,
	) (*types.InstalledIntegration, *model.ApiError)

	delete(ctx context.Context, orgId string, integrationType string) *model.ApiError
}

type AvailableIntegrationsRepo interface {
	list(context.Context) ([]IntegrationDetails, *model.ApiError)

	get(
		ctx context.Context, integrationTypes []string,
	) (map[string]IntegrationDetails, *model.ApiError)

	// AvailableIntegrationsRepo implementations are expected to cache
	// details of installed integrations for quick retrieval.
	//
	// For v0 only bundled integrations are available, later versions
	// are expected to add methods in this interface for pinning installed
	// integration details in local cache.
}
