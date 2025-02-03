package base

import (
	"context"

	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/featureflag"
)

type Provider struct {
}

func NewFactory() factory.ProviderFactory[featureflag.FeatureFlag, featureflag.Config] {
	return factory.NewProviderFactory(factory.MustNewName("base-features"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config featureflag.Config) (featureflag.FeatureFlag, error) {
	return &Provider{}, nil
}

func (p *Provider) GetFeatures() []featureflag.Feature {
	// TODO : update from sqlite
	return defaultFeatures
}
