package auditor

import (
	"net/url"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Config = (*Config)(nil)

type Config struct {
	// Provider specifies the audit export implementation to use.
	Provider string `mapstructure:"provider"`

	// BufferSize is the async channel capacity for audit events.
	// Events are dropped when the buffer is full (fail-open).
	BufferSize int `mapstructure:"buffer_size"`

	// BatchSize is the maximum number of events per export batch.
	BatchSize int `mapstructure:"batch_size"`

	// FlushInterval is the maximum time between export flushes.
	FlushInterval time.Duration `mapstructure:"flush_interval"`

	OTLPHTTP OTLPHTTPConfig `mapstructure:"otlphttp"`
}

// OTLPHTTPConfig holds configuration for the OTLP HTTP exporter provider.
// Fields map to go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp options.
type OTLPHTTPConfig struct {
	// Endpoint is the target scheme://host:port of the OTLP HTTP endpoint.
	Endpoint *url.URL `mapstructure:"endpoint"`

	// Insecure disables TLS, using HTTP instead of HTTPS.
	Insecure bool `mapstructure:"insecure"`

	// Timeout is the maximum duration for an export attempt.
	Timeout time.Duration `mapstructure:"timeout"`

	// Headers are additional HTTP headers sent with every export request.
	Headers map[string]string `mapstructure:"headers"`

	// Retry configures exponential backoff retry policy for failed exports.
	Retry RetryConfig `mapstructure:"retry"`
}

// RetryConfig configures exponential backoff for the OTLP HTTP exporter.
type RetryConfig struct {
	// Enabled controls whether retries are attempted on transient failures.
	Enabled bool `mapstructure:"enabled"`

	// InitialInterval is the initial wait time before the first retry.
	InitialInterval time.Duration `mapstructure:"initial_interval"`

	// MaxInterval is the upper bound on backoff interval.
	MaxInterval time.Duration `mapstructure:"max_interval"`

	// MaxElapsedTime is the total maximum time spent retrying.
	MaxElapsedTime time.Duration `mapstructure:"max_elapsed_time"`
}

func newConfig() factory.Config {
	return Config{
		Provider:      "noop",
		BufferSize:    1000,
		BatchSize:     100,
		FlushInterval: time.Second,
		OTLPHTTP: OTLPHTTPConfig{
			Endpoint: &url.URL{
				Scheme: "http",
				Host:   "localhost:4318",
				Path:   "/v1/logs",
			},
			Timeout: 10 * time.Second,
			Retry: RetryConfig{
				Enabled:         true,
				InitialInterval: 5 * time.Second,
				MaxInterval:     30 * time.Second,
				MaxElapsedTime:  time.Minute,
			},
		},
	}
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("auditor"), newConfig)
}

func (c Config) Validate() error {
	if c.BufferSize <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::buffer_size must be greater than 0")
	}

	if c.BatchSize <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::batch_size must be greater than 0")
	}

	if c.FlushInterval <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::flush_interval must be greater than 0")
	}

	if c.BatchSize > c.BufferSize {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::batch_size must not exceed auditor::buffer_size")
	}

	if c.Provider == "otlphttp" {
		if c.OTLPHTTP.Endpoint == nil {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::otlphttp::endpoint must be set when provider is otlphttp")
		}
	}

	return nil
}
