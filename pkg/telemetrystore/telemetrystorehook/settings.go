package telemetrystorehook

import (
	"context"
	"encoding/json"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/telemetrystore"
)

type provider struct {
	settings telemetrystore.ClickHouseQuerySettings
}

func NewFactory() factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhousesettings"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStoreHook, error) {
	return &provider{
		settings: config.ClickHouse.QuerySettings,
	}, nil
}

func (h *provider) BeforeQuery(ctx context.Context, query string, args ...interface{}) (context.Context, string, []interface{}) {
	return h.clickHouseSettings(ctx, query, args...)
}

func (h *provider) AfterQuery(ctx context.Context, query string, args []interface{}, rows driver.Rows, err error) {
	return
}

// clickHouseSettings adds clickhouse settings to queries
func (h *provider) clickHouseSettings(ctx context.Context, query string, args ...interface{}) (context.Context, string, []interface{}) {
	settings := clickhouse.Settings{}

	// Apply default settings
	logComment := h.getLogComment(ctx)
	if logComment != "" {
		settings["log_comment"] = logComment
	}

	if ctx.Value("enforce_max_result_rows") != nil {
		settings["max_result_rows"] = h.settings.MaxResultRowsForCHQuery
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

	ctx = clickhouse.Context(ctx, clickhouse.WithSettings(settings))
	return ctx, query, args
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
