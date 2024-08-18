package instrumentation

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
)

func TestResourceServiceNameAndDeploymentEnvironment(t *testing.T) {
	ctx := context.Background()
	os.Setenv("OTEL_SERVICE_NAME", "test:go")
	os.Setenv("OTEL_RESOURCE_ATTRIBUTES", "deployment.environment=testing")

	resource, err := New(ctx, Config{})
	require.NoError(t, err)

	assert.Equal(t, "test:go", resource.ServiceName())
	assert.Equal(t, "testing", resource.DeploymentEnvironment())
}

func TestResourceInitMeteringEnabled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	resource := &Resource{sdkresource.Empty(), Config{Metering: true}, "", ""}

	shutdown, err := resource.InitMetering(ctx)
	require.NoError(t, err)

	cancel()
	err = shutdown(ctx)
	assert.EqualError(t, err, "failed to upload metrics: context canceled")
}

func TestResourceInitTracingEnabled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	resource := &Resource{sdkresource.Empty(), Config{Tracing: true}, "", ""}

	shutdown, err := resource.InitTracing(ctx)
	require.NoError(t, err)

	cancel()
	err = shutdown(ctx)
	assert.EqualError(t, err, "context canceled")
}
