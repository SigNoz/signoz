package main

import (
	"context"

	"github.com/SigNoz/signoz/ee/metercollector/staticmetercollector"
	"github.com/SigNoz/signoz/ee/metercollector/telemetrymetercollector"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/modules/retention"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
)

func newMeterCollectors(
	ctx context.Context,
	providerSettings factory.ProviderSettings,
	telemetryStore telemetrystore.TelemetryStore,
	retentionGetter retention.Getter,
) (map[zeustypes.MeterName]metercollector.MeterCollector, error) {
	staticFactory := staticmetercollector.New()
	telemetryFactory := telemetrymetercollector.New(telemetryStore, retentionGetter)

	staticConfigs := []metercollector.StaticConfig{
		{
			Name:        zeustypes.MeterPlatformActive,
			Unit:        zeustypes.MeterUnitCount,
			Aggregation: zeustypes.MeterAggregationMax,
			Value:       1,
		},
	}

	telemetryConfigs := []metercollector.TelemetryConfig{
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

	collectors := map[zeustypes.MeterName]metercollector.MeterCollector{}
	for _, config := range staticConfigs {
		collector, err := staticFactory.New(ctx, providerSettings, config)
		if err != nil {
			return nil, err
		}

		collectors[config.Name] = collector
	}

	for _, config := range telemetryConfigs {
		collector, err := telemetryFactory.New(ctx, providerSettings, config)
		if err != nil {
			return nil, err
		}

		collectors[config.Name] = collector
	}

	return collectors, nil
}
