package services

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/stretchr/testify/require"
)

func TestAvailableServices(t *testing.T) {
	require := require.New(t)

	// should be able to list available services.
	_, apiErr := List("bad-cloud-provider")
	require.NotNil(apiErr)
	require.Equal(model.ErrorNotFound, apiErr.Type())

	awsSvcs, apiErr := List("aws")
	require.Nil(apiErr)
	require.Greater(len(awsSvcs), 0)

	// should be able to get details of a service
	_, err := GetServiceDefinition(
		"aws", "bad-service-id",
	)
	require.NotNil(err)
	require.True(errors.Ast(err, errors.TypeNotFound))

	svc, err := GetServiceDefinition(
		"aws", awsSvcs[0].Id,
	)
	require.Nil(err)
	require.Equal(*svc, awsSvcs[0])
}
