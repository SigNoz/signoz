package httplicensing

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/ee/licensing/licensingstore/sqllicensingstore"
	validate "github.com/SigNoz/signoz/ee/query-service/integrations/signozio"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/licensingtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type httplicensing struct {
	store    licensingtypes.Store
	zeus     zeus.Zeus
	config   licensing.Config
	settings factory.ScopedProviderSettings
	stopChan chan struct{}
}

func NewProviderFactory(store sqlstore.SQLStore, zeus zeus.Zeus) factory.ProviderFactory[licensing.Licensing, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz_license"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.Licensing, error) {
		return New(ctx, providerSettings, config, store, zeus)
	})
}

func New(ctx context.Context, ps factory.ProviderSettings, config licensing.Config, sqlstore sqlstore.SQLStore, zeus zeus.Zeus) (licensing.Licensing, error) {
	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/ee/licensing/signozlicense")
	licensestore := sqllicensingstore.New(sqlstore)
	return &httplicensing{store: licensestore, zeus: zeus, config: config, settings: settings, stopChan: make(chan struct{})}, nil
}

func (provider *httplicensing) Start(ctx context.Context) error {
	tick := time.NewTicker(provider.config.ValidationFrequency)
	defer tick.Stop()

	err := provider.Validate(ctx)
	if err != nil {
		return err
	}

	for {
		select {
		case <-provider.stopChan:
			return nil
		case <-tick.C:
			provider.Validate(ctx)
		}
	}
}

func (provider *httplicensing) Stop(context.Context) error {
	close(provider.stopChan)
	return nil
}

func (provider *httplicensing) Validate(ctx context.Context) error {
	organizations, err := provider.store.ListOrganizations(ctx)
	if err != nil {
		return err
	}

	for _, organizationID := range organizations {
		provider.settings.Logger().DebugContext(ctx, "license validation started for organizationID", "organizationID", organizationID.StringValue())
		activeLicense, err := provider.GetActive(ctx, organizationID)
		if err != nil && !errors.Ast(err, errors.TypeNotFound) {
			provider.settings.Logger().ErrorContext(ctx, "license validation failed", "organizationID", organizationID.StringValue())
			return err
		}

		if err != nil && errors.Ast(err, errors.TypeNotFound) {
			provider.settings.Logger().DebugContext(ctx, "no active license found, defaulting to basic plan", "organizationID", organizationID.StringValue())
			err = provider.InitFeatures(ctx, licensingtypes.BasicPlan)
			if err != nil {
				return err
			}
			return nil
		}

		license, err := validate.ValidateLicenseV3(ctx, activeLicense.Key, provider.zeus)
		if err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to validate the license with upstream server", "licenseID", activeLicense.Key, "organizationID", organizationID.StringValue())
			license, err := provider.store.Get(ctx, organizationID, valuer.MustNewUUID(activeLicense.ID))
			if err != nil {
				return err
			}

			if time.Since(license.LastValidatedAt) > 3*provider.config.ValidationFrequency {
				provider.settings.Logger().ErrorContext(ctx, "license validation failed for consecutive 3 days. defaulting to basic plan", "licenseID", license.ID.StringValue(), "organizationID", organizationID.StringValue())
				err = provider.InitFeatures(ctx, licensingtypes.BasicPlan)
				if err != nil {
					return err
				}
				return nil
			}
			return err
		}

		provider.settings.Logger().DebugContext(ctx, "license validation completed successfully", "licenseID", license.ID, "organizationID", organizationID.StringValue())
		err = provider.Update(ctx, organizationID, license)
		if err != nil {
			return err
		}
	}

	if len(organizations) == 0 {
		err = provider.InitFeatures(ctx, licensingtypes.BasicPlan)
		if err != nil {
			return err
		}
	}

	return nil
}

func (provider *httplicensing) Update(ctx context.Context, organizationID valuer.UUID, license *licensingtypes.GettableLicense) error {
	storableLicense := licensingtypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, time.Now(), organizationID)
	err := provider.store.Update(ctx, storableLicense)
	if err != nil {
		return err
	}

	err = provider.InitFeatures(ctx, license.Features)
	if err != nil {
		return err
	}

	return nil
}

func (provider *httplicensing) Activate(ctx context.Context, organizationID valuer.UUID, key string) error {
	license, err := validate.ValidateLicenseV3(ctx, key, provider.zeus)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to validate license data with upstream server")
	}

	storableLicense := licensingtypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, time.Now(), organizationID)
	err = provider.store.Create(ctx, storableLicense)
	if err != nil {
		return err
	}

	err = provider.InitFeatures(ctx, license.Features)
	if err != nil {
		return err
	}

	return nil
}

func (provider *httplicensing) Get(ctx context.Context, orgID valuer.UUID, ID valuer.UUID) (*licensingtypes.GettableLicense, error) {
	storableLicense, err := provider.store.Get(ctx, orgID, ID)
	if err != nil {
		return nil, err
	}

	gettableLicense, err := licensingtypes.NewGettableLicense(storableLicense.Data)
	if err != nil {
		return nil, err
	}

	return gettableLicense, nil
}

