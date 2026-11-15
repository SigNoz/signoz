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

	File FileConfig `mapstructure:"file"`

	Kafka KafkaConfig `mapstructure:"kafka"`
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

type FileConfig struct {
	// Path is the absolute path to the audit log file. The file is opened with
	// O_APPEND|O_CREATE|O_WRONLY; existing contents are preserved across runs.
	Path string `mapstructure:"path"`
}

type KafkaConfig struct {
	// Brokers are the seed broker addresses (host:port) used to discover the cluster.
	Brokers []string `mapstructure:"brokers"`

	// Topic must already exist; the producer does not create it.
	Topic string `mapstructure:"topic"`

	// ClientID identifies this producer in broker logs and metrics.
	ClientID string `mapstructure:"client_id"`

	// Compression is the codec for produced batches: none, gzip, snappy, lz4 or zstd.
	Compression string `mapstructure:"compression"`

	// ShutdownTimeout bounds draining buffered events on stop; events still undelivered when it expires are dropped.
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
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
		Kafka: KafkaConfig{
			Brokers:         []string{"localhost:9092"},
			ClientID:        "signoz",
			Compression:     "lz4",
			ShutdownTimeout: 30 * time.Second,
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

	if c.Provider == "file" {
		if c.File.Path == "" {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::file::path must be set when provider is file")
		}
	}

	if c.Provider == "kafka" {
		if len(c.Kafka.Brokers) == 0 {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::kafka::brokers must be set when provider is kafka")
		}

		if c.Kafka.Topic == "" {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::kafka::topic must be set when provider is kafka")
		}

		switch c.Kafka.Compression {
		case "none", "gzip", "snappy", "lz4", "zstd":
		default:
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::kafka::compression must be one of none, gzip, snappy, lz4 or zstd, got %q", c.Kafka.Compression)
		}

		if c.Kafka.ShutdownTimeout <= 0 {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor::kafka::shutdown_timeout must be greater than 0")
		}
	}

	return nil
}
