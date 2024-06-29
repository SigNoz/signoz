package integrations

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/utils"
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
	Logs       LogsAssets        `json:"logs"`
	Dashboards []dashboards.Data `json:"dashboards"`

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
	Name        string `json:"name"`
	Type        string `json:"type"`
	Unit        string `json:"unit"`
	Description string `json:"description"`
}

type SignalConnectionStatus struct {
	LastReceivedTsMillis int64  `json:"last_received_ts_ms"` // epoch milliseconds
	LastReceivedFrom     string `json:"last_received_from"`  // resource identifier
}

type IntegrationConnectionStatus struct {
	Logs    *SignalConnectionStatus `json:"logs"`
	Metrics *SignalConnectionStatus `json:"metrics"`
}

// log attribute value to use for finding logs for the integration.
type LogsConnectionTest struct {
	AttributeKey   string `json:"attribute_key"`
	AttributeValue string `json:"attribute_value"`
}

type IntegrationConnectionTests struct {
	Logs *LogsConnectionTest `json:"logs"`

	// Metric names expected to have been received for the integration.
	Metrics []string `json:"metrics"`
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
			pp := logparsingpipeline.Pipeline{
				// Alias is used for identifying integration pipelines. Id can't be used for this
				// since versioning while saving pipelines requires a new id for each version
				// to avoid altering history when pipelines are edited/reordered etc
				Alias:       AliasForIntegrationPipeline(ii.Id, p.Alias),
				Id:          uuid.NewString(),
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

func (m *Manager) dashboardUuid(integrationId string, dashboardId string) string {
	return strings.Join([]string{"integration", integrationId, dashboardId}, "--")
}

func (m *Manager) parseDashboardUuid(dashboardUuid string) (
	integrationId string, dashboardId string, err *model.ApiError,
) {
	parts := strings.SplitN(dashboardUuid, "--", 3)
	if len(parts) != 3 || parts[0] != "integration" {
		return "", "", model.BadRequest(fmt.Errorf(
			"invalid installed integration dashboard id",
		))
	}

	return parts[1], parts[2], nil
}

func (m *Manager) GetInstalledIntegrationDashboardById(
	ctx context.Context,
	dashboardUuid string,
) (*dashboards.Dashboard, *model.ApiError) {
	integrationId, dashboardId, apiErr := m.parseDashboardUuid(dashboardUuid)
	if apiErr != nil {
		return nil, apiErr
	}

	integration, apiErr := m.GetIntegration(ctx, integrationId)
	if apiErr != nil {
		return nil, apiErr
	}

	if integration.Installation == nil {
		return nil, model.BadRequest(fmt.Errorf(
			"integration with id %s is not installed", integrationId,
		))
	}

	for _, dd := range integration.IntegrationDetails.Assets.Dashboards {
		if dId, exists := dd["id"]; exists {
			if id, ok := dId.(string); ok && id == dashboardId {
				isLocked := 1
				author := "integration"
				return &dashboards.Dashboard{
					Uuid:      m.dashboardUuid(integrationId, string(dashboardId)),
					Locked:    &isLocked,
					Data:      dd,
					CreatedAt: integration.Installation.InstalledAt,
					CreateBy:  &author,
					UpdatedAt: integration.Installation.InstalledAt,
					UpdateBy:  &author,
				}, nil
			}
		}
	}

	return nil, model.NotFoundError(fmt.Errorf(
		"integration dashboard with id %s not found", dashboardUuid,
	))
}

func (m *Manager) GetDashboardsForInstalledIntegrations(
	ctx context.Context,
) ([]dashboards.Dashboard, *model.ApiError) {
	installedIntegrations, apiErr := m.getInstalledIntegrations(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	result := []dashboards.Dashboard{}

	for _, ii := range installedIntegrations {
		for _, dd := range ii.Assets.Dashboards {
			if dId, exists := dd["id"]; exists {
				if dashboardId, ok := dId.(string); ok {
					isLocked := 1
					author := "integration"
					result = append(result, dashboards.Dashboard{
						Uuid:      m.dashboardUuid(ii.IntegrationSummary.Id, dashboardId),
						Locked:    &isLocked,
						Data:      dd,
						CreatedAt: ii.Installation.InstalledAt,
						CreateBy:  &author,
						UpdatedAt: ii.Installation.InstalledAt,
						UpdateBy:  &author,
					})
				}
			}
		}
	}

	return result, nil
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

func (m *Manager) getInstalledIntegrations(
	ctx context.Context,
) (
	map[string]Integration, *model.ApiError,
) {
	installations, apiErr := m.installedIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	installedIds := utils.MapSlice(installations, func(i InstalledIntegration) string {
		return i.IntegrationId
	})
	integrationDetails, apiErr := m.availableIntegrationsRepo.get(ctx, installedIds)
	if apiErr != nil {
		return nil, apiErr
	}

	result := map[string]Integration{}
	for _, ii := range installations {
		iDetails, exists := integrationDetails[ii.IntegrationId]
		if !exists {
			return nil, model.InternalError(fmt.Errorf(
				"couldn't find integration details for %s", ii.IntegrationId,
			))
		}

		result[ii.IntegrationId] = Integration{
			Installation:       &ii,
			IntegrationDetails: iDetails,
		}
	}
	return result, nil
}
