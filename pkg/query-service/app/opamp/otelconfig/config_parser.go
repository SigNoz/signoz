package otelconfig

import (
	"fmt"

	"github.com/SigNoz/signoz-otel-collector/components"
	"go.opentelemetry.io/collector/config/configtelemetry"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/connector"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/extension"
	"go.opentelemetry.io/collector/otelcol"
	"go.opentelemetry.io/collector/processor"
	"go.opentelemetry.io/collector/receiver"
	"go.opentelemetry.io/collector/service"
	"go.opentelemetry.io/collector/service/telemetry"
	"go.uber.org/zap/zapcore"
	"gopkg.in/yaml.v2"
)

type configSettings struct {
	Receivers  *Configs[receiver.Factory]  `mapstructure:"receivers"`
	Processors *Configs[processor.Factory] `mapstructure:"processors"`
	Exporters  *Configs[exporter.Factory]  `mapstructure:"exporters"`
	Connectors *Configs[connector.Factory] `mapstructure:"connectors"`
	Extensions *Configs[extension.Factory] `mapstructure:"extensions"`
	Service    service.Config              `mapstructure:"service"`
}

// IsValid returns true if the content of the configuration file is valid.
func IsValid(content []byte) bool {
	cfg, err := Parse(content)
	if err != nil {
		return false
	}
	return cfg.Validate() == nil
}

// Parse parses the content of the configuration file and returns a Config.
func Parse(content []byte) (*otelcol.Config, error) {
	// Unmarshal the config into a map[string]interface{} to be able to
	// use the confmap package to unmarshal the config.
	var rawConf map[string]interface{}
	if err := yaml.Unmarshal(content, &rawConf); err != nil {
		return nil, err
	}

	conf := confmap.NewFromStringMap(rawConf)

	// Get the factories to be able to unmarshal the config.
	// This includes the custom factories maintained by SigNoz
	// that are not part of the core.
	factories, err := components.Components()
	if err != nil {
		return nil, err
	}

	var cfg *configSettings
	if cfg, err = unmarshal(conf, factories); err != nil {
		return nil, fmt.Errorf("cannot unmarshal the configuration: %w", err)
	}

	return &otelcol.Config{
		Receivers:  cfg.Receivers.Configs(),
		Processors: cfg.Processors.Configs(),
		Exporters:  cfg.Exporters.Configs(),
		Connectors: cfg.Connectors.Configs(),
		Extensions: cfg.Extensions.Configs(),
		Service:    cfg.Service,
	}, nil
}

// unmarshal the configSettings from a confmap.Conf.
// After the config is unmarshalled, `Validate()` must be called to validate.
func unmarshal(v *confmap.Conf, factories otelcol.Factories) (*configSettings, error) {
	// Unmarshal top level sections and validate.
	cfg := &configSettings{
		Receivers:  NewConfigs(factories.Receivers),
		Processors: NewConfigs(factories.Processors),
		Exporters:  NewConfigs(factories.Exporters),
		Connectors: NewConfigs(factories.Connectors),
		Extensions: NewConfigs(factories.Extensions),
		Service: service.Config{
			Telemetry: telemetry.Config{
				Logs: telemetry.LogsConfig{
					Level:       zapcore.InfoLevel,
					Development: false,
					Encoding:    "console",
					Sampling: &telemetry.LogsSamplingConfig{
						Initial:    100,
						Thereafter: 100,
					},
					OutputPaths:       []string{"stderr"},
					ErrorOutputPaths:  []string{"stderr"},
					DisableCaller:     false,
					DisableStacktrace: false,
					InitialFields:     map[string]interface{}(nil),
				},
				Metrics: telemetry.MetricsConfig{
					Level:   configtelemetry.LevelBasic,
					Address: ":8888",
				},
			},
		},
	}

	return cfg, v.Unmarshal(&cfg, confmap.WithErrorUnused())
}
