package main

import (
	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
)

var meterConfigs = []metercollector.Config{
	{
		Provider: metercollector.ProviderStatic,
		Static: metercollector.StaticConfig{
			Name:        zeustypes.MeterPlatformActive,
			Unit:        zeustypes.MeterUnitCount,
			Aggregation: zeustypes.MeterAggregationMax,
			Value:       1,
		},
	},
	{
		Provider: metercollector.ProviderTelemetry,
		Telemetry: metercollector.TelemetryConfig{
			Name:                 zeustypes.MeterLogSize,
			Unit:                 zeustypes.MeterUnitBytes,
			Aggregation:          zeustypes.MeterAggregationSum,
			DBName:               logstelemetryschema.DBName,
			TableName:            logstelemetryschema.LogsV2LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultLogsRetentionDays,
		},
	},
	{
		Provider: metercollector.ProviderTelemetry,
		Telemetry: metercollector.TelemetryConfig{
			Name:                 zeustypes.MeterSpanSize,
			Unit:                 zeustypes.MeterUnitBytes,
			Aggregation:          zeustypes.MeterAggregationSum,
			DBName:               tracestelemetryschema.DBName,
			TableName:            tracestelemetryschema.SpanIndexV3LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultTracesRetentionDays,
		},
	},
	{
		Provider: metercollector.ProviderTelemetry,
		Telemetry: metercollector.TelemetryConfig{
			Name:                 zeustypes.MeterDatapointCount,
			Unit:                 zeustypes.MeterUnitCount,
			Aggregation:          zeustypes.MeterAggregationSum,
			DBName:               metricstelemetryschema.DBName,
			TableName:            metricstelemetryschema.SamplesV4LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultMetricsRetentionDays,
		},
	},
}
