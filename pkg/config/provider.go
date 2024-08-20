package config

import (
	"context"
	"fmt"

	"go.opentelemetry.io/collector/confmap"
)

// Provides the configuration for signoz.
type Provider interface {
	// Get returns the configuration, or error otherwise.
	Get(ctx context.Context) (*Config, error)
}

type provider struct {
	resolver *confmap.Resolver
}

// ProviderSettings are the settings to configure the behavior of the Provider.
type ProviderSettings struct {
	// ResolverSettings are the settings to configure the behavior of the confmap.Resolver.
	ResolverSettings confmap.ResolverSettings
}

// NewProvider returns a new Provider that provides the entire configuration.
// See https://github.com/open-telemetry/opentelemetry-collector/blob/main/otelcol/configprovider.go for
// more details
func NewProvider(settings ProviderSettings) (Provider, error) {
	resolver, err := confmap.NewResolver(settings.ResolverSettings)
	if err != nil {
		return nil, err
	}

	return &provider{
		resolver: resolver,
	}, nil
}

func (provider *provider) Get(ctx context.Context) (*Config, error) {
	conf, err := provider.resolver.Resolve(ctx)
	if err != nil {
		return nil, fmt.Errorf("cannot resolve configuration: %w", err)
	}

	config, err := unmarshal(conf)
	if err != nil {
		return nil, fmt.Errorf("cannot unmarshal configuration: %w", err)
	}

	return config, nil
}
