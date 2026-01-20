package config

import (
	"context"
)

// NewProviderFunc is a function that creates a new provider.
type NewProviderFunc = func(ProviderConfig) Provider

// ProviderFactory is a factory that creates a new provider.
type ProviderFactory interface {
	New(ProviderConfig) Provider
}

// NewProviderFactory creates a new provider factory.
func NewProviderFactory(f NewProviderFunc) ProviderFactory {
	return &providerFactory{f: f}
}

// providerFactory is a factory that implements the ProviderFactory interface.
type providerFactory struct {
	f NewProviderFunc
}

// New creates a new provider.
func (factory *providerFactory) New(config ProviderConfig) Provider {
	return factory.f(config)
}

// ProviderConfig is the configuration for a provider.
type ProviderConfig struct{}

// Provider is an interface that represents a configuration provider.
type Provider interface {
	// Get returns the configuration for the given URI.
	Get(context.Context, Uri) (*Conf, error)
	// Scheme returns the scheme of the provider.
	Scheme() string
}
