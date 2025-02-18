package cloudintegrations

import (
	"context"
	"fmt"
	"net/url"
	"slices"
	"strings"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/sqlstore"
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
	serviceConfigRepo serviceConfigRepository
}

func NewController(sqlStore sqlstore.SQLStore) (
	*Controller, error,
) {
	accountsRepo, err := newCloudProviderAccountsRepository(sqlStore.SQLxDB())
	if err != nil {
		return nil, fmt.Errorf("couldn't create cloud provider accounts repo: %w", err)
	}

	serviceConfigRepo, err := newServiceConfigRepository(sqlStore.SQLxDB())
	if err != nil {
		return nil, fmt.Errorf("couldn't create cloud provider service config repo: %w", err)
	}

	return &Controller{
		accountsRepo:      accountsRepo,
		serviceConfigRepo: serviceConfigRepo,
	}, nil
}

type Account struct {
	Id             string        `json:"id"`
	CloudAccountId string        `json:"cloud_account_id"`
	Config         AccountConfig `json:"config"`
	Status         AccountStatus `json:"status"`
}

type ConnectedAccountsListResponse struct {
	Accounts []Account `json:"accounts"`
}

func (c *Controller) ListConnectedAccounts(
	ctx context.Context, cloudProvider string,
) (
	*ConnectedAccountsListResponse, *model.ApiError,
) {
	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	accountRecords, apiErr := c.accountsRepo.listConnected(ctx, cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list cloud accounts")
	}

	connectedAccounts := []Account{}
	for _, a := range accountRecords {
		connectedAccounts = append(connectedAccounts, a.account())
	}

	return &ConnectedAccountsListResponse{
		Accounts: connectedAccounts,
	}, nil
}

type GenerateConnectionUrlRequest struct {
	// Optional. To be specified for updates.
	AccountId *string `json:"account_id,omitempty"`

	AccountConfig AccountConfig `json:"account_config"`

	AgentConfig SigNozAgentConfig `json:"agent_config"`
}

type SigNozAgentConfig struct {
	// The region in which SigNoz agent should be installed.
	Region string `json:"region"`

	IngestionUrl string `json:"ingestion_url"`
	IngestionKey string `json:"ingestion_key"`
	SigNozAPIUrl string `json:"signoz_api_url"`
	SigNozAPIKey string `json:"signoz_api_key"`
}

type GenerateConnectionUrlResponse struct {
	AccountId     string `json:"account_id"`
	ConnectionUrl string `json:"connection_url"`
}

