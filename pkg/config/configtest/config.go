package configtest

import (
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/config/envprovider"
)

func NewResolverConfig() config.ResolverConfig {
	return config.ResolverConfig{
		Uris:              []string{"env:"},
		ProviderFactories: []config.ProviderFactory{envprovider.NewFactory()},
	}
}
