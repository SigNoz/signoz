// TODO: clean this package and move to modules structure
package cloudintegrations

import (
	"context"
	"fmt"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/exp/maps"
)

var SupportedCloudProviders = []string{
	"aws",
}

func validateCloudProviderName(name string) *model.ApiError {
	if !slices.Contains(SupportedCloudProviders, name) {
		return model.BadRequest(fmt.Errorf("invalid cloud provider: %s", name))
	}
	return nil
}

type Controller struct {
	accountsRepo      cloudProviderAccountsRepository
	serviceConfigRepo ServiceConfigDatabase
}

func NewController(sqlStore sqlstore.SQLStore) (*Controller, error) {
	accountsRepo, err := newCloudProviderAccountsRepository(sqlStore)
	if err != nil {
		return nil, fmt.Errorf("couldn't create cloud provider accounts repo: %w", err)
	}

	serviceConfigRepo, err := newServiceConfigRepository(sqlStore)
	if err != nil {
		return nil, fmt.Errorf("couldn't create cloud provider service config repo: %w", err)
	}

	return &Controller{
		accountsRepo:      accountsRepo,
		serviceConfigRepo: serviceConfigRepo,
	}, nil
}

type ConnectedAccountsListResponse struct {
	Accounts []types.Account `json:"accounts"`
}

func (c *Controller) ListConnectedAccounts(ctx context.Context, orgId string, cloudProvider string) (
	*ConnectedAccountsListResponse, *model.ApiError,
) {
	accountRecords, apiErr := c.accountsRepo.listConnected(ctx, orgId, cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list cloud accounts")
	}

	connectedAccounts := []types.Account{}
	for _, a := range accountRecords {
		connectedAccounts = append(connectedAccounts, a.Account())
	}

	return &ConnectedAccountsListResponse{
		Accounts: connectedAccounts,
	}, nil
}

type GenerateConnectionCommandRequest struct {
	AWSConnectionUrlRequest       *AWSConnectionUrlRequest
	AzureConnectionCommandRequest *AzureConnectionCommandRequest
}

type AWSConnectionUrlRequest struct {
	// Optional. To be specified for updates.
	// TODO: evaluate and remove if not needed.
	AccountId *string `json:"account_id,omitempty"`

	AccountConfig types.AccountConfig `json:"account_config"`

	AgentConfig SigNozAgentConfig `json:"agent_config"`
}

type AzureConnectionCommandRequest struct {
	AgentConfig   SigNozAzureAgentConfig `json:"agent_config"`
	AccountConfig types.AccountConfig    `json:"account_config"`
}

type SigNozAgentConfig struct {
	// The region in which SigNoz agent should be installed.
	Region string `json:"region"`

	IngestionUrl string `json:"ingestion_url"`
	IngestionKey string `json:"ingestion_key"`
	SigNozAPIUrl string `json:"signoz_api_url"`
	SigNozAPIKey string `json:"signoz_api_key"`

	Version string `json:"version,omitempty"`
}

type SigNozAzureAgentConfig struct {
	IngestionUrl string `json:"ingestion_url"`
	IngestionKey string `json:"ingestion_key"`
	SigNozAPIUrl string `json:"signoz_api_url"`
	SigNozAPIKey string `json:"signoz_api_key"`

	Version string `json:"version,omitempty"`
}

type GenerateConnectionResponse struct {
	AWSConnectionUrl       *AWSConnectionUrlResponse
	AzureConnectionCommand *AzureConnectionCommandResponse
}

type AWSConnectionUrlResponse struct {
	AccountId     string `json:"account_id"`
	ConnectionUrl string `json:"connection_url"`
}

type AzureConnectionCommandResponse struct {
	AccountId                   string `json:"account_id"`
	AzureShellConnectionCommand string `json:"az_shell_connection_command"`
	AzureCliConnectionCommand   string `json:"az_cli_connection_command"`
}

func (c *Controller) GenerateConnectionCommand(ctx context.Context, orgId string, cloudProvider string, req GenerateConnectionCommandRequest) (*GenerateConnectionResponse, *model.ApiError) {
	switch cloudProvider {
	case types.CloudProviderAWS:
		resp, err := c.getConnectionUrlForAWS(ctx, orgId, req.AWSConnectionUrlRequest)
		if err != nil {
			return nil, err
		}

		return &GenerateConnectionResponse{
			AWSConnectionUrl: resp,
		}, nil
	case types.CloudProviderAzure:
		resp, err := c.getConnectionUrlForAzure(ctx, orgId, req.AzureConnectionCommandRequest)
		if err != nil {
			return nil, err
		}

		return &GenerateConnectionResponse{
			AzureConnectionCommand: resp,
		}, nil
	default:
		return nil, model.BadRequest(fmt.Errorf("unsupported cloud provider: %s", cloudProvider))
	}
}

