package integrations

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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
	Logs       LogsAssets                             `json:"logs"`
	Dashboards []dashboardtypes.StorableDashboardData `json:"dashboards"`

	Alerts []ruletypes.PostableRule `json:"alerts"`
}

type LogsAssets struct {
	Pipelines []pipelinetypes.PostablePipeline `json:"pipelines"`
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

type Integration struct {
	IntegrationDetails
	Installation *types.InstalledIntegration `json:"installation"`
}

type Manager struct {
	availableIntegrationsRepo AvailableIntegrationsRepo
	installedIntegrationsRepo InstalledIntegrationsRepo
}

func NewManager(store sqlstore.SQLStore) (*Manager, error) {
	iiRepo, err := NewInstalledIntegrationsSqliteRepo(store)
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
	orgId string,
	filter *IntegrationsFilter,
	// Expected to have pagination over time.
) ([]IntegrationsListItem, *model.ApiError) {
	available, apiErr := m.availableIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch available integrations",
		)
	}

	installed, apiErr := m.installedIntegrationsRepo.list(ctx, orgId)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch installed integrations",
		)
	}
	installedTypes := []string{}
	for _, ii := range installed {
		installedTypes = append(installedTypes, ii.Type)
	}

	result := []IntegrationsListItem{}
	for _, ai := range available {
		result = append(result, IntegrationsListItem{
			IntegrationSummary: ai.IntegrationSummary,
			IsInstalled:        slices.Contains(installedTypes, ai.Id),
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
	orgId string,
	integrationId string,
) (*Integration, *model.ApiError) {
	integrationDetails, apiErr := m.getIntegrationDetails(
		ctx, integrationId,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	installation, apiErr := m.getInstalledIntegration(
		ctx, orgId, integrationId,
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
	orgId string,
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
	orgId string,
	integrationId string,
	config types.InstalledIntegrationConfig,
) (*IntegrationsListItem, *model.ApiError) {
	integrationDetails, apiErr := m.getIntegrationDetails(ctx, integrationId)
	if apiErr != nil {
		return nil, apiErr
	}

	_, apiErr = m.installedIntegrationsRepo.upsert(
		ctx, orgId, integrationId, config,
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
	orgId string,
	integrationId string,
) *model.ApiError {
	return m.installedIntegrationsRepo.delete(ctx, orgId, integrationId)
}

func (m *Manager) GetPipelinesForInstalledIntegrations(
	ctx context.Context,
	orgId string,
) ([]pipelinetypes.GettablePipeline, error) {
	installedIntegrations, apiErr := m.getInstalledIntegrations(ctx, orgId)
	if apiErr != nil {
		return nil, apiErr
	}

	gettablePipelines := []pipelinetypes.GettablePipeline{}
	for _, ii := range installedIntegrations {
		for _, p := range ii.Assets.Logs.Pipelines {
			gettablePipelines = append(gettablePipelines, pipelinetypes.GettablePipeline{
				// Alias is used for identifying integration pipelines. Id can't be used for this
				// since versioning while saving pipelines requires a new id for each version
				// to avoid altering history when pipelines are edited/reordered etc
				StoreablePipeline: pipelinetypes.StoreablePipeline{
					Alias: AliasForIntegrationPipeline(ii.Id, p.Alias),
					Identifiable: types.Identifiable{
						ID: valuer.GenerateUUID(),
					},
					OrderID:     p.OrderID,
					Enabled:     p.Enabled,
					Name:        p.Name,
					Description: p.Description,
				},
				Filter: p.Filter,
				Config: p.Config,
			})
		}
	}

	return gettablePipelines, nil
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

func (m *Manager) IsInstalledIntegrationDashboardUuid(dashboardUuid string) bool {
	_, _, apiErr := m.parseDashboardUuid(dashboardUuid)
	return apiErr == nil
}

func (m *Manager) GetInstalledIntegrationDashboardById(
	ctx context.Context,
	orgId valuer.UUID,
	dashboardUuid string,
) (*dashboardtypes.Dashboard, *model.ApiError) {
	integrationId, dashboardId, apiErr := m.parseDashboardUuid(dashboardUuid)
	if apiErr != nil {
		return nil, apiErr
	}

	integration, apiErr := m.GetIntegration(ctx, orgId.StringValue(), integrationId)
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
				author := "integration"
				return &dashboardtypes.Dashboard{
					ID:     m.dashboardUuid(integrationId, string(dashboardId)),
					Locked: true,
					Data:   dd,
					TimeAuditable: types.TimeAuditable{
						CreatedAt: integration.Installation.InstalledAt,
						UpdatedAt: integration.Installation.InstalledAt,
					},
					UserAuditable: types.UserAuditable{
						CreatedBy: author,
						UpdatedBy: author,
					},
					OrgID: orgId,
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
	orgId valuer.UUID,
) ([]*dashboardtypes.Dashboard, *model.ApiError) {
	installedIntegrations, apiErr := m.getInstalledIntegrations(ctx, orgId.StringValue())
	if apiErr != nil {
		return nil, apiErr
	}

	result := []*dashboardtypes.Dashboard{}

	for _, ii := range installedIntegrations {
		for _, dd := range ii.Assets.Dashboards {
			if dId, exists := dd["id"]; exists {
				if dashboardId, ok := dId.(string); ok {
					author := "integration"
					result = append(result, &dashboardtypes.Dashboard{
						ID:     m.dashboardUuid(ii.IntegrationSummary.Id, dashboardId),
						Locked: true,
						Data:   dd,
						TimeAuditable: types.TimeAuditable{
							CreatedAt: ii.Installation.InstalledAt,
							UpdatedAt: ii.Installation.InstalledAt,
						},
						UserAuditable: types.UserAuditable{
							CreatedBy: author,
							UpdatedBy: author,
						},
						OrgID: orgId,
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
	orgId string,
	integrationId string,
) (*types.InstalledIntegration, *model.ApiError) {
	iis, apiErr := m.installedIntegrationsRepo.get(
		ctx, orgId, []string{integrationId},
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
	orgId string,
) (
	map[string]Integration, *model.ApiError,
) {
	installations, apiErr := m.installedIntegrationsRepo.list(ctx, orgId)
	if apiErr != nil {
		return nil, apiErr
	}

	installedTypes := utils.MapSlice(installations, func(i types.InstalledIntegration) string {
		return i.Type
	})
	integrationDetails, apiErr := m.availableIntegrationsRepo.get(ctx, installedTypes)
	if apiErr != nil {
		return nil, apiErr
	}

	result := map[string]Integration{}
	for _, ii := range installations {
		iDetails, exists := integrationDetails[ii.Type]
		if !exists {
			return nil, model.InternalError(fmt.Errorf(
				"couldn't find integration details for %s", ii.Type,
			))
		}

		result[ii.Type] = Integration{
			Installation:       &ii,
			IntegrationDetails: iDetails,
		}
	}
	return result, nil
}
