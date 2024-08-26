package config

import (
	"context"

	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/web"
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

func byName(name string) (any, bool) {
	switch name {
	case "instrumentation":
		return &instrumentation.Config{}, true
	case "web":
		return &web.Config{}, true
	default:
		return nil, false
	}

}