func (c *Controller) getConnectionUrlForAWS(ctx context.Context, orgId string,
	req *AWSConnectionUrlRequest) (*AWSConnectionUrlResponse, *model.ApiError) {
	account, apiErr := c.accountsRepo.upsert(
		ctx, orgId, types.CloudProviderAWS, nil, &req.AccountConfig,
		nil, nil, nil,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	}

	agentVersion := "v0.0.8"
	if req.AgentConfig.Version != "" {
		agentVersion = req.AgentConfig.Version
	}

	connectionUrl := fmt.Sprintf(
		"https://%s.console.aws.amazon.com/cloudformation/home?region=%s#/stacks/quickcreate?",
		req.AgentConfig.Region, req.AgentConfig.Region,
	)

	for qp, value := range map[string]string{
		"param_SigNozIntegrationAgentVersion": agentVersion,
		"param_SigNozApiUrl":                  req.AgentConfig.SigNozAPIUrl,
		"param_SigNozApiKey":                  req.AgentConfig.SigNozAPIKey,
		"param_SigNozAccountId":               account.ID.StringValue(),
		"param_IngestionUrl":                  req.AgentConfig.IngestionUrl,
		"param_IngestionKey":                  req.AgentConfig.IngestionKey,
		"stackName":                           "signoz-integration",
		"templateURL": fmt.Sprintf(
			"https://signoz-integrations.s3.us-east-1.amazonaws.com/aws-quickcreate-template-%s.json",
			agentVersion,
		),
	} {
		connectionUrl += fmt.Sprintf("&%s=%s", qp, url.QueryEscape(value))
	}

	return &AWSConnectionUrlResponse{
		AccountId:     account.ID.StringValue(),
		ConnectionUrl: connectionUrl,
	}, nil
}

func (c *Controller) getConnectionUrlForAzure(ctx context.Context, orgId string,
	req *AzureConnectionCommandRequest) (*AzureConnectionCommandResponse, *model.ApiError) {
	account, apiErr := c.accountsRepo.upsert(
		ctx, orgId, types.CloudProviderAzure, nil, &req.AccountConfig,
		nil, nil, nil,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	}

	//agentVersion := "v0.0.1"
	//
	//if req.AgentConfig.Version != "" {
	//	agentVersion = req.AgentConfig.Version
	//}

	// TODO: improve cli command generation
	cliCommand := []string{"az", "stack", "sub", "create", "--name", "SigNozIntegration", "--location",
		req.AccountConfig.PrimaryRegion, "--template-uri", "https://raw.githubusercontent.com/swagftw/signoz-pocs/refs/heads/main/template.json",
		"--action-on-unmanage", "deleteAll", "--deny-settings-mode", "denyDelete", "--parameters", fmt.Sprintf("rgName=%s", "signoz-integration-rg"),
		fmt.Sprintf("rgLocation=%s", req.AccountConfig.PrimaryRegion)}

	return &AzureConnectionCommandResponse{
		AccountId:                   account.ID.String(),
		AzureShellConnectionCommand: "az create",
		AzureCliConnectionCommand:   strings.Join(cliCommand, " "),
	}, nil
}

type AccountStatusResponse struct {
	Id             string              `json:"id"`
	CloudAccountId *string             `json:"cloud_account_id,omitempty"`
	Status         types.AccountStatus `json:"status"`
}

func (c *Controller) GetAccountStatus(ctx context.Context, orgId string, cloudProvider string, accountId string) (
	*AccountStatusResponse, *model.ApiError,
) {
	account, apiErr := c.accountsRepo.get(ctx, orgId, cloudProvider, accountId)
	if apiErr != nil {
		return nil, apiErr
	}

	resp := AccountStatusResponse{
		Id:             account.ID.StringValue(),
		CloudAccountId: account.AccountID,
		Status:         account.Status(),
	}

	return &resp, nil
}

type AgentCheckInRequest struct {
	ID        string `json:"account_id"`
	AccountID string `json:"cloud_account_id"`
	// Arbitrary cloud specific Agent data
	Data map[string]any `json:"data,omitempty"`
}

type AgentCheckInResponse struct {
	AccountId      string     `json:"account_id"`
	CloudAccountId string     `json:"cloud_account_id"`
	RemovedAt      *time.Time `json:"removed_at"`

	IntegrationConfig IntegrationConfigForAgent `json:"integration_config"`
}

