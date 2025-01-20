package config

import (
	"context"
	"errors"
	"fmt"
)

type ResolverConfig struct {
	// Each string or `uri` must follow "<scheme>:<value>" format. This format is compatible with the URI definition
	// defined at https://datatracker.ietf.org/doc/html/rfc3986".
	// It is required to have at least one uri.
	Uris []string

	// ProviderFactories is a slice of Provider factories.
	// It is required to have at least one factory.
	ProviderFactories []ProviderFactory
}

type Resolver struct {
	uris      []Uri
	providers map[string]Provider
}

func NewResolver(config ResolverConfig) (*Resolver, error) {
	if len(config.Uris) == 0 {
		return nil, errors.New("cannot build resolver, no uris have been provided")
	}

	if len(config.ProviderFactories) == 0 {
		return nil, errors.New("cannot build resolver, no providers have been provided")
	}

	uris := make([]Uri, len(config.Uris))
	for i, inputUri := range config.Uris {
		uri, err := NewUri(inputUri)
		if err != nil {
			return nil, err
		}

		uris[i] = uri
	}

	providers := make(map[string]Provider, len(config.ProviderFactories))
	for _, factory := range config.ProviderFactories {
		provider := factory.New(ProviderConfig{})

		scheme := provider.Scheme()
		// Check that the scheme is unique.
		if _, ok := providers[scheme]; ok {
			return nil, fmt.Errorf("cannot build resolver, duplicate scheme %q found", scheme)
		}

		providers[provider.Scheme()] = provider
	}

	return &Resolver{
		uris:      uris,
		providers: providers,
	}, nil
}

func (resolver *Resolver) Do(ctx context.Context) (*Conf, error) {
	conf := NewConf()

	for _, uri := range resolver.uris {
		currentConf, err := resolver.get(ctx, uri)
		if err != nil {
			return nil, err
		}

		if err = conf.Merge(currentConf); err != nil {
			return nil, fmt.Errorf("cannot merge config: %w", err)
		}
	}

	return conf, nil
}

func (resolver *Resolver) get(ctx context.Context, uri Uri) (*Conf, error) {
	provider, ok := resolver.providers[uri.scheme]
	if !ok {
		return nil, fmt.Errorf("cannot find provider with schema %q", uri.scheme)
	}

	return provider.Get(ctx, uri)
}