func (c *Controller) GenerateConnectionUrl(
	ctx context.Context, cloudProvider string, req GenerateConnectionUrlRequest,
) (*GenerateConnectionUrlResponse, *model.ApiError) {
	// Account connection with a simple connection URL may not be available for all providers.
	if cloudProvider != "aws" {
		return nil, model.BadRequest(fmt.Errorf("unsupported cloud provider: %s", cloudProvider))
	}

	account, apiErr := c.accountsRepo.upsert(
		ctx, cloudProvider, req.AccountId, &req.AccountConfig, nil, nil, nil,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	}

	// TODO(Raj): parameterized this in follow up changes
	agentVersion := "0.0.1"

	connectionUrl := fmt.Sprintf(
		"https://%s.console.aws.amazon.com/cloudformation/home?region=%s#/stacks/quickcreate?",
		req.AgentConfig.Region, req.AgentConfig.Region,
	)

	for qp, value := range map[string]string{
		"param_SigNozIntegrationAgentVersion": agentVersion,
		"param_SigNozApiUrl":                  req.AgentConfig.SigNozAPIUrl,
		"param_SigNozApiKey":                  req.AgentConfig.SigNozAPIKey,
		"param_SigNozAccountId":               account.Id,
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

	return &GenerateConnectionUrlResponse{
		AccountId:     account.Id,
		ConnectionUrl: connectionUrl,
	}, nil
}

type AccountStatusResponse struct {
	Id             string        `json:"id"`
	CloudAccountId *string       `json:"cloud_account_id,omitempty"`
	Status         AccountStatus `json:"status"`
}

func (c *Controller) GetAccountStatus(
	ctx context.Context, cloudProvider string, accountId string,
) (
	*AccountStatusResponse, *model.ApiError,
) {
	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	account, apiErr := c.accountsRepo.get(ctx, cloudProvider, accountId)
	if apiErr != nil {
		return nil, apiErr
	}

	resp := AccountStatusResponse{
		Id:             account.Id,
		CloudAccountId: account.CloudAccountId,
		Status:         account.status(),
	}

	return &resp, nil
}

type AgentCheckInRequest struct {
	AccountId      string `json:"account_id"`
	CloudAccountId string `json:"cloud_account_id"`
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

	TelemetryCollectionStrategy *CloudTelemetryCollectionStrategy `json:"telemetry,omitempty"`
}

func (c *Controller) CheckInAsAgent(
	ctx context.Context, cloudProvider string, req AgentCheckInRequest,
) (*AgentCheckInResponse, *model.ApiError) {
	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	existingAccount, apiErr := c.accountsRepo.get(ctx, cloudProvider, req.AccountId)
	if existingAccount != nil && existingAccount.CloudAccountId != nil && *existingAccount.CloudAccountId != req.CloudAccountId {
		return nil, model.BadRequest(fmt.Errorf(
			"can't check in with new %s account id %s for account %s with existing %s id %s",
			cloudProvider, req.CloudAccountId, existingAccount.Id, cloudProvider, *existingAccount.CloudAccountId,
		))
	}

	existingAccount, apiErr = c.accountsRepo.getConnectedCloudAccount(ctx, cloudProvider, req.CloudAccountId)
	if existingAccount != nil && existingAccount.Id != req.AccountId {
		return nil, model.BadRequest(fmt.Errorf(
			"can't check in to %s account %s with id %s. already connected with id %s",
			cloudProvider, req.CloudAccountId, req.AccountId, existingAccount.Id,
		))
	}

	agentReport := AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            req.Data,
	}

	account, apiErr := c.accountsRepo.upsert(
		ctx, cloudProvider, &req.AccountId, nil, &req.CloudAccountId, &agentReport, nil,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	}

	// prepare and return integration config to be consumed by agent
	telemetryCollectionStrategy, err := NewCloudTelemetryCollectionStrategy(cloudProvider)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't init telemetry collection strategy: %w", err,
		))
	}

	agentConfig := IntegrationConfigForAgent{
		EnabledRegions:              []string{},
		TelemetryCollectionStrategy: telemetryCollectionStrategy,
	}

	if account.Config != nil && account.Config.EnabledRegions != nil {
		agentConfig.EnabledRegions = account.Config.EnabledRegions
	}

	services, apiErr := listCloudProviderServices(cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list cloud services")
	}
	svcDetailsById := map[string]*CloudServiceDetails{}
	for _, svcDetails := range services {
		svcDetailsById[svcDetails.Id] = &svcDetails
	}

	svcConfigs, apiErr := c.serviceConfigRepo.getAllForAccount(
		ctx, cloudProvider, *account.CloudAccountId,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "couldn't get service configs for cloud account",
		)
	}

	// accumulate config in a fixed order to ensure same config generated across runs
	configuredSvcIds := maps.Keys(svcConfigs)
	slices.Sort(configuredSvcIds)

	for _, svcId := range configuredSvcIds {
		svcDetails := svcDetailsById[svcId]
		svcConfig := svcConfigs[svcId]

		if svcDetails != nil {
			metricsEnabled := svcConfig.Metrics != nil && svcConfig.Metrics.Enabled
			logsEnabled := svcConfig.Logs != nil && svcConfig.Logs.Enabled
			if logsEnabled || metricsEnabled {
				err := agentConfig.TelemetryCollectionStrategy.AddServiceStrategy(
					svcDetails.TelemetryCollectionStrategy, logsEnabled, metricsEnabled,
				)
				if err != nil {
					return nil, model.InternalError(fmt.Errorf(
						"couldn't add service telemetry collection strategy: %w", err,
					))
				}
			}
		}
	}

	return &AgentCheckInResponse{
		AccountId:         account.Id,
		CloudAccountId:    *account.CloudAccountId,
		RemovedAt:         account.RemovedAt,
		IntegrationConfig: agentConfig,
	}, nil
}

