package configtest

import (
	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
)

func NewResolverConfig() config.ResolverConfig {
	return config.ResolverConfig{
		Uris:              []string{"env:"},
		ProviderFactories: []config.ProviderFactory{envprovider.NewFactory()},
	}
}