type IntegrationConfigForAgent struct {
	EnabledRegions []string `json:"enabled_regions"`

	TelemetryCollectionStrategy *CompiledCollectionStrategy `json:"telemetry,omitempty"`
}

func (c *Controller) CheckInAsAgent(ctx context.Context, orgId string, cloudProvider string, req AgentCheckInRequest) (*AgentCheckInResponse, error) {
	existingAccount, apiErr := c.accountsRepo.get(ctx, orgId, cloudProvider, req.ID)
	if existingAccount != nil && existingAccount.AccountID != nil && *existingAccount.AccountID != req.AccountID {
		return nil, model.BadRequest(fmt.Errorf(
			"can't check in with new %s account id %s for account %s with existing %s id %s",
			cloudProvider, req.AccountID, existingAccount.ID.StringValue(), cloudProvider, *existingAccount.AccountID,
		))
	}

	existingAccount, apiErr = c.accountsRepo.getConnectedCloudAccount(ctx, orgId, cloudProvider, req.AccountID)
	if existingAccount != nil && existingAccount.ID.StringValue() != req.ID {
		return nil, model.BadRequest(fmt.Errorf(
			"can't check in to %s account %s with id %s. already connected with id %s",
			cloudProvider, req.AccountID, req.ID, existingAccount.ID.StringValue(),
		))
	}

	agentReport := types.AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            req.Data,
	}

	account, apiErr := c.accountsRepo.upsert(
		ctx, orgId, cloudProvider, &req.ID, nil, &req.AccountID, &agentReport, nil,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	}

	// prepare and return integration config to be consumed by agent
	compiledStrategy, err := NewCompiledCollectionStrategy(cloudProvider)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't init telemetry collection strategy: %w", err,
		))
	}

	agentConfig := IntegrationConfigForAgent{
		EnabledRegions:              []string{},
		TelemetryCollectionStrategy: compiledStrategy,
	}

	if account.Config != nil && account.Config.EnabledRegions != nil {
		agentConfig.EnabledRegions = account.Config.EnabledRegions
	}

	services, err := services.Map(cloudProvider)
	if err != nil {
		return nil, err
	}

	svcConfigs, apiErr := c.serviceConfigRepo.getAllForAccount(
		ctx, orgId, account.ID.StringValue(),
	)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "couldn't get service configs for cloud account",
		)
	}

	// accumulate config in a fixed order to ensure same config generated across runs
	configuredServices := maps.Keys(svcConfigs)
	slices.Sort(configuredServices)

	for _, svcType := range configuredServices {
		definition, ok := services[svcType]
		if !ok {
			continue
		}
		config := svcConfigs[svcType]

		err := AddServiceStrategy(svcType, compiledStrategy, definition.Strategy, config)
		if err != nil {
			return nil, err
		}
	}

	return &AgentCheckInResponse{
		AccountId:         account.ID.StringValue(),
		CloudAccountId:    *account.AccountID,
		RemovedAt:         account.RemovedAt,
		IntegrationConfig: agentConfig,
	}, nil
}

type UpdateAccountConfigRequest struct {
	Config types.AccountConfig `json:"config"`
}

func (c *Controller) UpdateAccountConfig(ctx context.Context, orgId string, cloudProvider string, accountId string, req UpdateAccountConfigRequest) (*types.Account, *model.ApiError) {
	accountRecord, apiErr := c.accountsRepo.upsert(
		ctx, orgId, cloudProvider, &accountId, &req.Config, nil, nil, nil,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	}

	account := accountRecord.Account()

	return &account, nil
}

func (c *Controller) DisconnectAccount(ctx context.Context, orgId string, cloudProvider string, accountId string) (*types.CloudIntegration, *model.ApiError) {
	account, apiErr := c.accountsRepo.get(ctx, orgId, cloudProvider, accountId)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't disconnect account")
	}

	tsNow := time.Now()
	account, apiErr = c.accountsRepo.upsert(
		ctx, orgId, cloudProvider, &accountId, nil, nil, nil, &tsNow,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't disconnect account")
	}

	return account, nil
}

type ListServicesResponse struct {
	Services []ServiceSummary `json:"services"`
}

