package implcloudprovider

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

type gcpcloudprovider struct {
	serviceDefinitions cloudintegrationtypes.ServiceDefinitionStore
}

func NewGCPCloudProvider(defStore cloudintegrationtypes.ServiceDefinitionStore) cloudintegration.CloudProviderModule {
	return &gcpcloudprovider{
		serviceDefinitions: defStore,
	}
}

func (g *gcpcloudprovider) BuildIntegrationConfig(ctx context.Context, account *cloudintegrationtypes.Account, services []*cloudintegrationtypes.StorableCloudIntegrationService) (*cloudintegrationtypes.ProviderIntegrationConfig, error) {
	// for manual flow we don't have any integration config to return, so returning empty config for now.
	return &cloudintegrationtypes.ProviderIntegrationConfig{}, nil
}

func (g *gcpcloudprovider) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.GetConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	// for manual flow we don't have any connection artifact to return, so returning empty artifact for now.
	return &cloudintegrationtypes.ConnectionArtifact{}, nil
}

func (g *gcpcloudprovider) GetServiceDefinition(ctx context.Context, serviceID cloudintegrationtypes.ServiceID) (*cloudintegrationtypes.ServiceDefinition, error) {
	return g.serviceDefinitions.Get(ctx, cloudintegrationtypes.CloudProviderTypeGCP, serviceID)
}

func (g *gcpcloudprovider) ListServiceDefinitions(ctx context.Context) ([]*cloudintegrationtypes.ServiceDefinition, error) {
	return g.serviceDefinitions.List(ctx, cloudintegrationtypes.CloudProviderTypeGCP)
}
