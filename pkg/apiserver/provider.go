package apiserver

import (
	"context"
	"time"

	"go.signoz.io/signoz/pkg/factory"
)

type provider struct {
	config Config
}

func NewFactory() factory.ProviderFactory[APIServer, Config] {
	return factory.NewProviderFactory(factory.MustNewName("apiserver"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (APIServer, error) {
	return &provider{
		config: config,
	}, nil
}

func (a *provider) GetContextTimeout() time.Duration {
	return a.config.ContextTimeout
}

func (a *provider) GetContextTimeoutMaxAllowed() time.Duration {
	return a.config.ContextTimeoutMaxAllowed
}

func (a *provider) GetTimeoutExcludedRoutes() map[string]struct{} {
	excludedRoutes := make(map[string]struct{})
	for _, route := range a.config.TimeoutExcludedRoutes {
		excludedRoutes[route] = struct{}{}
	}
	return excludedRoutes
}
