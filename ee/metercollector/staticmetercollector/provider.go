// Package staticmetercollector emits a fixed-value meter reading per org per window.
package staticmetercollector

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const providerName = "static"

var _ metercollector.MeterCollector = (*Provider)(nil)

type Provider struct {
	settings factory.ScopedProviderSettings
	config   metercollector.StaticConfig
}

func New() factory.ProviderFactory[metercollector.MeterCollector, metercollector.StaticConfig] {
	return factory.NewProviderFactory(
		factory.MustNewName(providerName),
		func(ctx context.Context, providerSettings factory.ProviderSettings, config metercollector.StaticConfig) (metercollector.MeterCollector, error) {
			return newProvider(providerSettings, config), nil
		},
	)
}

func newProvider(providerSettings factory.ProviderSettings, config metercollector.StaticConfig) *Provider {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/metercollector/staticmetercollector")

	return &Provider{
		settings: settings,
		config:   config,
	}
}

func (provider *Provider) Name() zeustypes.MeterName { return provider.config.Name }
func (provider *Provider) Unit() zeustypes.MeterUnit { return provider.config.Unit }
func (provider *Provider) Aggregation() zeustypes.MeterAggregation {
	return provider.config.Aggregation
}

func (provider *Provider) Origin(_ context.Context, _ valuer.UUID, _ time.Time) (time.Time, error) {
	return time.Time{}, nil
}

func (provider *Provider) Collect(
	_ context.Context,
	orgID valuer.UUID,
	license *licensetypes.License,
	window zeustypes.MeterWindow,
) ([]zeustypes.Meter, error) {
	if license == nil || license.Key == "" {
		return nil, nil
	}

	return []zeustypes.Meter{
		zeustypes.NewMeter(
			provider.config.Name,
			provider.config.Value,
			provider.config.Unit,
			provider.config.Aggregation,
			window,
			zeustypes.NewDimensions(zeustypes.OrganizationID.String(orgID.StringValue())),
		),
	}, nil
}
