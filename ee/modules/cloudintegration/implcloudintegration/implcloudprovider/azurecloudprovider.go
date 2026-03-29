package implcloudprovider

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
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

func (provider *azurecloudprovider) ListServiceDefinitions() ([]cloudintegrationtypes.ServiceDefinition, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) GetServiceDefinition(serviceID cloudintegrationtypes.ServiceID) (*cloudintegrationtypes.ServiceDefinition, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) StorableConfigFromServiceConfig(cfg *cloudintegrationtypes.ServiceConfig, supported cloudintegrationtypes.SupportedSignals) (string, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) ServiceConfigFromStorableServiceConfig(config string) (*cloudintegrationtypes.ServiceConfig, error) {
	panic("implement me")
}

func (provider *azurecloudprovider) IsServiceEnabled(config *cloudintegrationtypes.ServiceConfig) bool {
	panic("implement me")
}

func (provider *azurecloudprovider) IsMetricsEnabled(config *cloudintegrationtypes.ServiceConfig) bool {
	panic("implement me")
}

func (provider *azurecloudprovider) BuildIntegrationConfig(
	account *cloudintegrationtypes.Account,
	services []*cloudintegrationtypes.StorableCloudIntegrationService,
) (*cloudintegrationtypes.ProviderIntegrationConfig, error) {
	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "azure cloud provider is not supported")
}
