package config

import "context"

// NewConfigFunc is a function that creates a new config.
type NewConfigFunc = func() Config

// ConfigFactory is a factory that creates a new config.
type ConfigFactory interface {
	New() Config
}

// NewProviderFactory creates a new provider factory.
func NewConfigFactory(f NewConfigFunc) ConfigFactory {
	return &configFactory{f: f}
}

// configFactory is a factory that implements the ConfigFactory interface.
type configFactory struct {
	f NewConfigFunc
}

// New creates a new provider.
func (factory *configFactory) New() Config {
	return factory.f()
}

// Config is an interface that defines methods for creating and validating configurations.
type Config interface {
	// Key returns the name of the root key of the config.
	Key() string
	// Validate the configuration and returns an error if invalid.
	Validate() error
}

func New(ctx context.Context, resolverConfig ResolverConfig, configFactories []ConfigFactory) (*Conf, error) {
	// Get the config from the resolver
	resolver, err := NewResolver(resolverConfig)
	if err != nil {
		return nil, err
	}

	resolvedConf, err := resolver.Do(ctx)
	if err != nil {
		return nil, err
	}

	conf := NewConf()
	// Set the default configs
	for _, factory := range configFactories {
		c := factory.New()
		if err := conf.Set(c.Key(), c); err != nil {
			return nil, err
		}
	}

	err = conf.Merge(resolvedConf)
	if err != nil {
		return nil, err
	}

	return conf, nil
}
