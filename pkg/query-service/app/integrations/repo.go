package integrations

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

type InstalledIntegrationsRepo interface {
	list(ctx context.Context, orgId string) ([]cloudintegrationtypes.InstalledIntegration, *model.ApiError)

	get(
		ctx context.Context, orgId string, integrationTypes []string,
	) (map[string]cloudintegrationtypes.InstalledIntegration, *model.ApiError)

	upsert(
		ctx context.Context,
		orgId string,
		integrationType string,
		config cloudintegrationtypes.InstalledIntegrationConfig,
	) (*cloudintegrationtypes.InstalledIntegration, *model.ApiError)

	delete(ctx context.Context, orgId string, integrationType string) *model.ApiError

	createIntegrationDashboard(ctx context.Context, row *cloudintegrationtypes.StorableIntegrationDashboard) error

	getIntegrationDashboardBySlug(ctx context.Context, orgID string, slug string) (*cloudintegrationtypes.StorableIntegrationDashboard, error)

	listIntegrationDashboardsBySlugPrefix(ctx context.Context, orgID string, slugPrefix string) ([]*cloudintegrationtypes.StorableIntegrationDashboard, error)

	deleteIntegrationDashboardBySlug(ctx context.Context, orgID string, slug string) error

	runInTx(ctx context.Context, fn func(ctx context.Context) error) error
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
