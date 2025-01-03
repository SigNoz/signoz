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
	db *sqlx.DB
}

func NewController(db *sqlx.DB) (
	*Controller, error,
) {
	return &Controller{
		db: db,
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

	return &AccountsListResponse{
		Accounts: []Account{},
	}, nil
}
