package integrations

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

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
	// Each integration is expected to specify all log transformations
	// in a single pipeline with a source based filter
	LogPipeline *logparsingpipeline.PostablePipeline

	// TBD: Dashboards, alerts, saved views, facets (indexed attribs)...
}

type IntegrationDetails struct {
	IntegrationSummary
	IntegrationAssets
}

type AvailableIntegration struct {
	IntegrationDetails
	IsInstalled bool
}

type InstalledIntegration struct {
	IntegrationId string                     `db:"integration_id"`
	Config        InstalledIntegrationConfig `db:"config_json"`
	InstalledAt   time.Time                  `db:"installed_at"`
}
type InstalledIntegrationConfig map[string]interface{}

type InstalledIntegrationWithDetails struct {
	InstalledIntegration
	IntegrationDetails
}

type Manager struct {
	availableIntegrationsRepo AvailableIntegrationsRepo
	installedIntegrationsRepo InstalledIntegrationsRepo
}

func (m *Manager) ListAvailableIntegrations(
	ctx context.Context,
	// Expected to have filters and pagination over time.
) ([]AvailableIntegration, *model.ApiError) {
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

	result := []AvailableIntegration{}
	for _, ai := range available {
		result = append(result, AvailableIntegration{
			IntegrationDetails: ai,
			IsInstalled:        slices.Contains(installedIds, ai.Id),
		})
	}
	return result, nil
}

func (m *Manager) ListInstalledIntegrations(
	ctx context.Context,
) ([]InstalledIntegrationWithDetails, *model.ApiError) {
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

	integrationDetails, apiErr := m.availableIntegrationsRepo.get(
		ctx, installedIds,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch details for installed integrations",
		)
	}
	if len(integrationDetails) != len(installedIds) {
		missingIds := []string{}
		for _, iid := range installedIds {
			if _, exists := integrationDetails[iid]; !exists {
				missingIds = append(missingIds, iid)
			}
		}
		return nil, model.NotFoundError(fmt.Errorf(
			"could not get details for all installed integrations with id: %s",
			strings.Join(missingIds, ", "),
		))
	}

	result := []InstalledIntegrationWithDetails{}
	for _, ii := range installed {
		result = append(result, InstalledIntegrationWithDetails{
			InstalledIntegration: ii,
			IntegrationDetails:   integrationDetails[ii.IntegrationId],
		})
	}
	return result, nil
}

func (m *Manager) InstallIntegration(
	ctx context.Context,
	integrationId string,
	config InstalledIntegrationConfig,
) (*AvailableIntegration, *model.ApiError) {
	ais, apiErr := m.availableIntegrationsRepo.get(
		ctx, []string{integrationId},
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, fmt.Sprintf(
			"could not fetch integration to be installed: %s", integrationId,
		))
	}

	integrationDetails, wasFound := ais[integrationId]
	if !wasFound {
		return nil, model.NotFoundError(fmt.Errorf(
			"could not find integration to be installed: %s", integrationId,
		))
	}

	_, apiErr = m.installedIntegrationsRepo.upsert(
		ctx, integrationId, config,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not insert installed integration",
		)
	}

	return &AvailableIntegration{
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
