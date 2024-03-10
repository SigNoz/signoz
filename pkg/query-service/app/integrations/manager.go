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
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/rules"
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

	Alerts []rules.PostableRule `json:"alerts"`
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

type SignalConnectionStatus struct {
	LastReceivedTsMillis int64  `json:"last_received_ts_ms"` // epoch milliseconds
	LastReceivedFrom     string `json:"last_received_from"`  // resource identifier
}

type IntegrationConnectionStatus struct {
	Logs    *SignalConnectionStatus `json:"logs"`
	Metrics *SignalConnectionStatus `json:"metrics"`
}

type IntegrationConnectionTests struct {
	Logs *v3.FilterSet `json:"logs"`

	// TODO(Raj): Add connection tests for other signals.
}

type IntegrationDetails struct {
	IntegrationSummary

	Categories    []string                    `json:"categories"`
	Overview      string                      `json:"overview"` // markdown
	Configuration []IntegrationConfigStep     `json:"configuration"`
	DataCollected DataCollectedForIntegration `json:"data_collected"`
	Assets        IntegrationAssets           `json:"assets"`

	ConnectionTests *IntegrationConnectionTests `json:"connection_tests"`
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
		availableIntegrationsRepo: &BuiltInIntegrations{},
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

func (m *Manager) GetIntegrationConnectionTests(
	ctx context.Context,
	integrationId string,
) (*IntegrationConnectionTests, *model.ApiError) {
	integrationDetails, apiErr := m.getIntegrationDetails(
		ctx, integrationId,
	)
	if apiErr != nil {
		return nil, apiErr
	}
	return integrationDetails.ConnectionTests, nil
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

func (m *Manager) GetPipelinesForInstalledIntegrations(
	ctx context.Context,
) ([]logparsingpipeline.Pipeline, *model.ApiError) {
	installations, apiErr := m.installedIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	installedIntegrationIds := []string{}
	for _, ii := range installations {
		installedIntegrationIds = append(installedIntegrationIds, ii.IntegrationId)
	}

	installedIntegrations, apiErr := m.availableIntegrationsRepo.get(
		ctx, installedIntegrationIds,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	pipelines := []logparsingpipeline.Pipeline{}
	for _, ii := range installedIntegrations {
		for _, p := range ii.Assets.Logs.Pipelines {
			ipId := strings.Join(
				[]string{INTEGRATION_PIPELINE_ID_PREFIX, ii.Id, p.Id},
				INTEGRATION_PIPELINE_ID_SEPARATOR,
			)
			pp := logparsingpipeline.Pipeline{
				Id: ipId,
				// Alias is the primary identifier for detetcing integration pipelines
				// as the current config versioning requires new pipeline ids for each version
				Alias:       ipId,
				OrderId:     p.OrderId,
				Enabled:     p.Enabled,
				Name:        p.Name,
				Description: &p.Description,
				Filter:      p.Filter,
				Config:      p.Config,
			}
			pipelines = append(pipelines, pp)
		}
	}

	return pipelines, nil
}
