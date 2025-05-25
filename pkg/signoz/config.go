package signoz

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlmigrator"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/web"
)

// Config defines the entire input configuration of signoz.
type Config struct {
	// Version config
	Version version.Config `mapstructure:"version"`

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

	// Prometheus config
	Prometheus prometheus.Config `mapstructure:"prometheus"`

	// Alertmanager config
	Alertmanager alertmanager.Config `mapstructure:"alertmanager" yaml:"alertmanager"`

	// Emailing config
	Emailing emailing.Config `mapstructure:"emailing" yaml:"emailing"`
}

// DeprecatedFlags are the flags that are deprecated and scheduled for removal.
// These flags are used to ensure backward compatibility with the old flags.
type DeprecatedFlags struct {
	MaxIdleConns int
	MaxOpenConns int
	DialTimeout  time.Duration
	Config       string
}

func NewConfig(ctx context.Context, resolverConfig config.ResolverConfig, deprecatedFlags DeprecatedFlags) (Config, error) {
	configFactories := []factory.ConfigFactory{
		version.NewConfigFactory(),
		instrumentation.NewConfigFactory(),
		web.NewConfigFactory(),
		cache.NewConfigFactory(),
		sqlstore.NewConfigFactory(),
		sqlmigrator.NewConfigFactory(),
		apiserver.NewConfigFactory(),
		telemetrystore.NewConfigFactory(),
		prometheus.NewConfigFactory(),
		alertmanager.NewConfigFactory(),
		emailing.NewConfigFactory(),
	}

	conf, err := config.New(ctx, resolverConfig, configFactories)
	if err != nil {
		return Config{}, err
	}

	var config Config
	if err := conf.Unmarshal("", &config, "yaml"); err != nil {
		return Config{}, err
	}

	mergeAndEnsureBackwardCompatibility(&config, deprecatedFlags)

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
			return fmt.Errorf("%q is not of type \"factory.Config\"", rvConfig.Type().Field(i).Name)
		}

		if err := factoryConfig.Validate(); err != nil {
			return fmt.Errorf("failed to validate config %q: %w", rvConfig.Type().Field(i).Tag.Get("mapstructure"), err)
		}
	}

	return nil
}

func mergeAndEnsureBackwardCompatibility(config *Config, deprecatedFlags DeprecatedFlags) {
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

	if os.Getenv("STORAGE") != "" {
		fmt.Println("[Deprecated] env STORAGE is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_PROVIDER instead.")
		config.TelemetryStore.Provider = os.Getenv("STORAGE")
	}

	if os.Getenv("ClickHouseUrl") != "" {
		fmt.Println("[Deprecated] env ClickHouseUrl is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN instead.")
		config.TelemetryStore.Clickhouse.DSN = os.Getenv("ClickHouseUrl")
	}

	if deprecatedFlags.MaxIdleConns != 50 {
		fmt.Println("[Deprecated] flag --max-idle-conns is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_MAX__IDLE__CONNS instead.")
		config.TelemetryStore.Connection.MaxIdleConns = deprecatedFlags.MaxIdleConns
	}

	if deprecatedFlags.MaxOpenConns != 100 {
		fmt.Println("[Deprecated] flag --max-open-conns is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_MAX__OPEN__CONNS instead.")
		config.TelemetryStore.Connection.MaxOpenConns = deprecatedFlags.MaxOpenConns
	}

	if deprecatedFlags.DialTimeout != 5*time.Second {
		fmt.Println("[Deprecated] flag --dial-timeout is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_DIAL__TIMEOUT instead.")
		config.TelemetryStore.Connection.DialTimeout = deprecatedFlags.DialTimeout
	}

	if os.Getenv("ALERTMANAGER_API_PREFIX") != "" {
		fmt.Println("[Deprecated] env ALERTMANAGER_API_PREFIX is deprecated and scheduled for removal. Please use SIGNOZ_ALERTMANAGER_LEGACY_API__URL instead.")
		u, err := url.Parse(os.Getenv("ALERTMANAGER_API_PREFIX"))
		if err != nil {
			fmt.Println("Error parsing ALERTMANAGER_API_PREFIX, using default value")
		} else {
			config.Alertmanager.Legacy.ApiURL = u
		}
	}

	if os.Getenv("ALERTMANAGER_API_CHANNEL_PATH") != "" {
		fmt.Println("[Deprecated] env ALERTMANAGER_API_CHANNEL_PATH is deprecated and scheduled for complete removal.")
	}

	if deprecatedFlags.Config != "" {
		fmt.Println("[Deprecated] flag --config is deprecated for passing prometheus config. The flag will be used for passing the entire SigNoz config. More details can be found at https://github.com/SigNoz/signoz/issues/6805.")
	}

	if os.Getenv("INVITE_EMAIL_TEMPLATE") != "" {
		fmt.Println("[Deprecated] env INVITE_EMAIL_TEMPLATE is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_TEMPLATES_DIRECTORY instead.")
		config.Emailing.Templates.Directory = path.Dir(os.Getenv("INVITE_EMAIL_TEMPLATE"))
	}

	if os.Getenv("SMTP_ENABLED") != "" {
		fmt.Println("[Deprecated] env SMTP_ENABLED is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_ENABLED instead.")
		config.Emailing.Enabled = os.Getenv("SMTP_ENABLED") == "true"
	}

	if os.Getenv("SMTP_HOST") != "" {
		fmt.Println("[Deprecated] env SMTP_HOST is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_ADDRESS instead.")
		if os.Getenv("SMTP_PORT") != "" {
			config.Emailing.SMTP.Address = os.Getenv("SMTP_HOST") + ":" + os.Getenv("SMTP_PORT")
		} else {
			config.Emailing.SMTP.Address = os.Getenv("SMTP_HOST")
		}
	}

	if os.Getenv("SMTP_PORT") != "" {
		fmt.Println("[Deprecated] env SMTP_PORT is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_ADDRESS instead.")
	}

	if os.Getenv("SMTP_USERNAME") != "" {
		fmt.Println("[Deprecated] env SMTP_USERNAME is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_AUTH_USERNAME instead.")
		config.Emailing.SMTP.Auth.Username = os.Getenv("SMTP_USERNAME")
	}

	if os.Getenv("SMTP_PASSWORD") != "" {
		fmt.Println("[Deprecated] env SMTP_PASSWORD is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_AUTH_PASSWORD instead.")
		config.Emailing.SMTP.Auth.Password = os.Getenv("SMTP_PASSWORD")
	}

	if os.Getenv("SMTP_FROM") != "" {
		fmt.Println("[Deprecated] env SMTP_FROM is deprecated and scheduled for removal. Please use SIGNOZ_EMAILING_FROM instead.")
		config.Emailing.SMTP.From = os.Getenv("SMTP_FROM")
	}
}
