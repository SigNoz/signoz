package httplicensing

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/ee/licensing/licensingstore/sqllicensingstore"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/tidwall/gjson"
)

type provider struct {
	store    licensetypes.Store
	zeus     zeus.Zeus
	config   licensing.Config
	settings factory.ScopedProviderSettings
	stopChan chan struct{}
}

func NewProviderFactory(store sqlstore.SQLStore, zeus zeus.Zeus) factory.ProviderFactory[licensing.Licensing, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("http"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.Licensing, error) {
		return New(ctx, providerSettings, config, store, zeus)
	})
}

func New(ctx context.Context, ps factory.ProviderSettings, config licensing.Config, sqlstore sqlstore.SQLStore, zeus zeus.Zeus) (licensing.Licensing, error) {
	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/ee/licensing/httplicensing")
	licensestore := sqllicensingstore.New(sqlstore)
	return &provider{store: licensestore, zeus: zeus, config: config, settings: settings, stopChan: make(chan struct{})}, nil
}

func (provider *provider) Start(ctx context.Context) error {
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

func (provider *provider) Stop(ctx context.Context) error {
	provider.settings.Logger().DebugContext(ctx, "license validation stopped")
	close(provider.stopChan)
	return nil
}

func (provider *provider) Validate(ctx context.Context) error {
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
			err = provider.InitFeatures(ctx, licensetypes.BasicPlan)
			if err != nil {
				return err
			}
			return nil
		}

		license, err := GettableLicenseFromZeus(ctx, activeLicense.Key, provider.zeus)
		if err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to validate the license with upstream server", "licenseID", activeLicense.Key, "organizationID", organizationID.StringValue())
			license, err := provider.store.Get(ctx, organizationID, valuer.MustNewUUID(activeLicense.ID))
			if err != nil {
				return err
			}

			if time.Since(license.LastValidatedAt) > 3*provider.config.ValidationFrequency {
				provider.settings.Logger().ErrorContext(ctx, "license validation failed for consecutive 3 validation cycles. defaulting to basic plan", "licenseID", license.ID.StringValue(), "organizationID", organizationID.StringValue())
				err = provider.InitFeatures(ctx, licensetypes.BasicPlan)
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
		provider.settings.Logger().DebugContext(ctx, "no organizations found, defaulting to basic plan")
		err = provider.InitFeatures(ctx, licensetypes.BasicPlan)
		if err != nil {
			return err
		}
	}

	return nil
}

func (provider *provider) Update(ctx context.Context, organizationID valuer.UUID, license *licensetypes.GettableLicense) error {
	storableLicense := licensetypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, time.Now(), organizationID)
	err := provider.store.Update(ctx, organizationID, storableLicense)
	if err != nil {
		return err
	}

	err = provider.InitFeatures(ctx, license.Features)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) Activate(ctx context.Context, organizationID valuer.UUID, key string) error {
	license, err := GettableLicenseFromZeus(ctx, key, provider.zeus)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to validate license data with upstream server")
	}

	storableLicense := licensetypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, time.Now(), organizationID)
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

func (provider *provider) Get(ctx context.Context, orgID valuer.UUID, ID valuer.UUID) (*licensetypes.GettableLicense, error) {
	storableLicense, err := provider.store.Get(ctx, orgID, ID)
	if err != nil {
		return nil, err
	}

	gettableLicense, err := licensetypes.NewGettableLicense(storableLicense.Data)
	if err != nil {
		return nil, err
	}

	return gettableLicense, nil
}

