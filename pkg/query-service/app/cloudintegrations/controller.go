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

	accounts, apiErr := c.repo.listConnectedAccounts(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't list cloud accounts")
	}

	return &AccountsListResponse{
		Accounts: accounts,
	}, nil
}

type UpsertAccountRequest struct {
	AccountConfig CloudAccountConfig `json:"account_config"`
	// Optional. To be specified for updates.
	AccountId string `json:"account_id,omitempty"`
}

type CloudAccountConfig struct {
	EnabledRegions []string `json:"regions"`
}

func (c *Controller) UpsertAccount(
	ctx context.Context, cloudProvider string, req UpsertAccountRequest,
) (
	Account, *model.ApiError,
) {
	var account Account
	return account, nil
}

type GenerateConnectionUrlRequest struct {
	UpsertAccountRequest

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

	account, apiErr := c.UpsertAccount(ctx, cloudProvider, req.UpsertAccountRequest)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	}

	return &GenerateConnectionUrlResponse{
		AccountId:     account.Id,
		ConnectionUrl: "",
	}, nil
}
