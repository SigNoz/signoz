package cloudintegrations

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func TestAvailableServices(t *testing.T) {
	require := require.New(t)

	// should be able to list available services.
	_, apiErr := listCloudProviderServices(
		context.TODO(), "bad-cloud-provider",
	)
	require.NotNil(apiErr)
	require.Equal(model.ErrorNotFound, apiErr.Type())

	awsSvcs, apiErr := listCloudProviderServices(
		context.TODO(), "aws",
	)
	require.Nil(apiErr)
	require.Greater(len(awsSvcs), 0)

	// should be able to get details of a service
	_, apiErr = getCloudProviderService(
		context.TODO(), "aws", "bad-service-id",
	)
	require.NotNil(apiErr)
	require.Equal(model.ErrorNotFound, apiErr.Type())

	svc, apiErr := getCloudProviderService(
		context.TODO(), "aws", awsSvcs[0].Id,
	)
	require.Nil(apiErr)
	require.Equal(svc, awsSvcs[0])
}
