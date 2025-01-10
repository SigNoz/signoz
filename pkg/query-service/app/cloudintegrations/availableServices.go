package cloudintegrations

import (
	"context"
	"embed"
	"fmt"

	"go.signoz.io/signoz/pkg/query-service/model"
)

// Service details read from ./services
// { "providerName": { "service_id": {...}} }
var availableServices map[string]map[string]CloudServiceDetails

//go:embed services/*
var serviceDefinitionFiles embed.FS

func init() {
	availableServices = map[string]map[string]CloudServiceDetails{}
}

func listCloudProviderServices(
	ctx context.Context, cloudProvider string,
) ([]CloudServiceDetails, *model.ApiError) {
	return []CloudServiceDetails{}, nil
}

func getCloudProviderService(
	ctx context.Context, cloudProvider string, serviceId string,
) (*CloudServiceDetails, *model.ApiError) {
	return nil, model.NotFoundError(fmt.Errorf("%s service not found: %s", cloudProvider, serviceId))
}
