package httplicensing

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/ee/licensing/licensingstore/sqllicensingstore"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type provider struct {
	store     licensetypes.Store
	zeus      zeus.Zeus
	config    licensing.Config
	settings  factory.ScopedProviderSettings
	orgGetter organization.Getter
	analytics analytics.Analytics
	stopChan  chan struct{}
}

func NewProviderFactory(store sqlstore.SQLStore, zeus zeus.Zeus, orgGetter organization.Getter, analytics analytics.Analytics) factory.ProviderFactory[licensing.Licensing, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("http"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.Licensing, error) {
		return New(ctx, providerSettings, config, store, zeus, orgGetter, analytics)
	})
}

func New(ctx context.Context, ps factory.ProviderSettings, config licensing.Config, sqlstore sqlstore.SQLStore, zeus zeus.Zeus, orgGetter organization.Getter, analytics analytics.Analytics) (licensing.Licensing, error) {
	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/ee/licensing/httplicensing")
	licensestore := sqllicensingstore.New(sqlstore)
	return &provider{
		store:     licensestore,
		zeus:      zeus,
		config:    config,
		settings:  settings,
		orgGetter: orgGetter,
		stopChan:  make(chan struct{}),
		analytics: analytics,
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	tick := time.NewTicker(provider.config.PollInterval)
	defer tick.Stop()

	err := provider.Validate(ctx)
	if err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to validate license from upstream server", errors.Attr(err))
	}

	for {
		select {
		case <-provider.stopChan:
			return nil
		case <-tick.C:
			err := provider.Validate(ctx)
			if err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to validate license from upstream server", errors.Attr(err))
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

	return nil
}

func (provider *provider) Activate(ctx context.Context, organizationID valuer.UUID, key string) (*licensetypes.License, error) {
	zeusLicense, err := provider.zeus.GetLicense(ctx, key)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to fetch license data with upstream server")
	}

	license, err := licensetypes.NewLicense(zeusLicense, organizationID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to create license entity")
	}

	storableLicense := licensetypes.NewStorableLicenseFromLicense(license)
	err = provider.store.Create(ctx, storableLicense)
	if err != nil {
		return nil, err
	}

	return license, nil
}

func (provider *provider) Get(ctx context.Context, organizationID valuer.UUID, licenseID valuer.UUID) (*licensetypes.License, error) {
	storableLicense, err := provider.store.Get(ctx, organizationID, licenseID)
	if err != nil {
		return nil, err
	}

	return licensetypes.NewLicenseFromStorableLicense(storableLicense)
}

func (provider *provider) List(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.License, error) {
	storableLicenses, err := provider.store.GetAll(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	licenses := make([]*licensetypes.License, 0, len(storableLicenses))
	for _, storableLicense := range storableLicenses {
		license, err := licensetypes.NewLicenseFromStorableLicense(storableLicense)
		if err != nil {
			return nil, err
		}

		licenses = append(licenses, license)
	}

	return licenses, nil
}

func (provider *provider) Delete(ctx context.Context, organizationID valuer.UUID, licenseID valuer.UUID) error {
	license, err := provider.Get(ctx, organizationID, licenseID)
	if err != nil {
		return err
	}

	if err := license.ErrIfCloud(); err != nil {
		return errors.WithAdditionalf(err, "license %s cannot be deleted", licenseID.StringValue())
	}

	return provider.store.Delete(ctx, organizationID, licenseID)
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
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return nil
		}
		provider.settings.Logger().ErrorContext(ctx, "license validation failed", slog.String("org_id", organizationID.StringValue()))
		return err
	}

	zeusLicense, err := provider.zeus.GetLicense(ctx, activeLicense.Key)
	if err != nil {
		if time.Since(activeLicense.LastValidatedAt) > time.Duration(provider.config.FailureThreshold)*provider.config.PollInterval {
			activeLicense.UpdateFeatures(licensetypes.BasicPlan)
			updatedStorableLicense := licensetypes.NewStorableLicenseFromLicense(activeLicense)
			err = provider.store.Update(ctx, organizationID, updatedStorableLicense)
			if err != nil {
				return err
			}

			return nil
		}
		return err
	}

	err = activeLicense.Update(zeusLicense)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to create license entity from license data")
	}

	updatedStorableLicense := licensetypes.NewStorableLicenseFromLicense(activeLicense)
	err = provider.store.Update(ctx, organizationID, updatedStorableLicense)
	if err != nil {
		return err
	}

	stats := licensetypes.NewStatsFromLicense(activeLicense)
	provider.analytics.Send(ctx,
		analyticstypes.Track{
			UserId:     "stats_" + organizationID.String(),
			Event:      "License Updated",
			Properties: analyticstypes.NewPropertiesFromMap(stats),
			Context: &analyticstypes.Context{
				Extra: map[string]interface{}{
					analyticstypes.KeyGroupID: organizationID.String(),
				},
			},
		},
		analyticstypes.Group{
			UserId:  "stats_" + organizationID.String(),
			GroupId: organizationID.String(),
			Traits:  analyticstypes.NewTraitsFromMap(stats),
		},
	)

	return nil
}

func (provider *provider) GetFeatureFlags(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.Feature, error) {
	license, err := provider.GetActive(ctx, organizationID)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return licensetypes.BasicPlan, nil
		}
		return nil, err
	}

	return license.Features, nil
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	activeLicense, err := provider.GetActive(ctx, orgID)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return map[string]any{}, nil
		}

		return nil, err
	}

	return licensetypes.NewStatsFromLicense(activeLicense), nil
}
