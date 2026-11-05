package querier

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
)

const DefaultMaxConcurrentQueries = 8

// Config represents the configuration for the querier.
type Config struct {
	// CacheTTL is the TTL for cached query results
	CacheTTL time.Duration `yaml:"cache_ttl" mapstructure:"cache_ttl"`
	// FluxInterval is the interval for recent data that should not be cached
	FluxInterval time.Duration `yaml:"flux_interval" mapstructure:"flux_interval"`
	// MaxConcurrentQueries is the maximum number of concurrent queries for missing ranges
	MaxConcurrentQueries int `yaml:"max_concurrent_queries" mapstructure:"max_concurrent_queries"`
	// LogTraceIDWindowPadding is the padding added to narrowed down timerange from trace summary to logs with trace_id filter.
	LogTraceIDWindowPadding time.Duration `yaml:"log_trace_id_window_padding" mapstructure:"log_trace_id_window_padding"`
	// ClickHouseQuery bounds user-written ClickHouse SQL queries. A QueryRange caller can replace it with
	// WithClickHouseQueryLimits.
	ClickHouseQuery ClickHouseQueryConfig `yaml:"clickhouse_query" mapstructure:"clickhouse_query"`

	// Keys sit under querier.skip_resource_fingerprint.
	statementbuilder.Config `mapstructure:",squash" yaml:",squash"`
}

// ClickHouseQueryConfig is the budget of one user-written ClickHouse SQL query. A zero value disables that limit.
type ClickHouseQueryConfig struct {
	// MaxExecutionTime is enforced as a context deadline.
	MaxExecutionTime time.Duration `yaml:"max_execution_time" mapstructure:"max_execution_time"`
	// MaxMemoryUsage is the ClickHouse memory limit of the query, in bytes.
	MaxMemoryUsage int64 `yaml:"max_memory_usage" mapstructure:"max_memory_usage"`
	// MaxResultRows caps the number of result rows.
	MaxResultRows int64 `yaml:"max_result_rows" mapstructure:"max_result_rows"`
	// MaxResultBytes caps the uncompressed result size, in bytes.
	MaxResultBytes int64 `yaml:"max_result_bytes" mapstructure:"max_result_bytes"`
}

// NewConfigFactory creates a new config factory for querier.
func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("querier"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		// Default values
		CacheTTL:                168 * time.Hour,
		FluxInterval:            5 * time.Minute,
		MaxConcurrentQueries:    DefaultMaxConcurrentQueries,
		LogTraceIDWindowPadding: 5 * time.Minute,
		ClickHouseQuery: ClickHouseQueryConfig{
			MaxExecutionTime: 55 * time.Second,
			MaxMemoryUsage:   10_000_000_000,
			MaxResultRows:    100_000,
			MaxResultBytes:   500 << 20,
		},
		Config: statementbuilder.NewConfig(),
	}
}

// Validate validates the configuration.
func (c Config) Validate() error {
	if c.CacheTTL <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "cache_ttl must be positive, got %v", c.CacheTTL)
	}
	if c.FluxInterval <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "flux_interval must be positive, got %v", c.FluxInterval)
	}
	if c.MaxConcurrentQueries <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "max_concurrent_queries must be positive, got %v", c.MaxConcurrentQueries)
	}
	if c.LogTraceIDWindowPadding < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "log_trace_id_window_padding must not be negative, got %v", c.LogTraceIDWindowPadding)
	}
	if c.ClickHouseQuery.MaxExecutionTime < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "clickhouse_query.max_execution_time must not be negative, got %v", c.ClickHouseQuery.MaxExecutionTime)
	}
	if c.ClickHouseQuery.MaxMemoryUsage < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "clickhouse_query.max_memory_usage must not be negative, got %v", c.ClickHouseQuery.MaxMemoryUsage)
	}
	if c.ClickHouseQuery.MaxResultRows < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "clickhouse_query.max_result_rows must not be negative, got %v", c.ClickHouseQuery.MaxResultRows)
	}
	if c.ClickHouseQuery.MaxResultBytes < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "clickhouse_query.max_result_bytes must not be negative, got %v", c.ClickHouseQuery.MaxResultBytes)
	}
	// Embedded Validate is shadowed by this one; call it explicitly.
	if err := c.Config.Validate(); err != nil {
		return err
	}
	return nil
}

func (c Config) Provider() string {
	return "signoz"
}
