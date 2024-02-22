package integrations

import (
	"context"
	"fmt"
	"slices"
	"strings"

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
	LogPipeline *logparsingpipeline.PostablePipeline

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

	installed, apiErr := m.installedIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "could not fetch installed integrations")
	}
	installedIntegrationIds := []string{}
	for _, ii := range installed {
		installedIntegrationIds = append(installedIntegrationIds, ii.IntegrationId)
	}

	result := []Integration{}
	for _, ai := range available {
		result = append(result, Integration{
			IntegrationDetails: ai,
			IsInstalled:        slices.Contains(installedIntegrationIds, ai.Id),
		})
	}
	return result, nil
}

func (m *Manager) ListInstalledIntegrations(
	ctx context.Context,
) ([]Integration, *model.ApiError) {
	installed, apiErr := m.installedIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch installed integrations data",
		)
	}

	integrationIds := []string{}
	for _, ii := range installed {
		integrationIds = append(integrationIds, ii.IntegrationId)
	}
	integrationDetails, apiErr := m.availableIntegrationsRepo.get(ctx, integrationIds)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch integrations details",
		)
	}
	if len(integrationDetails) != len(integrationIds) {
		missingIds := []string{}
		for _, iid := range integrationIds {
			if _, exists := integrationDetails[iid]; !exists {
				missingIds = append(missingIds, iid)
			}
		}
		return nil, model.NotFoundError(fmt.Errorf(
			"could not get details for all installed integrations with id: %s",
			strings.Join(missingIds, ", "),
		))
	}

	result := []Integration{}
	for _, ii := range installed {
		result = append(result, Integration{
			IntegrationDetails: integrationDetails[ii.IntegrationId],
			IsInstalled:        true,
		})
	}
	return result, nil
}

func (m *Manager) InstallIntegration(
	ctx context.Context,
	integrationId string,
) (*Integration, *model.ApiError) {
	ais, apiErr := m.availableIntegrationsRepo.get(
		ctx, []string{integrationId},
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, fmt.Sprintf(
			"could not find integration to be installed: %s", integrationId,
		))
	}

	integrationDetails, wasFound := ais[integrationId]
	if !wasFound {
		return nil, model.NotFoundError(fmt.Errorf(
			"could not find integration to be installed: %s", integrationId,
		))
	}

	_, apiErr = m.installedIntegrationsRepo.upsert(
		ctx, integrationDetails,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "could not insert installed integration")
	}

	return &Integration{
		IntegrationDetails: integrationDetails,
		IsInstalled:        true,
	}, nil
}

func (m *Manager) UninstallIntegration(
	ctx context.Context,
	integrationId string,
) *model.ApiError {
	return m.installedIntegrationsRepo.delete(ctx, integrationId)
}
