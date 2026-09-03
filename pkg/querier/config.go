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
	// TraceIDWindowPadding widens the selected query window when looking up
	// trace_summary to resolve min(start)/max(end) for a trace_id filter.
	// The extra width is required because AggregatingMergeTree does not merge
	// across PARTITION BY toDate(end), so a trace that straddles a date
	// boundary has rows in adjacent partitions. Default 6h.
	TraceIDWindowPadding time.Duration `yaml:"trace_id_window_padding" mapstructure:"trace_id_window_padding"`

	// Keys sit under querier.skip_resource_fingerprint.
	statementbuilder.Config `mapstructure:",squash" yaml:",squash"`
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
		TraceIDWindowPadding:    6 * time.Hour,
		Config:                  statementbuilder.NewConfig(),
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
	if c.TraceIDWindowPadding < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "trace_id_window_padding must not be negative, got %v", c.TraceIDWindowPadding)
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
