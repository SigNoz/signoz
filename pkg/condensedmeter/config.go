package condensedmeter

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Config = (*Config)(nil)

type Config struct {
	// Provider specifies the implementation that reports condensed rows.
	Provider string `mapstructure:"provider"`

	// Interval is how often the reporter looks for closed hours to report.
	Interval time.Duration `mapstructure:"interval"`

	// Dimensions are the resource attributes the meter connector records as meter labels.
	// They must match the connector's dimensions, so condensed rows slice like every other meter row.
	Dimensions []string `mapstructure:"dimensions"`

	Kafka KafkaConfig `mapstructure:"kafka"`
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
}

func newConfig() factory.Config {
	return Config{
		Provider:   "noop",
		Interval:   time.Hour,
		Dimensions: []string{"service.name", "deployment.environment", "host.name", "signoz.workspace.key.id"},
		Kafka: KafkaConfig{
			Brokers:     []string{"localhost:9092"},
			ClientID:    "signoz",
			Compression: "lz4",
		},
	}
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("condensedmeter"), newConfig)
}

func (c Config) Validate() error {
	if c.Interval < 10*time.Minute || c.Interval > time.Hour {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "condensedmeter::interval must be between 10m and 1h")
	}

	if c.Provider == "kafka" {
		if len(c.Kafka.Brokers) == 0 {
			return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "condensedmeter::kafka::brokers must be set when provider is kafka")
		}

		if c.Kafka.Topic == "" {
			return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "condensedmeter::kafka::topic must be set when provider is kafka")
		}

		switch c.Kafka.Compression {
		case "none", "gzip", "snappy", "lz4", "zstd":
		default:
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidInput, "condensedmeter::kafka::compression must be one of none, gzip, snappy, lz4 or zstd, got %q", c.Kafka.Compression)
		}
	}

	return nil
}
