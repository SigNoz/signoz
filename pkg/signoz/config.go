package signoz

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.signoz.io/signoz/pkg/apiserver"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/sqlmigration"
	"go.signoz.io/signoz/pkg/sqlmigrator"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/telemetrystore"
	"go.signoz.io/signoz/pkg/web"
)

// Config defines the entire input configuration of signoz.
type Config struct {
	// Instrumentation config
	Instrumentation instrumentation.Config `mapstructure:"instrumentation"`

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

	// API Server config
	APIServer apiserver.Config `mapstructure:"apiserver"`

	// TelemetryStore config
	TelemetryStore telemetrystore.Config `mapstructure:"telemetrystore"`
}

// DeprecatedFlags are the flags that are deprecated and scheduled for removal.
// These flags are used to ensure backward compatibility with the old flags.
type DeprecatedFlags struct {
	MaxIdleConns int
	MaxOpenConns int
	DialTimeout  time.Duration
}

func NewConfig(ctx context.Context, resolverConfig config.ResolverConfig, deprecatedFlags DeprecatedFlags) (Config, error) {
	configFactories := []factory.ConfigFactory{
		instrumentation.NewConfigFactory(),
		web.NewConfigFactory(),
		cache.NewConfigFactory(),
		sqlstore.NewConfigFactory(),
		sqlmigrator.NewConfigFactory(),
		apiserver.NewConfigFactory(),
		telemetrystore.NewConfigFactory(),
	}

	conf, err := config.New(ctx, resolverConfig, configFactories)
	if err != nil {
		return Config{}, err
	}

	var config Config
	if err := conf.Unmarshal("", &config); err != nil {
		return Config{}, err
	}

	mergeAndEnsureBackwardCompatibility(&config, deprecatedFlags)

	return config, nil
}

func mergeAndEnsureBackwardCompatibility(config *Config, deprecatedFlags DeprecatedFlags) {
	// SIGNOZ_LOCAL_DB_PATH
	if os.Getenv("SIGNOZ_LOCAL_DB_PATH") != "" {
		fmt.Println("[Deprecated] env SIGNOZ_LOCAL_DB_PATH is deprecated and scheduled for removal. Please use SIGNOZ_SQLSTORE_SQLITE_PATH instead.")
		config.SQLStore.Sqlite.Path = os.Getenv("SIGNOZ_LOCAL_DB_PATH")
	}
	if os.Getenv("CONTEXT_TIMEOUT") != "" {
		fmt.Println("[Deprecated] env CONTEXT_TIMEOUT is deprecated and scheduled for removal. Please use SIGNOZ_APISERVER_TIMEOUT_DEFAULT instead.")
		contextTimeoutDuration, err := time.ParseDuration(os.Getenv("CONTEXT_TIMEOUT") + "s")
		if err == nil {
			config.APIServer.Timeout.Default = contextTimeoutDuration
		} else {
			fmt.Println("Error parsing CONTEXT_TIMEOUT, using default value of 60s")
		}
	}
	if os.Getenv("CONTEXT_TIMEOUT_MAX_ALLOWED") != "" {
		fmt.Println("[Deprecated] env CONTEXT_TIMEOUT_MAX_ALLOWED is deprecated and scheduled for removal. Please use SIGNOZ_APISERVER_TIMEOUT_MAX instead.")

		contextTimeoutDuration, err := time.ParseDuration(os.Getenv("CONTEXT_TIMEOUT_MAX_ALLOWED") + "s")
		if err == nil {
			config.APIServer.Timeout.Max = contextTimeoutDuration
		} else {
			fmt.Println("Error parsing CONTEXT_TIMEOUT_MAX_ALLOWED, using default value of 600s")
		}
	}
	if os.Getenv("ClickHouseUrl") != "" {
		fmt.Println("[Deprecated] env ClickHouseUrl is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN instead.")
		config.TelemetryStore.ClickHouse.DSN = os.Getenv("ClickHouseUrl")
	}

	if deprecatedFlags.MaxIdleConns != 50 {
		fmt.Println("[Deprecated] flag --max-idle-conns is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_MAX__IDLE__CONNS env variable instead.")
		config.TelemetryStore.Connection.MaxIdleConns = deprecatedFlags.MaxIdleConns
	}
	if deprecatedFlags.MaxOpenConns != 100 {
		fmt.Println("[Deprecated] flag --max-open-conns is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_MAX__OPEN__CONNS env variable instead.")
		config.TelemetryStore.Connection.MaxOpenConns = deprecatedFlags.MaxOpenConns
	}
	if deprecatedFlags.DialTimeout != 5*time.Second {
		fmt.Println("[Deprecated] flag --dial-timeout is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_DIAL__TIMEOUT environment variable instead.")
		config.TelemetryStore.Connection.DialTimeout = deprecatedFlags.DialTimeout
	}
}
