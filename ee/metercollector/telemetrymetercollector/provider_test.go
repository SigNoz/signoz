package telemetrymetercollector

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildDimensions(t *testing.T) {
	orgID := valuer.GenerateUUID()

	testCases := []struct {
		name          string
		retentionDays int
		expected      map[string]string
	}{
		{
			name:          "DefaultRetention",
			retentionDays: 30,
			expected: map[string]string{
				"signoz.organization.id":     orgID.StringValue(),
				"signoz.retention.duration": "30",
			},
		},
		{
			name:          "CustomRetention",
			retentionDays: 7,
			expected: map[string]string{
				"signoz.organization.id":     orgID.StringValue(),
				"signoz.retention.duration": "7",
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, buildDimensions(orgID, testCase.retentionDays))
		})
	}
}

func TestBuildQueryGroupsOnlyByRetentionDays(t *testing.T) {
	slice := retentiontypes.Slice{
		StartMs:     1,
		EndMs:       2,
		DefaultDays: 30,
		Rules: []retentiontypes.CustomRetentionRule{{
			Filters: []retentiontypes.FilterCondition{
				{Key: "signoz.workspace.key.id", Values: []string{"workspace-1"}},
				{Key: "service.name", Values: []string{"api"}},
			},
			TTLDays: 7,
		}},
	}

	testCases := []zeustypes.MeterName{
		zeustypes.MeterLogSize,
		zeustypes.MeterSpanSize,
		zeustypes.MeterDatapointCount,
	}

	for _, name := range testCases {
		t.Run(name.String(), func(t *testing.T) {
			query, args, err := buildQuery(name.String(), slice)
			require.NoError(t, err)
			assert.NotEmpty(t, args)
			assert.Contains(t, query, "signoz_meter")
			assert.Contains(t, query, "GROUP BY retention_days")
			assert.NotContains(t, query, "retention_rule_index")
		})
	}
}

func TestBuildOriginQuery(t *testing.T) {
	testCases := []zeustypes.MeterName{
		zeustypes.MeterLogSize,
		zeustypes.MeterSpanSize,
		zeustypes.MeterDatapointCount,
	}

	for _, name := range testCases {
		t.Run(name.String(), func(t *testing.T) {
			query, args := buildOriginQuery(name.String())
			assert.Contains(t, query, "signoz_meter")
			assert.Contains(t, query, "min(unix_milli)")
			assert.NotContains(t, query, "GROUP BY")
			require.Len(t, args, 1)
			assert.Equal(t, name.String(), args[0])
		})
	}
}

func TestProviderMetadata(t *testing.T) {
	testCases := []metercollector.TelemetryConfig{
		{
			Name:                 zeustypes.MeterLogSize,
			Unit:                 zeustypes.MeterUnitBytes,
			Aggregation:          zeustypes.MeterAggregationSum,
			DBName:               telemetrylogs.DBName,
			TableName:            telemetrylogs.LogsV2LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultLogsRetentionDays,
		},
		{
			Name:                 zeustypes.MeterSpanSize,
			Unit:                 zeustypes.MeterUnitBytes,
			Aggregation:          zeustypes.MeterAggregationSum,
			DBName:               telemetrytraces.DBName,
			TableName:            telemetrytraces.SpanIndexV3LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultTracesRetentionDays,
		},
		{
			Name:                 zeustypes.MeterDatapointCount,
			Unit:                 zeustypes.MeterUnitCount,
			Aggregation:          zeustypes.MeterAggregationSum,
			DBName:               telemetrymetrics.DBName,
			TableName:            telemetrymetrics.SamplesV4LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultMetricsRetentionDays,
		},
	}

	for _, config := range testCases {
		t.Run(config.Name.String(), func(t *testing.T) {
			provider := &Provider{config: config}
			assert.Equal(t, config.Name, provider.Name())
			assert.Equal(t, config.Unit, provider.Unit())
			assert.Equal(t, config.Aggregation, provider.Aggregation())
		})
	}
}

func TestTelemetryConfigValidate(t *testing.T) {
	base := metercollector.TelemetryConfig{
		Name:                 zeustypes.MeterLogSize,
		Unit:                 zeustypes.MeterUnitBytes,
		Aggregation:          zeustypes.MeterAggregationSum,
		DBName:               "signoz_logs",
		TableName:            "logs_v2",
		DefaultRetentionDays: 30,
	}

	testCases := []struct {
		name         string
		mutate       func(*metercollector.TelemetryConfig)
		expectErr    bool
	}{
		{name: "Valid", mutate: func(*metercollector.TelemetryConfig) {}, expectErr: false},
		{name: "ZeroName", mutate: func(c *metercollector.TelemetryConfig) { c.Name = zeustypes.MeterName{} }, expectErr: true},
		{name: "EmptyDBName", mutate: func(c *metercollector.TelemetryConfig) { c.DBName = "" }, expectErr: true},
		{name: "EmptyTableName", mutate: func(c *metercollector.TelemetryConfig) { c.TableName = "" }, expectErr: true},
		{name: "ZeroDefaultRetention", mutate: func(c *metercollector.TelemetryConfig) { c.DefaultRetentionDays = 0 }, expectErr: true},
		{name: "NegativeDefaultRetention", mutate: func(c *metercollector.TelemetryConfig) { c.DefaultRetentionDays = -1 }, expectErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			config := base
			testCase.mutate(&config)
			err := config.Validate()
			if testCase.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
