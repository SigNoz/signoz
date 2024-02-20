package integrations

import (
	"context"

	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type IntegrationAuthor struct {
	Name     string
	Email    string
	HomePage string
}
type IntegrationSummary struct {
	Id          string
	Title       string
	Description string // A short description

	Author IntegrationAuthor
}

type IntegrationAssets struct {
	LogPipeline logparsingpipeline.PostablePipeline

	// TBD: Dashboards, alerts, saved views, facets (indexed attribs)...
}

type IntegrationDetails struct {
	IntegrationSummary
	IntegrationAssets
}

type Integration struct {
	IntegrationDetails
	IsInstalled bool
}

type Manager struct {
	availableIntegrationsRepo AvailableIntegrationsRepo
	installedIntegrationsRepo InstalledIntegrationsRepo
}

func (m *Manager) ListAvailableIntegrations(
	ctx context.Context,
) ([]Integration, *model.ApiError) {
	available, apiErr := m.availableIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "could not fetch available integrations")
	}
	result := []Integration{}
	for _, ai := range available {
		result = append(result, Integration{
			IntegrationDetails: ai,
			IsInstalled:        false,
		})
	}
	return result, nil
}

func (m *Manager) ListInstalledIntegrations(
	ctx context.Context,
) ([]Integration, *model.ApiError) {
	installed, apiErr := m.installedIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "could not fetch installed integrations data")
	}

	result := []Integration{}
	for _, ii := range installed {
		result = append(result, Integration{
			IntegrationDetails: ii.IntegrationDetails,
			IsInstalled:        true,
		})
	}
	return result, nil
}

func (m *Manager) InstallIntegration(
	ctx context.Context,
	integrationId string,
) (*Integration, *model.ApiError) {
	ai, apiErr := m.availableIntegrationsRepo.get(ctx, integrationId)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "could not find integration to be installed")
	}

	ii, apiErr := m.installedIntegrationsRepo.upsert(ctx, *ai)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "could not insert installed integration")
	}

	return &Integration{
		IntegrationDetails: ii.IntegrationDetails,
		IsInstalled:        true,
	}, nil
}

func (m *Manager) UninstallIntegration(
	ctx context.Context,
	integrationId string,
) *model.ApiError {
	return nil
}
