package httplicensing

import (
	"context"
	"encoding/json"
	"github.com/SigNoz/signoz/ee/query-service/constants"
	"time"

	"github.com/SigNoz/signoz/ee/licensing/licensingstore/sqllicensingstore"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/tidwall/gjson"
)

type provider struct {
	store     licensetypes.Store
	zeus      zeus.Zeus
	config    licensing.Config
	settings  factory.ScopedProviderSettings
	orgGetter organization.Getter
	stopChan  chan struct{}
}

func NewProviderFactory(store sqlstore.SQLStore, zeus zeus.Zeus, orgGetter organization.Getter) factory.ProviderFactory[licensing.Licensing, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("http"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.Licensing, error) {
		return New(ctx, providerSettings, config, store, zeus, orgGetter)
	})
}

func New(ctx context.Context, ps factory.ProviderSettings, config licensing.Config, sqlstore sqlstore.SQLStore, zeus zeus.Zeus, orgGetter organization.Getter) (licensing.Licensing, error) {
	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/ee/licensing/httplicensing")
	licensestore := sqllicensingstore.New(sqlstore)
	return &provider{
		store:     licensestore,
		zeus:      zeus,
		config:    config,
		settings:  settings,
		orgGetter: orgGetter,
		stopChan:  make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	tick := time.NewTicker(provider.config.PollInterval)
	defer tick.Stop()

	err := provider.Validate(ctx)
	if err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to validate license from upstream server", "error", err)
	}

	for {
		select {
		case <-provider.stopChan:
			return nil
		case <-tick.C:
			err := provider.Validate(ctx)
			if err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to validate license from upstream server", "error", err)
			}
		}
	}
}

func (provider *provider) Stop(ctx context.Context) error {
	provider.settings.Logger().DebugContext(ctx, "license validation stopped")
	close(provider.stopChan)
	return nil
}

func (provider *provider) Validate(ctx context.Context) error {
	organizations, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	for _, organization := range organizations {
		err := provider.Refresh(ctx, organization.ID)
		if err != nil {
			return err
		}
	}

	if len(organizations) == 0 {
		err = provider.InitFeatures(ctx, licensetypes.BasicPlan)
		if err != nil {
			return err
		}
	}

	return nil
}

func (provider *provider) Activate(ctx context.Context, organizationID valuer.UUID, key string) error {
	data, err := provider.zeus.GetLicense(ctx, key)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to fetch license data with upstream server")
	}

	license, err := licensetypes.NewLicense(data, organizationID)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to create license entity")
	}

	storableLicense := licensetypes.NewStorableLicenseFromLicense(license)
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

func (provider *provider) GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.License, error) {
	storableLicenses, err := provider.store.GetAll(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	activeLicense, err := licensetypes.GetActiveLicenseFromStorableLicenses(storableLicenses, organizationID)
	if err != nil {
		return nil, err
	}

	return activeLicense, nil
}

func (provider *provider) Refresh(ctx context.Context, organizationID valuer.UUID) error {
	activeLicense, err := provider.GetActive(ctx, organizationID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		provider.settings.Logger().ErrorContext(ctx, "license validation failed", "org_id", organizationID.StringValue())
		return err
	}

	if err != nil && errors.Ast(err, errors.TypeNotFound) {
		provider.settings.Logger().DebugContext(ctx, "no active license found, defaulting to basic plan", "org_id", organizationID.StringValue())
		err = provider.InitFeatures(ctx, licensetypes.BasicPlan)
		if err != nil {
			return err
		}
		return nil
	}

	data, err := provider.zeus.GetLicense(ctx, activeLicense.Key)
	if err != nil {
		if time.Since(activeLicense.LastValidatedAt) > time.Duration(provider.config.FailureThreshold)*provider.config.PollInterval {
			provider.settings.Logger().ErrorContext(ctx, "license validation failed for consecutive poll intervals, defaulting to basic plan", "failure_threshold", provider.config.FailureThreshold, "license_id", activeLicense.ID.StringValue(), "org_id", organizationID.StringValue())
			err = provider.InitFeatures(ctx, licensetypes.BasicPlan)
			if err != nil {
				return err
			}
			return nil
		}
		return err
	}

	err = activeLicense.Update(data)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to create license entity from license data")
	}

	updatedStorableLicense := licensetypes.NewStorableLicenseFromLicense(activeLicense)
	err = provider.store.Update(ctx, organizationID, updatedStorableLicense)
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

	body, err := json.Marshal(postableSubscription)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal checkout payload")
	}

	response, err := provider.zeus.GetCheckoutURL(ctx, activeLicense.Key, body)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to generate checkout session")
	}

	return &licensetypes.GettableSubscription{RedirectURL: gjson.GetBytes(response, "url").String()}, nil
}

func (provider *provider) Portal(ctx context.Context, organizationID valuer.UUID, postableSubscription *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error) {
	activeLicense, err := provider.GetActive(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	body, err := json.Marshal(postableSubscription)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal portal payload")
	}

	response, err := provider.zeus.GetPortalURL(ctx, activeLicense.Key, body)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to generate portal session")
	}

	return &licensetypes.GettableSubscription{RedirectURL: gjson.GetBytes(response, "url").String()}, nil
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

	if constants.IsDotMetricsEnabled {
		gettableFeatures = append(gettableFeatures, &featuretypes.GettableFeature{
			Name:   featuretypes.DotMetricsEnabled,
			Active: true,
		})
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
