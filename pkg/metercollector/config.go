package metercollector

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
)

const (
	ProviderStatic    = "static"
	ProviderTelemetry = "telemetry"
)

type Config struct {
	Provider  string          `mapstructure:"provider"`
	Telemetry TelemetryConfig `mapstructure:"telemetry"`
	Static    StaticConfig    `mapstructure:"static"`
}

func (c Config) Validate() error {
	switch c.Provider {
	case ProviderStatic:
		return c.Static.Validate()
	case ProviderTelemetry:
		return c.Telemetry.Validate()
	default:
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidConfig, "meter collector: unknown provider %q", c.Provider)
	}
}

type TelemetryConfig struct {
	Name                 zeustypes.MeterName
	Unit                 zeustypes.MeterUnit
	Aggregation          zeustypes.MeterAggregation
	DBName               string
	TableName            string
	DefaultRetentionDays int
}

type StaticConfig struct {
	Name        zeustypes.MeterName
	Unit        zeustypes.MeterUnit
	Aggregation zeustypes.MeterAggregation
	Value       int64
}

func (c StaticConfig) Validate() error {
	if c.Name.IsZero() {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidConfig, "static meter collector: name must be set")
	}

	return nil
}

func (c TelemetryConfig) Validate() error {
	if c.Name.IsZero() {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidConfig, "telemetry meter collector: name must be set")
	}

	if c.DBName == "" || c.TableName == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidConfig, "telemetry meter collector: db_name and table_name are required")
	}

	if c.DefaultRetentionDays <= 0 {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidConfig, "telemetry meter collector: default_retention_days must be positive")
	}

	return nil
}