type UpdateAccountConfigRequest struct {
	Config AccountConfig `json:"config"`
}

func (c *Controller) UpdateAccountConfig(
	ctx context.Context,
	cloudProvider string,
	accountId string,
	req UpdateAccountConfigRequest,
) (*Account, *model.ApiError) {
	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	accountRecord, apiErr := c.accountsRepo.upsert(
		ctx, cloudProvider, &accountId, &req.Config, nil, nil, nil,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	}

	account := accountRecord.account()

	return &account, nil
}

func (c *Controller) DisconnectAccount(
	ctx context.Context, cloudProvider string, accountId string,
) (*AccountRecord, *model.ApiError) {
	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	account, apiErr := c.accountsRepo.get(ctx, cloudProvider, accountId)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't disconnect account")
	}

	tsNow := time.Now()
	account, apiErr = c.accountsRepo.upsert(
		ctx, cloudProvider, &accountId, nil, nil, nil, &tsNow,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't disconnect account")
	}

	return account, nil
}

type ListServicesResponse struct {
	Services []CloudServiceSummary `json:"services"`
}

func (c *Controller) ListServices(
	ctx context.Context,
	cloudProvider string,
	cloudAccountId *string,
) (*ListServicesResponse, *model.ApiError) {

	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	services, apiErr := listCloudProviderServices(cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list cloud services")
	}

	svcConfigs := map[string]*CloudServiceConfig{}
	if cloudAccountId != nil {
		svcConfigs, apiErr = c.serviceConfigRepo.getAllForAccount(
			ctx, cloudProvider, *cloudAccountId,
		)
		if apiErr != nil {
			return nil, model.WrapApiError(
				apiErr, "couldn't get service configs for cloud account",
			)
		}
	}

	summaries := []CloudServiceSummary{}
	for _, s := range services {
		summary := s.CloudServiceSummary
		summary.Config = svcConfigs[summary.Id]

		summaries = append(summaries, summary)
	}

	return &ListServicesResponse{
		Services: summaries,
	}, nil
}

func (c *Controller) GetServiceDetails(
	ctx context.Context,
	cloudProvider string,
	serviceId string,
	cloudAccountId *string,
) (*CloudServiceDetails, *model.ApiError) {

	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	service, apiErr := getCloudProviderService(cloudProvider, serviceId)
	if apiErr != nil {
		return nil, apiErr
	}

	if cloudAccountId != nil {
		config, apiErr := c.serviceConfigRepo.get(
			ctx, cloudProvider, *cloudAccountId, serviceId,
		)
		if apiErr != nil && apiErr.Type() != model.ErrorNotFound {
			return nil, model.WrapApiError(apiErr, "couldn't fetch service config")
		}

		if config != nil {
			service.Config = config

			if config.Metrics != nil && config.Metrics.Enabled {
				// add links to service dashboards, making them clickable.
				for i, d := range service.Assets.Dashboards {
					dashboardUuid := c.dashboardUuid(
						cloudProvider, serviceId, d.Id,
					)
					service.Assets.Dashboards[i].Url = fmt.Sprintf(
						"/dashboard/%s", dashboardUuid,
					)
				}
			}
		}
	}

	return service, nil
}

type UpdateServiceConfigRequest struct {
	CloudAccountId string             `json:"cloud_account_id"`
	Config         CloudServiceConfig `json:"config"`
}

type UpdateServiceConfigResponse struct {
	Id     string             `json:"id"`
	Config CloudServiceConfig `json:"config"`
}

func (c *Controller) UpdateServiceConfig(
	ctx context.Context,
	cloudProvider string,
	serviceId string,
	req UpdateServiceConfigRequest,
) (*UpdateServiceConfigResponse, *model.ApiError) {

	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	// can only update config for a connected cloud account id
	_, apiErr := c.accountsRepo.getConnectedCloudAccount(
		ctx, cloudProvider, req.CloudAccountId,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't find connected cloud account")
	}

	// can only update config for a valid service.
	_, apiErr = getCloudProviderService(cloudProvider, serviceId)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "unsupported service")
	}

	updatedConfig, apiErr := c.serviceConfigRepo.upsert(
		ctx, cloudProvider, req.CloudAccountId, serviceId, req.Config,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't update service config")
	}

	return &UpdateServiceConfigResponse{
		Id:     serviceId,
		Config: *updatedConfig,
	}, nil
}

