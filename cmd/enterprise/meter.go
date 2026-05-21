package main

import (
	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
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
			DBName:               telemetrylogs.DBName,
			TableName:            telemetrylogs.LogsV2LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultLogsRetentionDays,
		},
	},
	{
		Provider: metercollector.ProviderTelemetry,
		Telemetry: metercollector.TelemetryConfig{
			Name:                 zeustypes.MeterSpanSize,
			Unit:                 zeustypes.MeterUnitBytes,
			Aggregation:          zeustypes.MeterAggregationSum,
			DBName:               telemetrytraces.DBName,
			TableName:            telemetrytraces.SpanIndexV3LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultTracesRetentionDays,
		},
	},
	{
		Provider: metercollector.ProviderTelemetry,
		Telemetry: metercollector.TelemetryConfig{
			Name:                 zeustypes.MeterDatapointCount,
			Unit:                 zeustypes.MeterUnitCount,
			Aggregation:          zeustypes.MeterAggregationSum,
			DBName:               telemetrymetrics.DBName,
			TableName:            telemetrymetrics.SamplesV4LocalTableName,
			DefaultRetentionDays: retentiontypes.DefaultMetricsRetentionDays,
		},
	},
}
