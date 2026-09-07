package telemetrymetadata

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

// RelatedValuesConfig bounds the related-values lookup of the fields API,
// which scans the attributes metadata table for the requested window.
type RelatedValuesConfig struct {
	// MaxExecutionTime bounds the related-values query on the server; when it
	// is reached the query returns the values found so far and the response
	// is marked incomplete.
	MaxExecutionTime time.Duration `mapstructure:"max_execution_time"`
	// MaxWindow clamps the window of the related-values query. The requested
	// window keeps driving the all-values lookup.
	MaxWindow time.Duration `mapstructure:"max_window"`
	// MaxConcurrency caps the related-values queries an org runs at once;
	// further requests wait for a slot.
	MaxConcurrency int `mapstructure:"max_concurrency"`
	// MaxThreads sets max_threads for the related-values query; 0 keeps the
	// server default.
	MaxThreads int `mapstructure:"max_threads"`
	// ReadBufferSize sets max_read_buffer_size_local_fs for the related-values
	// query, in bytes; 0 keeps the server default.
	ReadBufferSize int `mapstructure:"read_buffer_size"`
	// MaxExistenceChecks is the number of equality terms of the existing query
	// whose value is looked up in the all-values set before the scan; a value
	// absent from the window makes the related set empty without a scan.
	MaxExistenceChecks int `mapstructure:"max_existence_checks"`
}

// Config is the configuration of the telemetry metadata store.
type Config struct {
	RelatedValues RelatedValuesConfig `mapstructure:"related_values"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("telemetrymetadata"), newConfig)
}

func newConfig() factory.Config {
	return NewConfig()
}

// NewConfig returns the default configuration.
func NewConfig() Config {
	return Config{
		RelatedValues: RelatedValuesConfig{
			MaxExecutionTime:   2 * time.Second,
			MaxWindow:          7 * 24 * time.Hour,
			MaxConcurrency:     2,
			MaxThreads:         0,
			ReadBufferSize:     0,
			MaxExistenceChecks: 4,
		},
	}
}

func (c Config) Validate() error {
	if c.RelatedValues.MaxExecutionTime < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "related_values.max_execution_time must not be negative, got %v", c.RelatedValues.MaxExecutionTime)
	}
	if c.RelatedValues.MaxWindow < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "related_values.max_window must not be negative, got %v", c.RelatedValues.MaxWindow)
	}
	if c.RelatedValues.MaxConcurrency < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "related_values.max_concurrency must not be negative, got %v", c.RelatedValues.MaxConcurrency)
	}
	if c.RelatedValues.MaxThreads < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "related_values.max_threads must not be negative, got %v", c.RelatedValues.MaxThreads)
	}
	if c.RelatedValues.ReadBufferSize < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "related_values.read_buffer_size must not be negative, got %v", c.RelatedValues.ReadBufferSize)
	}
	if c.RelatedValues.MaxExistenceChecks < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "related_values.max_existence_checks must not be negative, got %v", c.RelatedValues.MaxExistenceChecks)
	}
	return nil
}
