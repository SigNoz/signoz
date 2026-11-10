package implcloudintegration

import (
	"context"
	"testing"

	citypes "github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServiceDefinitionsAreValid(t *testing.T) {
	store := NewServiceDefinitionStore()

	for _, provider := range []citypes.CloudProviderType{
		citypes.CloudProviderTypeAWS,
		citypes.CloudProviderTypeAzure,
		citypes.CloudProviderTypeGCP,
	} {
		t.Run(provider.StringValue(), func(t *testing.T) {
			defs, err := store.List(context.Background(), provider)
			require.NoError(t, err, "all embedded definitions must load and validate")
			require.NotEmpty(t, defs, "provider should ship at least one service definition")

			for _, def := range defs {
				assert.NotEmpty(t, def.ID, "service definition must have an id")
				assert.NotEmpty(t, def.Title, "service %q must have a title", def.ID)

				// Get() must agree with List() for every service it advertises.
				serviceID, err := citypes.NewServiceID(provider, def.ID)
				if !assert.NoError(t, err, "service id %q must be registered in serviceid.go", def.ID) {
					continue
				}
				got, err := store.Get(context.Background(), provider, serviceID)
				require.NoError(t, err, "service %q listed but not gettable", def.ID)
				assert.Equal(t, def.ID, got.ID)
			}
		})
	}
}
