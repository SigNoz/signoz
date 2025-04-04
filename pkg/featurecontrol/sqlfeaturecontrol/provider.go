package sqlfeaturecontrol

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/featurecontrol"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type provider struct {
	config       featurecontrol.Config
	settings     factory.ScopedProviderSettings
	featureStore featuretypes.FeatureStore
	licensing    licensing.Licensing
}

func NewFactory(registry *featuretypes.Registry, sqlstore sqlstore.SQLStore) factory.ProviderFactory[featurecontrol.FeatureControl, featurecontrol.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sql"), func(ctx context.Context, providerSettings factory.ProviderSettings, config featurecontrol.Config) (featurecontrol.FeatureControl, error) {
		return New(ctx, providerSettings, config, registry, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config featurecontrol.Config, registry *featuretypes.Registry, sqlstore sqlstore.SQLStore) (featurecontrol.FeatureControl, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/feature/memoryfeaturestore")
	featureStore := NewStore(sqlstore)

	return &provider{
		config:       config,
		settings:     settings,
		featureStore: featureStore,
	}, nil
}

func (provider *provider) ListOrgFeatures(ctx context.Context, orgID valuer.UUID) ([]*featuretypes.GettableOrgFeature, error) {
	orgFeatures, err := provider.featureStore.GetOrgFeatures(ctx, orgID)
	if err != nil {
		return nil, err
	}

	license, err := provider.licensing.GetLatestLicense(ctx, orgID)
	if err != nil {
		return nil, err
	}

	registry := license.FeatureRegistry()

	_, diff, err := registry.Diff(orgFeatures, license.LicenseFeatures())
	if err != nil {
		return nil, err
	}

	if err := provider.featureStore.SetOrgFeature(ctx, diff); err != nil {
		return nil, err
	}

	return nil, nil
}

func (provider *provider) SetDefault(ctx context.Context, orgID valuer.UUID) error {
	return nil
}

func (provider *provider) GetFeature(ctx context.Context, orgID valuer.UUID, name featuretypes.Name) (*featuretypes.GettableOrgFeature, error) {
	features, err := provider.ListOrgFeatures(ctx, orgID)
	if err != nil {
		return nil, err
	}

	for _, feature := range features {
		if feature.StorableFeature.Name == name {
			return feature, nil
		}
	}

	return nil, errors.Newf(errors.TypeNotFound, featuretypes.ErrCodeFeatureNotFound, "feature %s not found", name.String())
}

func (p *provider) Boolean(ctx context.Context, orgID valuer.UUID, name featuretypes.Name) (bool, error) {
	feature, err := p.GetFeature(ctx, orgID, name)
	if err != nil {
		return false, err
	}

	_, ok := feature.Value.(bool)
	if !ok {
		return false, errors.Newf(errors.TypeInvalidInput, featuretypes.ErrCodeFeatureKindMismatch, "feature %s is not a boolean", name.String())
	}

	return feature.Value.(bool), nil
}
