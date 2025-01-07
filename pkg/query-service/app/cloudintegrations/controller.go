package cloudintegrations

import (
	"context"
	"fmt"
	"slices"

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
	repo cloudProviderAccountsRepository
}

func NewController(db *sqlx.DB) (
	*Controller, error,
) {
	repo, err := newCloudProviderAccountsRepository(db)
	if err != nil {
		return nil, fmt.Errorf("couldn't create cloud provider accounts repo: %w", err)
	}

	return &Controller{
		repo: repo,
	}, nil
}

type AccountsListResponse struct {
	Accounts []Account `json:"accounts"`
}

func (c *Controller) ListConnectedAccounts(
	ctx context.Context, cloudProvider string,
) (
	*AccountsListResponse, *model.ApiError,
) {
	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	accounts, apiErr := c.repo.listConnected(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list cloud accounts")
	}

	return &AccountsListResponse{
		Accounts: accounts,
	}, nil
}

type GenerateConnectionUrlRequest struct {
	// Optional. To be specified for updates.
	AccountId *string `json:"account_id,omitempty"`

	AccountConfig AccountConfig `json:"account_config"`

	AgentConfig SigNozAgentConfig `json:"agent_config"`
}

type SigNozAgentConfig struct {
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

	account, apiErr := c.repo.upsert(
		ctx, req.AccountId, &req.AccountConfig, nil, nil, nil,
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
	Id     string        `json:"id"`
	Status AccountStatus `json:"status"`
}

type AccountStatus struct {
	Integration AccountIntegrationStatus `json:"integration"`
}

type AccountIntegrationStatus struct {
	LastHeartbeatTsMillis *int64 `json:"last_heartbeat_ts_ms"`
}

func (c *Controller) GetAccountStatus(
	ctx context.Context, cloudProvider string, accountId string,
) (
	*AccountStatusResponse, *model.ApiError,
) {
	if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
		return nil, apiErr
	}

	account, apiErr := c.repo.get(ctx, accountId)
	if apiErr != nil {
		return nil, apiErr
	}

	return &AccountStatusResponse{
		Id: account.Id,
		Status: AccountStatus{
			Integration: AccountIntegrationStatus{
				LastHeartbeatTsMillis: nil,
			},
		},
	}, nil
}
