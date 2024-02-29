package integrations

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type IntegrationAuthor struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	HomePage string `json:"homepage"`
}
type IntegrationSummary struct {
	Id          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"` // A short description

	Author IntegrationAuthor `json:"author"`

	Icon string `json:"icon"`
}

type IntegrationAssets struct {
	Logs LogsAssets `json:"logs"`

	// TBD: Dashboards, alerts, saved views, facets (indexed attribs)...
}

type LogsAssets struct {
	Pipelines []logparsingpipeline.PostablePipeline `json:"pipelines"`
}

type IntegrationDetails struct {
	IntegrationSummary
	Assets IntegrationAssets `json:"assets"`
}

type IntegrationsListItem struct {
	IntegrationSummary
	IsInstalled bool `json:"is_installed"`
}

type InstalledIntegration struct {
	IntegrationId string                     `json:"integration_id" db:"integration_id"`
	Config        InstalledIntegrationConfig `json:"config_json" db:"config_json"`
	InstalledAt   time.Time                  `json:"installed_at" db:"installed_at"`
}
type InstalledIntegrationConfig map[string]interface{}

type Integration struct {
	IntegrationDetails
	Installation *InstalledIntegration `json:"installation"`
}

type Manager struct {
	availableIntegrationsRepo AvailableIntegrationsRepo
	installedIntegrationsRepo InstalledIntegrationsRepo
}

func NewManager(db *sqlx.DB) (*Manager, error) {
	iiRepo, err := NewInstalledIntegrationsSqliteRepo(db)
	if err != nil {
		return nil, fmt.Errorf(
			"could not init sqlite DB for installed integrations: %w", err,
		)
	}

	return &Manager{
		// TODO(Raj): Hook up a real available integrations provider.
		availableIntegrationsRepo: &TestAvailableIntegrationsRepo{},
		installedIntegrationsRepo: iiRepo,
	}, nil
}

type IntegrationsFilter struct {
	IsInstalled *bool
}

func (m *Manager) ListIntegrations(
	ctx context.Context,
	filter *IntegrationsFilter,
	// Expected to have pagination over time.
) ([]IntegrationsListItem, *model.ApiError) {
	available, apiErr := m.availableIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch available integrations",
		)
	}

	installed, apiErr := m.installedIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch installed integrations",
		)
	}
	installedIds := []string{}
	for _, ii := range installed {
		installedIds = append(installedIds, ii.IntegrationId)
	}

	result := []IntegrationsListItem{}
	for _, ai := range available {
		result = append(result, IntegrationsListItem{
			IntegrationSummary: ai.IntegrationSummary,
			IsInstalled:        slices.Contains(installedIds, ai.Id),
		})
	}

	if filter != nil {
		if filter.IsInstalled != nil {
			filteredResult := []IntegrationsListItem{}
			for _, r := range result {
				if r.IsInstalled == *filter.IsInstalled {
					filteredResult = append(filteredResult, r)
				}
			}
			result = filteredResult
		}
	}

	return result, nil
}

func (m *Manager) GetIntegration(
	ctx context.Context,
	integrationId string,
) (*Integration, *model.ApiError) {
	integrations, apiErr := m.getIntegrations(
		ctx, []string{integrationId},
	)
	if apiErr != nil {
		return nil, apiErr
	}

	integration, exists := integrations[integrationId]
	if !exists {
		return nil, model.NotFoundError(fmt.Errorf(
			"couldn't find integration with id: %s", integrationId,
		))
	}

	return integration, nil
}

func (m *Manager) InstallIntegration(
	ctx context.Context,
	integrationId string,
	config InstalledIntegrationConfig,
) (*IntegrationsListItem, *model.ApiError) {
	integration, apiErr := m.GetIntegration(ctx, integrationId)
	if apiErr != nil {
		return nil, apiErr
	}
	if integration.Installation == nil {
		_, apiErr = m.installedIntegrationsRepo.upsert(
			ctx, integrationId, config,
		)
		if apiErr != nil {
			return nil, model.WrapApiError(
				apiErr, "could not insert installed integration",
			)
		}
	}

	return &IntegrationsListItem{
		IntegrationSummary: integration.IntegrationDetails.IntegrationSummary,
		IsInstalled:        true,
	}, nil
}

func (m *Manager) UninstallIntegration(
	ctx context.Context,
	integrationId string,
) *model.ApiError {
	return m.installedIntegrationsRepo.delete(ctx, integrationId)
}

// Helpers.

func (m *Manager) getIntegrations(
	ctx context.Context,
	integrationIds []string,
) (map[string]*Integration, *model.ApiError) {
	ais, apiErr := m.availableIntegrationsRepo.get(
		ctx, integrationIds,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	iis, apiErr := m.installedIntegrationsRepo.get(
		ctx, integrationIds,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	result := map[string]*Integration{}
	for iid, ai := range ais {
		result[iid] = &Integration{
			IntegrationDetails: ai,
			Installation:       iis[iid],
		}
	}

	return result, nil
}

func (m *Manager) getInstalledIntegrations(
	ctx context.Context,
) (map[string]*Integration, *model.ApiError) {
	iis, apiErr := m.installedIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch installed integrations",
		)
	}

	installedIds := []string{}
	for _, ii := range iis {
		installedIds = append(installedIds, ii.IntegrationId)
	}

	return m.getIntegrations(ctx, installedIds)
}

var INTEGRATION_PIPELINE_PREFIX string = "integration-pipeline"

func (m *Manager) GetPipelinesForInstalledIntegrations(
	ctx context.Context,
) ([]logparsingpipeline.Pipeline, *model.ApiError) {
	installedIntegrations, apiErr := m.getInstalledIntegrations(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	pipelines := []logparsingpipeline.Pipeline{}
	for _, ii := range installedIntegrations {
		for _, p := range ii.Assets.Logs.Pipelines {
			pipelines = append(pipelines, logparsingpipeline.Pipeline{
				Id:          fmt.Sprintf("%s::%s", INTEGRATION_PIPELINE_PREFIX, p.Id),
				OrderId:     p.OrderId,
				Enabled:     p.Enabled,
				Name:        p.Name,
				Alias:       p.Alias,
				Description: &p.Description,
				Filter:      p.Filter,
				Config:      p.Config,
			})
		}
	}

	return pipelines, nil
}