func (provider *httplicensing) GetActive(ctx context.Context, organizationID valuer.UUID) (*licensingtypes.GettableLicense, error) {
	storableLicenses, err := provider.store.GetAll(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	var activeLicense *licensingtypes.GettableLicense
	for _, storableLicense := range storableLicenses {
		gettableLicense, err := licensingtypes.NewGettableLicenseWithIDAndKey(storableLicense.ID.StringValue(), storableLicense.Key, storableLicense.Data)
		if err != nil {
			return nil, err
		}

		if activeLicense == nil &&
			(gettableLicense.ValidFrom != 0) &&
			(gettableLicense.ValidUntil == -1 || gettableLicense.ValidUntil > time.Now().Unix()) {
			activeLicense = gettableLicense
		}
		if activeLicense != nil &&
			gettableLicense.ValidFrom > activeLicense.ValidFrom &&
			(gettableLicense.ValidUntil == -1 || gettableLicense.ValidUntil > time.Now().Unix()) {
			activeLicense = gettableLicense
		}
	}

	if activeLicense == nil {
		return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no active license found for the organization %s", organizationID.StringValue())
	}

	return activeLicense, nil
}

func (provider *httplicensing) GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensingtypes.GettableLicense, error) {
	storableLicenses, err := provider.store.GetAll(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	gettableLicenses := make([]*licensingtypes.GettableLicense, len(storableLicenses))
	for idx, storableLicense := range storableLicenses {
		gettableLicense, err := licensingtypes.NewGettableLicense(storableLicense.Data)
		if err != nil {
			return nil, err
		}
		gettableLicenses[idx] = gettableLicense
	}

	return gettableLicenses, nil
}

func (provider *httplicensing) Refresh(ctx context.Context, organizationID valuer.UUID) error {
	activeLicense, err := provider.GetActive(ctx, organizationID)
	if err != nil {
		return err
	}

	license, err := validate.ValidateLicenseV3(ctx, activeLicense.Key, provider.zeus)
	if err != nil {
		return err
	}

	updatedLicense := licensingtypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, time.Now(), organizationID)
	err = provider.store.Update(ctx, updatedLicense)
	if err != nil {
		return err
	}

	return nil
}

// feature surrogate
func (provider *httplicensing) CheckFeature(ctx context.Context, key string) error {
	feature, err := provider.store.GetFeature(ctx, key)
	if err != nil {
		return err
	}
	if feature.Active {
		return nil
	}
	return errors.Newf(errors.TypeUnsupported, licensing.ErrCodeFeatureUnavailable, "feature unavailable: %s", key)
}

func (provider *httplicensing) GetFeatureFlag(ctx context.Context, key string) (*featuretypes.GettableFeature, error) {
	featureStatus, err := provider.store.GetFeature(ctx, key)
	if err != nil {
		return nil, err
	}
	return &featuretypes.GettableFeature{
		Name:       featureStatus.Name,
		Active:     featureStatus.Active,
		Usage:      int64(featureStatus.Usage),
		UsageLimit: int64(featureStatus.UsageLimit),
		Route:      featureStatus.Route,
	}, nil
}

func (provider *httplicensing) GetFeatureFlags(ctx context.Context) ([]*featuretypes.GettableFeature, error) {
	storableFeatures, err := provider.store.GetAllFeatures(ctx)
	if err != nil {
		return nil, err
	}

	gettableFeatures := make([]*featuretypes.GettableFeature, len(storableFeatures))
	for idx, gettableFeature := range storableFeatures {
		gettableFeatures[idx] = &featuretypes.GettableFeature{
			Name:       gettableFeature.Name,
			Active:     gettableFeature.Active,
			Usage:      int64(gettableFeature.Usage),
			UsageLimit: int64(gettableFeature.UsageLimit),
			Route:      gettableFeature.Route,
		}
	}

	return gettableFeatures, nil
}

func (provider *httplicensing) InitFeatures(ctx context.Context, features []*featuretypes.GettableFeature) error {
	featureStatus := make([]*featuretypes.StorableFeature, len(features))
	for i, f := range features {
		featureStatus[i] = &featuretypes.StorableFeature{
			Name:       f.Name,
			Active:     f.Active,
			Usage:      int(f.Usage),
			UsageLimit: int(f.UsageLimit),
			Route:      f.Route,
		}
	}

	return provider.store.InitFeatures(ctx, featureStatus)
}

func (provider *httplicensing) UpdateFeatureFlag(ctx context.Context, feature *featuretypes.GettableFeature) error {
	return provider.store.UpdateFeature(ctx, &featuretypes.StorableFeature{
		Name:       feature.Name,
		Active:     feature.Active,
		Usage:      int(feature.Usage),
		UsageLimit: int(feature.UsageLimit),
		Route:      feature.Route,
	})
}

func (provider *httplicensing) ListOrganizations(ctx context.Context) ([]valuer.UUID, error) {
	return provider.store.ListOrganizations(ctx)
}
