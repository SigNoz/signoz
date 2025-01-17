package cloudintegrations

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
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

func NewController(db *sqlx.DB) (
	*Controller, error,
) {
	accountsRepo, err := newCloudProviderAccountsRepository(db)
	if err != nil {
		return nil, fmt.Errorf("couldn't create cloud provider accounts repo: %w", err)
	}

	serviceConfigRepo, err := newServiceConfigRepository(db)
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

	// TODO(Raj): Add actual cloudformation template for AWS integration after it has been shipped.
	connectionUrl := fmt.Sprintf(
		"https://%s.console.aws.amazon.com/cloudformation/home?region=%s#/stacks/quickcreate?stackName=SigNozIntegration/",
		req.AgentConfig.Region, req.AgentConfig.Region,
	)

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
	Account AccountRecord `json:"account"`
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

	return &AgentCheckInResponse{
		Account: *account,
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
