package telemetrystorehook

import (
	"context"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
)

type provider struct {
	clickHouseVersion string
	settings          telemetrystore.QuerySettings
}

func NewSettingsFactory(version string) factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("settings"), func(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStoreHook, error) {
		return NewSettings(ctx, providerSettings, config, version)
	})
}

func NewSettings(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config, version string) (telemetrystore.TelemetryStoreHook, error) {
	return &provider{
		clickHouseVersion: version,
		settings:          config.Clickhouse.QuerySettings,
	}, nil
}

func (h *provider) BeforeQuery(ctx context.Context, _ *telemetrystore.QueryEvent) context.Context {
	settings := clickhouse.Settings{}

	settings["log_comment"] = ctxtypes.CommentFromContext(ctx).String()

	if ctx.Value("enforce_max_result_rows") != nil {
		settings["max_result_rows"] = h.settings.MaxResultRows
	}

	if h.settings.MaxBytesToRead != 0 {
		settings["max_bytes_to_read"] = h.settings.MaxBytesToRead
	}

	if h.settings.MaxExecutionTime != 0 {
		settings["max_execution_time"] = h.settings.MaxExecutionTime
	}

	if h.settings.MaxExecutionTimeLeaf != 0 {
		settings["max_execution_time_leaf"] = h.settings.MaxExecutionTimeLeaf
	}

	if h.settings.TimeoutBeforeCheckingExecutionSpeed != 0 {
		settings["timeout_before_checking_execution_speed"] = h.settings.TimeoutBeforeCheckingExecutionSpeed
	}

	if h.settings.IgnoreDataSkippingIndices != "" {
		settings["ignore_data_skipping_indices"] = h.settings.IgnoreDataSkippingIndices
	}

	if ctx.Value("clickhouse_max_threads") != nil {
		if maxThreads, ok := ctx.Value("clickhouse_max_threads").(int); ok {
			settings["max_threads"] = maxThreads
		}
	}

	if ctx.Value("max_result_rows") != nil && ctx.Value("result_overflow_mode") != nil {
		if maxResultRows, ok := ctx.Value("max_result_rows").(int); ok {
			settings["max_result_rows"] = maxResultRows
		}
		settings["result_overflow_mode"] = ctx.Value("result_overflow_mode")
	}

	if ctx.Value("max_rows_to_group_by") != nil && ctx.Value("result_overflow_mode") != nil {
		settings["max_rows_to_group_by"] = ctx.Value("max_rows_to_group_by").(int)
		settings["result_overflow_mode"] = ctx.Value("result_overflow_mode")
	}

	// ClickHouse version check is added since this setting is not support on version below 25.5
	if strings.HasPrefix(h.clickHouseVersion, "25") && !h.settings.SecondaryIndicesEnableBulkFiltering {
		// TODO(srikanthccv): enable it when the "Cannot read all data" issue is fixed
		// https://github.com/ClickHouse/ClickHouse/issues/82283
		settings["secondary_indices_enable_bulk_filtering"] = false
	}

	ctx = clickhouse.Context(ctx, clickhouse.WithSettings(settings))
	return ctx
}

func (h *provider) AfterQuery(ctx context.Context, event *telemetrystore.QueryEvent) {}
