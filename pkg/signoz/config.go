package signoz

import (
	"context"
	"log/slog"
	"net/url"
	"os"
	"path"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlmigrator"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/spf13/cobra"
)

// Config defines the entire input configuration of signoz.
type Config struct {
	// Version config
	Version version.Config `mapstructure:"version"`

	// Instrumentation config
	Instrumentation instrumentation.Config `mapstructure:"instrumentation"`

	// Analytics config
	Analytics analytics.Config `mapstructure:"analytics"`

	// Web config
	Web web.Config `mapstructure:"web"`

	// Cache config
	Cache cache.Config `mapstructure:"cache"`

	// SQLStore config
	SQLStore sqlstore.Config `mapstructure:"sqlstore"`

	// SQLMigration config
	SQLMigration sqlmigration.Config `mapstructure:"sqlmigration"`

	// SQLMigrator config
	SQLMigrator sqlmigrator.Config `mapstructure:"sqlmigrator"`

	// SQLSchema config
	SQLSchema sqlschema.Config `mapstructure:"sqlschema"`

	// API Server config
	APIServer apiserver.Config `mapstructure:"apiserver"`

	// TelemetryStore config
	TelemetryStore telemetrystore.Config `mapstructure:"telemetrystore"`

	// Prometheus config
	Prometheus prometheus.Config `mapstructure:"prometheus"`

	// Alertmanager config
	Alertmanager alertmanager.Config `mapstructure:"alertmanager" yaml:"alertmanager"`

	// Querier config
	Querier querier.Config `mapstructure:"querier"`

	// Ruler config
	Ruler ruler.Config `mapstructure:"ruler"`

	// Emailing config
	Emailing emailing.Config `mapstructure:"emailing" yaml:"emailing"`

	// Sharder config
	Sharder sharder.Config `mapstructure:"sharder" yaml:"sharder"`

	// StatsReporter config
	StatsReporter statsreporter.Config `mapstructure:"statsreporter"`

	// Gateway config
	Gateway gateway.Config `mapstructure:"gateway"`

	// Tokenizer config
	Tokenizer tokenizer.Config `mapstructure:"tokenizer"`
}

// DeprecatedFlags are the flags that are deprecated and scheduled for removal.
// These flags are used to ensure backward compatibility with the old flags.
type DeprecatedFlags struct {
	MaxIdleConns               int
	MaxOpenConns               int
	DialTimeout                time.Duration
	Config                     string
	FluxInterval               string
	FluxIntervalForTraceDetail string
	PreferSpanMetrics          bool
	Cluster                    string
	GatewayUrl                 string
}