func (provider *provider) GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.GettableLicense, error) {
	storableLicenses, err := provider.store.GetAll(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	var activeLicense *licensetypes.GettableLicense
	for _, storableLicense := range storableLicenses {
		gettableLicense, err := licensetypes.NewGettableLicenseWithIDAndKey(storableLicense.ID.StringValue(), storableLicense.Key, storableLicense.Data)
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

func (provider *provider) GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.GettableLicense, error) {
	storableLicenses, err := provider.store.GetAll(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	gettableLicenses := make([]*licensetypes.GettableLicense, len(storableLicenses))
	for idx, storableLicense := range storableLicenses {
		gettableLicense, err := licensetypes.NewGettableLicense(storableLicense.Data)
		if err != nil {
			return nil, err
		}
		gettableLicenses[idx] = gettableLicense
	}

	return gettableLicenses, nil
}

func (provider *provider) Refresh(ctx context.Context, organizationID valuer.UUID) error {
	activeLicense, err := provider.GetActive(ctx, organizationID)
	if err != nil {
		return err
	}

	license, err := GettableLicenseFromZeus(ctx, activeLicense.Key, provider.zeus)
	if err != nil {
		return err
	}

	updatedLicense := licensetypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, time.Now(), organizationID)
	err = provider.store.Update(ctx, organizationID, updatedLicense)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) Checkout(ctx context.Context, organizationID valuer.UUID, postableSubscription *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error) {
	activeLicense, err := provider.GetActive(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	redirectURL, err := GettableCheckoutSessionFromZeus(ctx, postableSubscription, activeLicense.Key, provider.zeus)
	if err != nil {
		return nil, err
	}

	return &licensetypes.GettableSubscription{RedirectURL: redirectURL}, nil
}

func (provider *provider) Portal(ctx context.Context, organizationID valuer.UUID, postableSubscription *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error) {
	activeLicense, err := provider.GetActive(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	redirectURL, err := GettablePortalSessionFromZeus(ctx, postableSubscription, activeLicense.Key, provider.zeus)
	if err != nil {
		return nil, err
	}

	return &licensetypes.GettableSubscription{RedirectURL: redirectURL}, nil
}

func GettableLicenseFromZeus(ctx context.Context, licenseKey string, zeus zeus.Zeus) (*licensetypes.GettableLicense, error) {
	data, err := zeus.GetLicense(ctx, licenseKey)
	if err != nil {
		return nil, err
	}

	var m map[string]any
	if err = json.Unmarshal(data, &m); err != nil {
		return nil, err
	}

	license, err := licensetypes.NewGettableLicense(m)
	if err != nil {
		return nil, err
	}

	return license, nil
}

func GettableCheckoutSessionFromZeus(ctx context.Context, checkoutRequest *licensetypes.PostableSubscription, licenseKey string, zeus zeus.Zeus) (string, error) {
	body, err := json.Marshal(checkoutRequest)
	if err != nil {
		return "", err
	}

	response, err := zeus.GetCheckoutURL(ctx, licenseKey, body)
	if err != nil {
		return "", err
	}

	return gjson.GetBytes(response, "url").String(), nil
}

func GettablePortalSessionFromZeus(ctx context.Context, portalRequest *licensetypes.PostableSubscription, licenseKey string, zeus zeus.Zeus) (string, error) {
	body, err := json.Marshal(portalRequest)
	if err != nil {
		return "", err
	}

	response, err := zeus.GetPortalURL(ctx, licenseKey, body)
	if err != nil {
		return "", err
	}

	return gjson.GetBytes(response, "url").String(), nil
}

// feature surrogate
func (provider *provider) CheckFeature(ctx context.Context, key string) error {
	feature, err := provider.store.GetFeature(ctx, key)
	if err != nil {
		return err
	}
	if feature.Active {
		return nil
	}
	return errors.Newf(errors.TypeUnsupported, licensing.ErrCodeFeatureUnavailable, "feature unavailable: %s", key)
}

func (provider *provider) GetFeatureFlag(ctx context.Context, key string) (*featuretypes.GettableFeature, error) {
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

func (provider *provider) GetFeatureFlags(ctx context.Context) ([]*featuretypes.GettableFeature, error) {
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

func (provider *provider) InitFeatures(ctx context.Context, features []*featuretypes.GettableFeature) error {
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

func (provider *provider) UpdateFeatureFlag(ctx context.Context, feature *featuretypes.GettableFeature) error {
	return provider.store.UpdateFeature(ctx, &featuretypes.StorableFeature{
		Name:       feature.Name,
		Active:     feature.Active,
		Usage:      int(feature.Usage),
		UsageLimit: int(feature.UsageLimit),
		Route:      feature.Route,
	})
}

func (provider *provider) ListOrganizations(ctx context.Context) ([]valuer.UUID, error) {
	return provider.store.ListOrganizations(ctx)
}
