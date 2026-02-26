package implcloudintegrations

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
)

type module struct {
	store     integrationtypes.Store
	providers map[integrationtypes.CloudProviderType]cloudintegrations.CloudProvider
}

func NewModule(store integrationtypes.Store, providers map[integrationtypes.CloudProviderType]cloudintegrations.CloudProvider) cloudintegrations.Module {
	return &module{store: store}
}

func (m *module) ListServices(ctx context.Context, orgID string, cloudProvider string, cloudAccountId *string) (any, error) {

	provider, err := m.getProvider(cloudProvider)
	if err != nil {
		return nil, err
	}

	return provider.ListServices(ctx, orgID, cloudAccountId)
}

func (m *module) getProvider(cloudProvider integrationtypes.CloudProviderType) (cloudintegrations.CloudProvider, error) {
	provider, ok := m.providers[cloudProvider]
	if !ok {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid cloud provider: %s", cloudProvider)
	}
	return provider, nil
}
