package telemetrystorehook

import (
	"context"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

func TestSettingsBeforeQuery_AddsToEventSettings(t *testing.T) {
	config := telemetrystore.Config{Clickhouse: telemetrystore.ClickhouseConfig{QuerySettings: telemetrystore.QuerySettings{MaxExecutionTime: 55, MaxBytesToRead: 1000}}}
	hook, err := NewSettings(context.Background(), factorytest.NewSettings(), config)
	require.NoError(t, err)

	event := telemetrystore.NewQueryEvent("SELECT 1", nil)
	event.Settings["max_threads"] = 4

	hook.BeforeQuery(context.Background(), event)

	assert.Equal(t, 55, event.Settings["max_execution_time"])
	assert.Equal(t, 1000, event.Settings["max_bytes_to_read"])
	assert.Equal(t, 4, event.Settings["max_threads"])
	assert.Contains(t, event.Settings, "log_comment")
	assert.NotContains(t, event.Settings, "profile")
	assert.IsType(t, clickhouse.Settings{}, event.Settings)
}
