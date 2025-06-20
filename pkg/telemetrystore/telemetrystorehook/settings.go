package telemetrystorehook

import (
	"context"
	"encoding/json"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

type provider struct {
	settings telemetrystore.QuerySettings
}

func NewSettingsFactory() factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("settings"), NewSettings)
}

func NewSettings(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStoreHook, error) {
	return &provider{
		settings: config.Clickhouse.QuerySettings,
	}, nil
}

func (h *provider) BeforeQuery(ctx context.Context, _ *telemetrystore.QueryEvent) context.Context {
	settings := clickhouse.Settings{}

	// Apply default settings
	logComment := h.getLogComment(ctx)
	if logComment != "" {
		settings["log_comment"] = logComment
	}

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

	ctx = clickhouse.Context(ctx, clickhouse.WithSettings(settings))
	return ctx
}

func (h *provider) AfterQuery(ctx context.Context, event *telemetrystore.QueryEvent) {
}

func (h *provider) getLogComment(ctx context.Context) string {
	// Get the key-value pairs from context for log comment
	kv := ctx.Value(common.LogCommentKey)
	if kv == nil {
		return ""
	}

	logCommentKVs, ok := kv.(map[string]string)
	if !ok {
		return ""
	}

	logComment, _ := json.Marshal(logCommentKVs)

	return string(logComment)
}