func (c *Controller) ListServices(
	ctx context.Context,
	orgID string,
	cloudProvider string,
	cloudAccountId *string,
) (*ListServicesResponse, *model.ApiError) {
	definitions, apiErr := services.List(cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list cloud services")
	}

	svcConfigs := map[string]*types.CloudServiceConfig{}
	if cloudAccountId != nil {
		activeAccount, apiErr := c.accountsRepo.getConnectedCloudAccount(
			ctx, orgID, cloudProvider, *cloudAccountId,
		)
		if apiErr != nil {
			return nil, model.WrapApiError(apiErr, "couldn't get active account")
		}
		svcConfigs, apiErr = c.serviceConfigRepo.getAllForAccount(
			ctx, orgID, activeAccount.ID.StringValue(),
		)
		if apiErr != nil {
			return nil, model.WrapApiError(
				apiErr, "couldn't get service configs for cloud account",
			)
		}
	}

	summaries := []ServiceSummary{}
	for _, def := range definitions {
		summary := ServiceSummary{
			Metadata: def.Metadata,
		}
		summary.Config = svcConfigs[summary.Id]

		summaries = append(summaries, summary)
	}

	return &ListServicesResponse{
		Services: summaries,
	}, nil
}

func (c *Controller) GetServiceDetails(
	ctx context.Context,
	orgID string,
	cloudProvider string,
	serviceId string,
	cloudAccountId *string,
) (*ServiceDetails, error) {
	definition, err := services.GetServiceDefinition(cloudProvider, serviceId)
	if err != nil {
		return nil, err
	}

	details := ServiceDetails{
		Definition: *definition,
	}

	if cloudAccountId != nil {

		activeAccount, apiErr := c.accountsRepo.getConnectedCloudAccount(
			ctx, orgID, cloudProvider, *cloudAccountId,
		)
		if apiErr != nil {
			return nil, model.WrapApiError(apiErr, "couldn't get active account")
		}

		config, apiErr := c.serviceConfigRepo.get(
			ctx, orgID, activeAccount.ID.StringValue(), serviceId,
		)
		if apiErr != nil && apiErr.Type() != model.ErrorNotFound {
			return nil, model.WrapApiError(apiErr, "couldn't fetch service config")
		}

		if config != nil {
			details.Config = config

			enabled := false
			if config.Metrics != nil && config.Metrics.Enabled {
				enabled = true
			}

			// add links to service dashboards, making them clickable.
			for i, d := range definition.Assets.Dashboards {
				dashboardUuid := c.dashboardUuid(
					cloudProvider, serviceId, d.Id,
				)
				if enabled {
					definition.Assets.Dashboards[i].Url = fmt.Sprintf("/dashboard/%s", dashboardUuid)
				} else {
					definition.Assets.Dashboards[i].Url = "" // to unset the in-memory URL if enabled once and disabled afterwards
				}
			}
		}
	}

	return &details, nil
}

type UpdateServiceConfigRequest struct {
	CloudAccountId string                   `json:"cloud_account_id"`
	Config         types.CloudServiceConfig `json:"config"`
}

func (u *UpdateServiceConfigRequest) Validate(def *services.Definition) error {
	if def.Id != services.S3Sync && u.Config.Logs != nil && u.Config.Logs.S3Buckets != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "s3 buckets can only be added to service-type[%s]", services.S3Sync)
	} else if def.Id == services.S3Sync && u.Config.Logs != nil && u.Config.Logs.S3Buckets != nil {
		for region := range u.Config.Logs.S3Buckets {
			if _, found := ValidAWSRegions[region]; !found {
				return errors.NewInvalidInputf(CodeInvalidCloudRegion, "invalid cloud region: %s", region)
			}
		}
	}

	return nil
}

type UpdateServiceConfigResponse struct {
	Id     string                   `json:"id"`
	Config types.CloudServiceConfig `json:"config"`
}

func (c *Controller) UpdateServiceConfig(
	ctx context.Context,
	orgID string,
	cloudProvider string,
	serviceType string,
	req *UpdateServiceConfigRequest,
) (*UpdateServiceConfigResponse, error) {
	// can only update config for a valid service.
	definition, err := services.GetServiceDefinition(cloudProvider, serviceType)
	if err != nil {
		return nil, err
	}

	if err := req.Validate(definition); err != nil {
		return nil, err
	}

	// can only update config for a connected cloud account id
	_, apiErr := c.accountsRepo.getConnectedCloudAccount(
		ctx, orgID, cloudProvider, req.CloudAccountId,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't find connected cloud account")
	}

	updatedConfig, apiErr := c.serviceConfigRepo.upsert(
		ctx, orgID, cloudProvider, req.CloudAccountId, serviceType, req.Config,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't update service config")
	}

	return &UpdateServiceConfigResponse{
		Id:     serviceType,
		Config: *updatedConfig,
	}, nil
}