// All dashboards that are available based on cloud integrations configuration
// across all cloud providers
func (c *Controller) AvailableDashboards(ctx context.Context) (
	[]dashboards.Dashboard, *model.ApiError,
) {
	allDashboards := []dashboards.Dashboard{}

	for _, provider := range []string{"aws"} {
		providerDashboards, apiErr := c.AvailableDashboardsForCloudProvider(ctx, provider)
		if apiErr != nil {
			return nil, model.WrapApiError(
				apiErr, fmt.Sprintf("couldn't get available dashboards for %s", provider),
			)
		}

		allDashboards = append(allDashboards, providerDashboards...)
	}

	return allDashboards, nil
}

func (c *Controller) AvailableDashboardsForCloudProvider(
	ctx context.Context, cloudProvider string,
) ([]dashboards.Dashboard, *model.ApiError) {

	accountRecords, apiErr := c.accountsRepo.listConnected(ctx, cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list connected cloud accounts")
	}

	// for v0, service dashboards are only available when metrics are enabled.
	servicesWithAvailableMetrics := map[string]*time.Time{}

	for _, ar := range accountRecords {
		if ar.CloudAccountId != nil {
			configsBySvcId, apiErr := c.serviceConfigRepo.getAllForAccount(
				ctx, cloudProvider, *ar.CloudAccountId,
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

	allServices, apiErr := listCloudProviderServices(cloudProvider)
	if apiErr != nil {
		return nil, apiErr
	}

	svcDashboards := []dashboards.Dashboard{}
	for _, svc := range allServices {
		serviceDashboardsCreatedAt := servicesWithAvailableMetrics[svc.Id]
		if serviceDashboardsCreatedAt != nil {
			for _, d := range svc.Assets.Dashboards {
				isLocked := 1
				author := fmt.Sprintf("%s-integration", cloudProvider)
				svcDashboards = append(svcDashboards, dashboards.Dashboard{
					Uuid:      c.dashboardUuid(cloudProvider, svc.Id, d.Id),
					Locked:    &isLocked,
					Data:      *d.Definition,
					CreatedAt: *serviceDashboardsCreatedAt,
					CreateBy:  &author,
					UpdatedAt: *serviceDashboardsCreatedAt,
					UpdateBy:  &author,
				})
			}
			servicesWithAvailableMetrics[svc.Id] = nil
		}
	}

	return svcDashboards, nil
}
func (c *Controller) GetDashboardById(
	ctx context.Context,
	dashboardUuid string,
) (*dashboards.Dashboard, *model.ApiError) {
	cloudProvider, _, _, apiErr := c.parseDashboardUuid(dashboardUuid)
	if apiErr != nil {
		return nil, apiErr
	}

	allDashboards, apiErr := c.AvailableDashboardsForCloudProvider(ctx, cloudProvider)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, fmt.Sprintf("couldn't list available dashboards"),
		)
	}

	for _, d := range allDashboards {
		if d.Uuid == dashboardUuid {
			return &d, nil
		}
	}

	return nil, model.NotFoundError(fmt.Errorf(
		"couldn't find dashboard with uuid: %s", dashboardUuid,
	))
}

func (c *Controller) dashboardUuid(
	cloudProvider string, svcId string, dashboardId string,
) string {
	return fmt.Sprintf(
		"cloud-integration--%s--%s--%s", cloudProvider, svcId, dashboardId,
	)
}

func (c *Controller) parseDashboardUuid(dashboardUuid string) (
	cloudProvider string, svcId string, dashboardId string, apiErr *model.ApiError,
) {
	parts := strings.SplitN(dashboardUuid, "--", 4)
	if len(parts) != 4 || parts[0] != "cloud-integration" {
		return "", "", "", model.BadRequest(fmt.Errorf(
			"invalid cloud integration dashboard id",
		))
	}

	return parts[1], parts[2], parts[3], nil
}

func (c *Controller) IsCloudIntegrationDashboardUuid(dashboardUuid string) bool {
	_, _, _, apiErr := c.parseDashboardUuid(dashboardUuid)
	return apiErr == nil
}
