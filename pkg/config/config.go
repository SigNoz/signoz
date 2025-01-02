package config

import (
	"context"

	signozconfmap "go.signoz.io/signoz/pkg/confmap"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/web"
)

// This map contains the default values of all config structs
var (
	defaults = map[string]signozconfmap.Config{
		"instrumentation": &instrumentation.Config{},
		"web":             &web.Config{},
	}
)

// Config defines the entire configuration of signoz.
type Config struct {
	Instrumentation instrumentation.Config `mapstructure:"instrumentation"`
	Web             web.Config             `mapstructure:"web"`
}

func New(ctx context.Context, settings ProviderSettings) (*Config, error) {
	provider, err := NewProvider(settings)
	if err != nil {
		return nil, err
	}

	return provider.Get(ctx)
}
