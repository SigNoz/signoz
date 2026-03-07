package integrations

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Controller struct {
	mgr *Manager
}

func NewController(sqlStore sqlstore.SQLStore) (*Controller, error) {
	mgr, err := NewManager(sqlStore)
	if err != nil {
		return nil, fmt.Errorf("couldn't create integrations manager: %w", err)
	}

	return &Controller{
		mgr: mgr,
	}, nil
}

type IntegrationsListResponse struct {
	Integrations []IntegrationsListItem `json:"integrations"`

	// Pagination details to come later
}

func (c *Controller) ListIntegrations(ctx context.Context, orgId string, params map[string]string) (*IntegrationsListResponse, *model.ApiError) {
	var filters *IntegrationsFilter
	if isInstalledFilter, exists := params["is_installed"]; exists {
		isInstalled := !(isInstalledFilter == "false")
		filters = &IntegrationsFilter{
			IsInstalled: &isInstalled,
		}
	}

	integrations, apiErr := c.mgr.ListIntegrations(ctx, orgId, filters)
	if apiErr != nil {
		return nil, apiErr
	}

	return &IntegrationsListResponse{
		Integrations: integrations,
	}, nil
}

func (c *Controller) GetIntegration(ctx context.Context, orgId string, integrationId string) (*Integration, *model.ApiError) {
	return c.mgr.GetIntegration(ctx, orgId, integrationId)
}

func (c *Controller) IsIntegrationInstalled(ctx context.Context, orgId string, integrationId string) (bool, *model.ApiError) {
	installation, apiErr := c.mgr.getInstalledIntegration(ctx, orgId, integrationId)
	if apiErr != nil {
		return false, apiErr
	}
	isInstalled := installation != nil
	return isInstalled, nil
}

func (c *Controller) GetIntegrationConnectionTests(ctx context.Context, orgId string, integrationId string) (*IntegrationConnectionTests, *model.ApiError) {
	return c.mgr.GetIntegrationConnectionTests(ctx, orgId, integrationId)
}

type InstallIntegrationRequest struct {
	IntegrationId string                 `json:"integration_id"`
	Config        map[string]interface{} `json:"config"`
}

func (c *Controller) Install(ctx context.Context, orgId string, req *InstallIntegrationRequest) (*IntegrationsListItem, *model.ApiError) {
	res, apiErr := c.mgr.InstallIntegration(
		ctx, orgId, req.IntegrationId, req.Config,
	)
	if apiErr != nil {
		return nil, apiErr
	}
	agentConf.NotifyConfigUpdate(ctx)
	return res, nil
}

type UninstallIntegrationRequest struct {
	IntegrationId string `json:"integration_id"`
}

func (c *Controller) Uninstall(ctx context.Context, orgId string, req *UninstallIntegrationRequest) *model.ApiError {
	if len(req.IntegrationId) < 1 {
		return model.BadRequest(fmt.Errorf(
			"integration_id is required",
		))
	}

	apiErr := c.mgr.UninstallIntegration(
		ctx, orgId, req.IntegrationId,
	)
	if apiErr != nil {
		return apiErr
	}
	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (c *Controller) GetPipelinesForInstalledIntegrations(ctx context.Context, orgId string) ([]pipelinetypes.GettablePipeline, error) {
	return c.mgr.GetPipelinesForInstalledIntegrations(ctx, orgId)
}

func (c *Controller) GetDashboardsForInstalledIntegrations(ctx context.Context, orgId valuer.UUID) ([]*dashboardtypes.Dashboard, *model.ApiError) {
	return c.mgr.GetDashboardsForInstalledIntegrations(ctx, orgId)
}

func (c *Controller) GetInstalledIntegrationDashboardById(ctx context.Context, orgId valuer.UUID, dashboardUuid string) (*dashboardtypes.Dashboard, *model.ApiError) {
	return c.mgr.GetInstalledIntegrationDashboardById(ctx, orgId, dashboardUuid)
}

func (c *Controller) IsInstalledIntegrationDashboardID(dashboardUuid string) bool {
	return c.mgr.IsInstalledIntegrationDashboardUuid(dashboardUuid)
}
