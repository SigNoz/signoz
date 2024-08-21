package config

import (
	"context"

	"go.signoz.io/signoz/pkg/instrumentation"
)

// Config defines the entire configuration of signoz.
type Config struct {
	Instrumentation instrumentation.Config `mapstructure:"instrumentation"`
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
	default:
		return nil, false
	}

}
