package integrations

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
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
	Logs       LogsAssets             `json:"logs"`
	Dashboards []dashboards.Dashboard `json:"dashboards"`

	// TODO(Raj): Maybe use a struct for alerts
	Alerts []map[string]interface{} `json:"alerts"`
}

type LogsAssets struct {
	Pipelines []logparsingpipeline.PostablePipeline `json:"pipelines"`
}

type IntegrationConfigStep struct {
	Title        string `json:"title"`
	Instructions string `json:"instructions"`
}

type DataCollectedForIntegration struct {
	Logs    []CollectedLogAttribute `json:"logs"`
	Metrics []CollectedMetric       `json:"metrics"`
}

type CollectedLogAttribute struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
}

type CollectedMetric struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Unit string `json:"unit"`
}

type IntegrationDetails struct {
	IntegrationSummary

	Categories    []string                    `json:"categories"`
	Overview      string                      `json:"overview"` // markdown
	Configuration []IntegrationConfigStep     `json:"configuration"`
	DataCollected DataCollectedForIntegration `json:"data_collected"`
	Assets        IntegrationAssets           `json:"assets"`
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
	integrationDetails, apiErr := m.getIntegrationDetails(
		ctx, integrationId,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	installation, apiErr := m.getInstalledIntegration(
		ctx, integrationId,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	return &Integration{
		IntegrationDetails: *integrationDetails,
		Installation:       installation,
	}, nil
}

func (m *Manager) InstallIntegration(
	ctx context.Context,
	integrationId string,
	config InstalledIntegrationConfig,
) (*IntegrationsListItem, *model.ApiError) {
	integrationDetails, apiErr := m.getIntegrationDetails(ctx, integrationId)
	if apiErr != nil {
		return nil, apiErr
	}

	_, apiErr = m.installedIntegrationsRepo.upsert(
		ctx, integrationId, config,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not insert installed integration",
		)
	}

	return &IntegrationsListItem{
		IntegrationSummary: integrationDetails.IntegrationSummary,
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
func (m *Manager) getIntegrationDetails(
	ctx context.Context,
	integrationId string,
) (*IntegrationDetails, *model.ApiError) {
	if len(strings.TrimSpace(integrationId)) < 1 {
		return nil, model.BadRequest(fmt.Errorf(
			"integrationId is required",
		))
	}

	ais, apiErr := m.availableIntegrationsRepo.get(
		ctx, []string{integrationId},
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, fmt.Sprintf(
			"could not fetch integration: %s", integrationId,
		))
	}

	integrationDetails, wasFound := ais[integrationId]
	if !wasFound {
		return nil, model.NotFoundError(fmt.Errorf(
			"could not find integration: %s", integrationId,
		))
	}
	return &integrationDetails, nil
}

func (m *Manager) getInstalledIntegration(
	ctx context.Context,
	integrationId string,
) (*InstalledIntegration, *model.ApiError) {
	iis, apiErr := m.installedIntegrationsRepo.get(
		ctx, []string{integrationId},
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, fmt.Sprintf(
			"could not fetch installed integration: %s", integrationId,
		))
	}

	installation, wasFound := iis[integrationId]
	if !wasFound {
		return nil, nil
	}
	return &installation, nil
}
