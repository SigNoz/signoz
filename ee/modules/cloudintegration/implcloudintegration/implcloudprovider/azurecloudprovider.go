package implcloudprovider

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

type azurecloudprovider struct{}

func NewAzureCloudProvider() cloudintegration.CloudProviderModule {
	return &azurecloudprovider{}
}

func (provider *azurecloudprovider) GetConnectionArtifact(ctx context.Context, creds *cloudintegrationtypes.SignozCredentials, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.ConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) ListServiceDefinitions(ctx context.Context) ([]*cloudintegrationtypes.ServiceDefinition, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) GetServiceDefinition(ctx context.Context, serviceID cloudintegrationtypes.ServiceID) (*cloudintegrationtypes.ServiceDefinition, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) StorableConfigFromServiceConfig(ctx context.Context, cfg *cloudintegrationtypes.ServiceConfig, supported cloudintegrationtypes.SupportedSignals) (string, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) ServiceConfigFromStorableServiceConfig(ctx context.Context, config string) (*cloudintegrationtypes.ServiceConfig, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) IsServiceEnabled(ctx context.Context, config *cloudintegrationtypes.ServiceConfig) bool {
	panic("implement me")
}

func (provider *azurecloudprovider) IsMetricsEnabled(ctx context.Context, config *cloudintegrationtypes.ServiceConfig) bool {
	panic("implement me")
}

func (provider *azurecloudprovider) BuildIntegrationConfig(
	ctx context.Context,
	account *cloudintegrationtypes.Account,
	services []*cloudintegrationtypes.StorableCloudIntegrationService,
) (*cloudintegrationtypes.ProviderIntegrationConfig, error) {
	panic("implement me")
}
