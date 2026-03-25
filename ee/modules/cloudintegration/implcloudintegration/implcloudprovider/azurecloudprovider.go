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