// All dashboards that are available based on cloud integrations configuration
// across all cloud providers
func (c *Controller) AvailableDashboards(ctx context.Context, orgId valuer.UUID) ([]*dashboardtypes.Dashboard, *model.ApiError) {
	allDashboards := []*dashboardtypes.Dashboard{}

	for _, provider := range []string{"aws"} {
		providerDashboards, apiErr := c.AvailableDashboardsForCloudProvider(ctx, orgId, provider)
		if apiErr != nil {
			return nil, model.WrapApiError(
				apiErr, fmt.Sprintf("couldn't get available dashboards for %s", provider),
			)
		}

		allDashboards = append(allDashboards, providerDashboards...)
	}

	return allDashboards, nil
}

func (c *Controller) AvailableDashboardsForCloudProvider(ctx context.Context, orgID valuer.UUID, cloudProvider string) ([]*dashboardtypes.Dashboard, *model.ApiError) {
	accountRecords, apiErr := c.accountsRepo.listConnected(ctx, orgID.StringValue(), cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list connected cloud accounts")
	}

	// for v0, service dashboards are only available when metrics are enabled.
	servicesWithAvailableMetrics := map[string]*time.Time{}

	for _, ar := range accountRecords {
		if ar.AccountID != nil {
			configsBySvcId, apiErr := c.serviceConfigRepo.getAllForAccount(
				ctx, orgID.StringValue(), ar.ID.StringValue(),
			)
			if apiErr != nil {
				return nil, apiErr
			}

			for svcId, config := range configsBySvcId {
				if config.Metrics != nil && config.Metrics.Enabled {
					servicesWithAvailableMetrics[svcId] = &ar.CreatedAt
				}
			}
		}
	}

	allServices, apiErr := services.List(cloudProvider)
	if apiErr != nil {
		return nil, apiErr
	}

	svcDashboards := []*dashboardtypes.Dashboard{}
	for _, svc := range allServices {
		serviceDashboardsCreatedAt := servicesWithAvailableMetrics[svc.Id]
		if serviceDashboardsCreatedAt != nil {
			for _, d := range svc.Assets.Dashboards {
				author := fmt.Sprintf("%s-integration", cloudProvider)
				svcDashboards = append(svcDashboards, &dashboardtypes.Dashboard{
					ID:     c.dashboardUuid(cloudProvider, svc.Id, d.Id),
					Locked: true,
					Data:   *d.Definition,
					TimeAuditable: types.TimeAuditable{
						CreatedAt: *serviceDashboardsCreatedAt,
						UpdatedAt: *serviceDashboardsCreatedAt,
					},
					UserAuditable: types.UserAuditable{
						CreatedBy: author,
						UpdatedBy: author,
					},
					OrgID: orgID,
				})
			}
			servicesWithAvailableMetrics[svc.Id] = nil
		}
	}

	return svcDashboards, nil
}
func (c *Controller) GetDashboardById(ctx context.Context, orgId valuer.UUID, dashboardUuid string) (*dashboardtypes.Dashboard, *model.ApiError) {
	cloudProvider, _, _, apiErr := c.parseDashboardUuid(dashboardUuid)
	if apiErr != nil {
		return nil, apiErr
	}

	allDashboards, apiErr := c.AvailableDashboardsForCloudProvider(ctx, orgId, cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list available dashboards")
	}

	for _, d := range allDashboards {
		if d.ID == dashboardUuid {
			return d, nil
		}
	}

	return nil, model.NotFoundError(fmt.Errorf("couldn't find dashboard with uuid: %s", dashboardUuid))
}

func (c *Controller) dashboardUuid(
	cloudProvider string, svcId string, dashboardId string,
) string {
	return fmt.Sprintf("cloud-integration--%s--%s--%s", cloudProvider, svcId, dashboardId)
}

func (c *Controller) parseDashboardUuid(dashboardUuid string) (cloudProvider string, svcId string, dashboardId string, apiErr *model.ApiError) {
	parts := strings.SplitN(dashboardUuid, "--", 4)
	if len(parts) != 4 || parts[0] != "cloud-integration" {
		return "", "", "", model.BadRequest(fmt.Errorf("invalid cloud integration dashboard id"))
	}

	return parts[1], parts[2], parts[3], nil
}

func (c *Controller) IsCloudIntegrationDashboardUuid(dashboardUuid string) bool {
	_, _, _, apiErr := c.parseDashboardUuid(dashboardUuid)
	return apiErr == nil
}