func (df *DeprecatedFlags) RegisterFlags(cmd *cobra.Command) {
	cmd.Flags().IntVar(&df.MaxIdleConns, "max-idle-conns", 50, "max idle connections to the database")
	cmd.Flags().IntVar(&df.MaxOpenConns, "max-open-conns", 100, "max open connections to the database")
	cmd.Flags().DurationVar(&df.DialTimeout, "dial-timeout", 5*time.Second, "dial timeout for the database")
	cmd.Flags().StringVar(&df.Config, "config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	cmd.Flags().StringVar(&df.FluxInterval, "flux-interval", "5m", "flux interval")
	cmd.Flags().StringVar(&df.FluxIntervalForTraceDetail, "flux-interval-for-trace-detail", "2m", "flux interval for trace detail")
	cmd.Flags().BoolVar(&df.PreferSpanMetrics, "prefer-span-metrics", false, "(prefer span metrics for service level metrics)")
	cmd.Flags().StringVar(&df.Cluster, "cluster", "cluster", "(cluster name - defaults to 'cluster')")
	cmd.Flags().StringVar(&df.GatewayUrl, "gateway-url", "", "(url to the gateway)")

	_ = cmd.Flags().MarkDeprecated("max-idle-conns", "use SIGNOZ_TELEMETRYSTORE_MAX__IDLE__CONNS instead")
	_ = cmd.Flags().MarkDeprecated("max-open-conns", "use SIGNOZ_TELEMETRYSTORE_MAX__OPEN__CONNS instead")
	_ = cmd.Flags().MarkDeprecated("dial-timeout", "use SIGNOZ_TELEMETRYSTORE_DIAL__TIMEOUT instead")
	_ = cmd.Flags().MarkDeprecated("config", "use SIGNOZ_PROMETHEUS_CONFIG instead")
	_ = cmd.Flags().MarkDeprecated("flux-interval", "use SIGNOZ_QUERIER_FLUX__INTERVAL instead")
	_ = cmd.Flags().MarkDeprecated("flux-interval-for-trace-detail", "use SIGNOZ_QUERIER_FLUX__INTERVAL instead")
	_ = cmd.Flags().MarkDeprecated("cluster", "use SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER instead")
	_ = cmd.Flags().MarkDeprecated("prefer-span-metrics", "use USE_SPAN_METRICS instead")
	_ = cmd.Flags().MarkDeprecated("gateway-url", "use SIGNOZ_GATEWAY_URL instead")
}

func NewConfig(ctx context.Context, logger *slog.Logger, resolverConfig config.ResolverConfig, deprecatedFlags DeprecatedFlags) (Config, error) {
	configFactories := []factory.ConfigFactory{
		version.NewConfigFactory(),
		instrumentation.NewConfigFactory(),
		analytics.NewConfigFactory(),
		web.NewConfigFactory(),
		cache.NewConfigFactory(),
		sqlstore.NewConfigFactory(),
		sqlmigrator.NewConfigFactory(),
		sqlschema.NewConfigFactory(),
		apiserver.NewConfigFactory(),
		telemetrystore.NewConfigFactory(),
		prometheus.NewConfigFactory(),
		alertmanager.NewConfigFactory(),
		querier.NewConfigFactory(),
		ruler.NewConfigFactory(),
		emailing.NewConfigFactory(),
		sharder.NewConfigFactory(),
		statsreporter.NewConfigFactory(),
		gateway.NewConfigFactory(),
		tokenizer.NewConfigFactory(),
	}

	conf, err := config.New(ctx, resolverConfig, configFactories)
	if err != nil {
		return Config{}, err
	}

	var config Config
	if err := conf.Unmarshal("", &config, "yaml"); err != nil {
		return Config{}, err
	}

	mergeAndEnsureBackwardCompatibility(ctx, logger, &config, deprecatedFlags)

	if err := validateConfig(config); err != nil {
		return Config{}, err
	}

	return config, nil
}

func validateConfig(config Config) error {
	rvConfig := reflect.ValueOf(config)
	for i := 0; i < rvConfig.NumField(); i++ {
		factoryConfig, ok := rvConfig.Field(i).Interface().(factory.Config)
		if !ok {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "%q is not of type \"factory.Config\"", rvConfig.Type().Field(i).Name)
		}

		if err := factoryConfig.Validate(); err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to validate config %q", rvConfig.Type().Field(i).Tag.Get("mapstructure"))
		}
	}

	return nil
}

