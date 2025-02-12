package config

import (
	"context"

	"go.signoz.io/signoz/pkg/factory"
)

func New(ctx context.Context, resolverConfig ResolverConfig, configFactories []factory.ConfigFactory) (*Conf, error) {
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
		if err := conf.Set(factory.Name().String(), c); err != nil {
			return nil, err
		}
	}

	err = conf.Merge(resolvedConf)
	if err != nil {
		return nil, err
	}

	return conf, nil
}
