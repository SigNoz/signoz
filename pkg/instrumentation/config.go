package instrumentation

import (
	"log/slog"

	contribsdkconfig "go.opentelemetry.io/contrib/config"
	"go.signoz.io/signoz/pkg/factory"
)

// Config holds the configuration for all instrumentation components.
type Config struct {
	Logs     LogsConfig    `mapstructure:"logs"`
	Traces   TracesConfig  `mapstructure:"traces"`
	Metrics  MetricsConfig `mapstructure:"metrics"`
	Resource Resource      `mapstructure:"resource"`
}

// Resource defines the configuration for OpenTelemetry resource attributes.
type Resource struct {
	Attributes contribsdkconfig.Attributes `mapstructure:"attributes"`
}

// LogsConfig holds the configuration for the logging component.
type LogsConfig struct {
	Level slog.Level `mapstructure:"level"`
}

// TracesConfig holds the configuration for the tracing component.
type TracesConfig struct {
	Enabled    bool                     `mapstructure:"enabled"`
	Processors TracesProcessors         `mapstructure:"processors"`
	Sampler    contribsdkconfig.Sampler `mapstructure:"sampler"`
}

type TracesProcessors struct {
	Batch contribsdkconfig.BatchSpanProcessor `mapstructure:"batch"`
}

// MetricsConfig holds the configuration for the metrics component.
type MetricsConfig struct {
	Enabled bool           `mapstructure:"enabled"`
	Readers MetricsReaders `mapstructure:"readers"`
}

type MetricsReaders struct {
	Pull contribsdkconfig.PullMetricReader `mapstructure:"pull"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("instrumentation"), newConfig)
}

func newConfig() factory.Config {
	host := "0.0.0.0"
	port := 9090

	return Config{
		Logs: LogsConfig{
			Level: slog.LevelInfo,
		},
		Traces: TracesConfig{
			Enabled: false,
		},
		Metrics: MetricsConfig{
			Enabled: true,
			Readers: MetricsReaders{
				Pull: contribsdkconfig.PullMetricReader{
					Exporter: contribsdkconfig.MetricExporter{
						Prometheus: &contribsdkconfig.Prometheus{
							Host: &host,
							Port: &port,
						},
					},
				},
			},
		},
	}

}

func (c Config) Validate() error {
	return nil
}
