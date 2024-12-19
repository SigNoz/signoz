package config

import (
	"fmt"

	"go.opentelemetry.io/collector/confmap"
	signozconfmap "go.signoz.io/signoz/pkg/confmap"
)

// unmarshal converts a confmap.Conf into a Config struct.
// It splits the input confmap into a map of key-value pairs, fetches the corresponding
// signozconfmap.Config interface by name, merges it with the default config, validates it,
// and then creates a new confmap from the parsed map to unmarshal into the Config struct.
func unmarshal(conf *confmap.Conf) (*Config, error) {
	raw := make(map[string]any)
	if err := conf.Unmarshal(&raw); err != nil {
		return nil, err
	}

	parsed := make(map[string]any)

	for k := range raw {
		e, ok := byName(k)
		if !ok {
			return nil, fmt.Errorf("cannot find config with name %q", k)
		}
		i, ok := e.(signozconfmap.Config)
		if !ok {
			return nil, fmt.Errorf("config %q does not implement \"signozconfmap.Config\"", k)
		}

		sub, err := conf.Sub(k)
		if err != nil {
			return nil, fmt.Errorf("cannot read config for %q: %w", k, err)
		}

		d := i.NewWithDefaults()
		if err := sub.Unmarshal(&d); err != nil {
			return nil, fmt.Errorf("cannot merge config for %q: %w", k, err)
		}

		err = d.Validate()
		if err != nil {
			return nil, fmt.Errorf("failed to validate config for for %q: %w", k, err)
		}

		parsed[k] = d
	}

	parsedConf := confmap.NewFromStringMap(parsed)
	config := new(Config)
	err := parsedConf.Unmarshal(config)
	if err != nil {
		return nil, fmt.Errorf("cannot unmarshal config: %w", err)
	}

	return config, nil
}