func mergeAndEnsureBackwardCompatibility(ctx context.Context, logger *slog.Logger, config *Config, deprecatedFlags DeprecatedFlags) {
	if os.Getenv("SIGNOZ_LOCAL_DB_PATH") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SIGNOZ_LOCAL_DB_PATH is deprecated and scheduled for removal. Please use SIGNOZ_SQLSTORE_SQLITE_PATH instead.")
		config.SQLStore.Sqlite.Path = os.Getenv("SIGNOZ_LOCAL_DB_PATH")
	}

	if os.Getenv("CONTEXT_TIMEOUT") != "" {
		logger.WarnContext(ctx, "[Deprecated] env CONTEXT_TIMEOUT is deprecated and scheduled for removal. Please use SIGNOZ_APISERVER_TIMEOUT_DEFAULT instead.")
		contextTimeoutDuration, err := time.ParseDuration(os.Getenv("CONTEXT_TIMEOUT") + "s")
		if err == nil {
			config.APIServer.Timeout.Default = contextTimeoutDuration
		} else {
			logger.WarnContext(ctx, "Error parsing CONTEXT_TIMEOUT, using default value of 60s")
		}
	}

	if os.Getenv("CONTEXT_TIMEOUT_MAX_ALLOWED") != "" {
		logger.WarnContext(ctx, "[Deprecated] env CONTEXT_TIMEOUT_MAX_ALLOWED is deprecated and scheduled for removal. Please use SIGNOZ_APISERVER_TIMEOUT_MAX instead.")

		contextTimeoutDuration, err := time.ParseDuration(os.Getenv("CONTEXT_TIMEOUT_MAX_ALLOWED") + "s")
		if err == nil {
			config.APIServer.Timeout.Max = contextTimeoutDuration
		} else {
			logger.WarnContext(ctx, "Error parsing CONTEXT_TIMEOUT_MAX_ALLOWED, using default value of 600s")
		}
	}

	if os.Getenv("STORAGE") != "" {
		logger.WarnContext(ctx, "[Deprecated] env STORAGE is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_PROVIDER instead.")
		config.TelemetryStore.Provider = os.Getenv("STORAGE")
	}

	if os.Getenv("ClickHouseUrl") != "" {
		logger.WarnContext(ctx, "[Deprecated] env ClickHouseUrl is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN instead.")
		config.TelemetryStore.Clickhouse.DSN = os.Getenv("ClickHouseUrl")
	}

	if deprecatedFlags.MaxIdleConns != 50 {
		logger.WarnContext(ctx, "[Deprecated] flag --max-idle-conns is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_MAX__IDLE__CONNS instead.")
		config.TelemetryStore.Connection.MaxIdleConns = deprecatedFlags.MaxIdleConns
	}

	if deprecatedFlags.MaxOpenConns != 100 {
		logger.WarnContext(ctx, "[Deprecated] flag --max-open-conns is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_MAX__OPEN__CONNS instead.")
		config.TelemetryStore.Connection.MaxOpenConns = deprecatedFlags.MaxOpenConns
	}

	if deprecatedFlags.DialTimeout != 5*time.Second {
		logger.WarnContext(ctx, "[Deprecated] flag --dial-timeout is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_DIAL__TIMEOUT instead.")
		config.TelemetryStore.Connection.DialTimeout = deprecatedFlags.DialTimeout
	}

	if deprecatedFlags.Config != "" {
		logger.WarnContext(ctx, "[Deprecated] flag --config is deprecated for passing prometheus config. The flag will be used for passing the entire SigNoz config. More details can be found at https://github.com/SigNoz/signoz/issues/6805.")
	}

	if os.Getenv("INVITE_EMAIL_TEMPLATE") != "" {
		logger.WarnContext(ctx, "[Deprecated] env INVITE_EMAIL_TEMPLATE is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_TEMPLATES_DIRECTORY instead.")
		config.Emailing.Templates.Directory = path.Dir(os.Getenv("INVITE_EMAIL_TEMPLATE"))
	}

	if os.Getenv("SMTP_ENABLED") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SMTP_ENABLED is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_ENABLED instead.")
		config.Emailing.Enabled = os.Getenv("SMTP_ENABLED") == "true"
	}

	if os.Getenv("SMTP_HOST") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SMTP_HOST is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_ADDRESS instead.")
		if os.Getenv("SMTP_PORT") != "" {
			config.Emailing.SMTP.Address = os.Getenv("SMTP_HOST") + ":" + os.Getenv("SMTP_PORT")
		} else {
			config.Emailing.SMTP.Address = os.Getenv("SMTP_HOST")
		}
	}

	if os.Getenv("SMTP_PORT") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SMTP_PORT is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_ADDRESS instead.")
	}

	if os.Getenv("SMTP_USERNAME") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SMTP_USERNAME is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_AUTH_USERNAME instead.")
		config.Emailing.SMTP.Auth.Username = os.Getenv("SMTP_USERNAME")
	}

	if os.Getenv("SMTP_PASSWORD") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SMTP_PASSWORD is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_AUTH_PASSWORD instead.")
		config.Emailing.SMTP.Auth.Password = os.Getenv("SMTP_PASSWORD")
	}

	if os.Getenv("SMTP_FROM") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SMTP_FROM is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_FROM instead.")
		config.Emailing.SMTP.From = os.Getenv("SMTP_FROM")
	}

	if os.Getenv("SIGNOZ_SAAS_SEGMENT_KEY") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SIGNOZ_SAAS_SEGMENT_KEY is deprecated and scheduled for removal. Please use SIGNOZ_ANALYTICS_SEGMENT_KEY instead.")
		config.Analytics.Segment.Key = os.Getenv("SIGNOZ_SAAS_SEGMENT_KEY")
	}

	if os.Getenv("TELEMETRY_ENABLED") != "" {
		logger.WarnContext(ctx, "[Deprecated] env TELEMETRY_ENABLED is deprecated and scheduled for removal. Please use SIGNOZ_ANALYTICS_ENABLED instead.")
		config.Analytics.Enabled = os.Getenv("TELEMETRY_ENABLED") == "true"
	}

	if deprecatedFlags.FluxInterval != "" {
		logger.WarnContext(ctx, "[Deprecated] flag --flux-interval is deprecated and scheduled for removal. Please use SIGNOZ_QUERIER_FLUX__INTERVAL instead.")
		fluxInterval, err := time.ParseDuration(deprecatedFlags.FluxInterval)
		if err != nil {
			logger.WarnContext(ctx, "Error parsing --flux-interval, using default value.")
		} else {
			config.Querier.FluxInterval = fluxInterval
		}
	}

	if deprecatedFlags.FluxIntervalForTraceDetail != "" {
		logger.WarnContext(ctx, "[Deprecated] flag --flux-interval-for-trace-detail is deprecated and scheduled for complete removal. Please use SIGNOZ_QUERIER_FLUX__INTERVAL instead.")
	}

	if deprecatedFlags.Cluster != "" {
		logger.WarnContext(ctx, "[Deprecated] flag --cluster is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER instead.")
		config.TelemetryStore.Clickhouse.Cluster = deprecatedFlags.Cluster
	}

	if deprecatedFlags.PreferSpanMetrics {
		logger.WarnContext(ctx, "[Deprecated] flag --prefer-span-metrics is deprecated and scheduled for removal. Please use USE_SPAN_METRICS instead.")
	}

	if deprecatedFlags.GatewayUrl != "" {
		logger.WarnContext(ctx, "[Deprecated] flag --gateway-url is deprecated and scheduled for removal. Please use SIGNOZ_GATEWAY_URL instead.")
		u, err := url.Parse(deprecatedFlags.GatewayUrl)
		if err != nil {
			logger.WarnContext(ctx, "Error parsing --gateway-url, using default value.")
		} else {
			config.Gateway.URL = u
		}
	}

	if os.Getenv("SIGNOZ_JWT_SECRET") != "" {
		logger.WarnContext(ctx, "[Deprecated] env SIGNOZ_JWT_SECRET is deprecated and scheduled for removal. Please use SIGNOZ_TOKENIZER_JWT_SECRET instead.")
		config.Tokenizer.JWT.Secret = os.Getenv("SIGNOZ_JWT_SECRET")
	}
}

func (config Config)Collect(_ context.Context, _ valuer.UUID) (map[string]any, error){
	stats := make(map[string]any)

	// SQL Store Config Stats
	stats["config.sqlstore.provider"] = config.SQLStore.Provider
	
	// Tokenizer Config Stats
	stats["config.tokenizer.provider"] = config.Tokenizer.Provider

	// Cache Config Stats
	stats["config.cache.provider"] = config.Cache.Provider

	return stats, nil
}
