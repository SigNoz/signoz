package implcloudintegration

import (
	"context"

	citypes "github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

type definitionStore struct{}

func NewDefinitionStore() citypes.ServiceDefinitionStore {
	return &definitionStore{}
}

func (d *definitionStore) Get(ctx context.Context, provider citypes.CloudProviderType, serviceID citypes.ServiceID) (*citypes.ServiceDefinition, error) {
	panic("unimplemented")
}

func (d *definitionStore) List(ctx context.Context, provider citypes.CloudProviderType) ([]*citypes.ServiceDefinition, error) {
	panic("unimplemented")
}
