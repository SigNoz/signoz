package noopsharder

import (
	"context"
	"math"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sharder"
)

type provider struct {
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[sharder.Sharder, sharder.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sharder.Config) (sharder.Sharder, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sharder/noopsharder")

	return &provider{
		settings: settings,
	}, nil
}

func (provider *provider) GetMyOwnedKeyRange(ctx context.Context) (uint64, uint64, error) {
	return 0, math.MaxUint64, nil
}

func (provider *provider) IsMyOwnedKey(ctx context.Context, key uint64) error {
	return nil
}
