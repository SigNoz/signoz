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
		return nil, fmt.Errorf("couldn't create cloud provider accounts repo", err)
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
