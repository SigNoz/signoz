package telemetrymetadata

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetadataStore_TemporalityCacheIntegration(t *testing.T) {
	// Test that metadata store works without cache
	metaStore := NewTelemetryMetaStore(
		instrumentationtest.New().ToProviderSettings(),
		nil, // telemetrystore
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		nil, // No cache
	)

	store, ok := metaStore.(*telemetryMetaStore)
	require.True(t, ok)
	assert.Nil(t, store.temporalityCache, "Should not have cache when none provided")
}

