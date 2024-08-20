package config

import "go.opentelemetry.io/collector/confmap"

// unmarshal confmap.Conf into signoz Config.
// After the config is unmarshalled, `Validate()` must be called to validate.
func unmarshal(_ *confmap.Conf) (*Config, error) {
	return nil, nil
}
