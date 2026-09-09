package alertmanagerserver

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewDispatcherMetrics_RegisterLimitMetricsWhenFlagIsTrue(t *testing.T) {
	registry := prometheus.NewRegistry()

	metrics := NewDispatcherMetrics(true, registry)

	require.NotNil(t, metrics)
	require.NotNil(t, metrics.aggrGroups)
	require.NotNil(t, metrics.processingDuration)
	require.NotNil(t, metrics.aggrGroupLimitReached)

	metricFamilies, err := registry.Gather()
	require.NoError(t, err)

	assert.Len(t, metricFamilies, 3)
}

func TestNewDispatcherMetrics_OmitMetricsWhenLimitIsReached(t *testing.T) {
	registry := prometheus.NewRegistry()

	metrics := NewDispatcherMetrics(false, registry)
	require.NotNil(t, metrics)

	metricFamilies, err := registry.Gather()
	require.NoError(t, err)

	names := make([]string, 0, len(metricFamilies))
	for _, mf := range metricFamilies {
		names = append(names, mf.GetName())
	}

	assert.Contains(t, names, "signoz_alertmanager_dispatcher_aggregation_groups")
	assert.Contains(t, names, "signoz_alertmanager_dispatcher_alert_processing_duration_seconds")
	assert.NotContains(t, names, "signoz_alertmanager_dispatcher_aggregation_group_limit_reached_total")
}

func TestNewDispatcherMetrics_HandleNilRegistryGracefull(t *testing.T) {
	assert.NotPanics(t, func() {
		metrics := NewDispatcherMetrics(true, nil)
		assert.NotNil(t, metrics)
	})
}
