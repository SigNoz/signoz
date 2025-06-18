package httplicensing

import (
	"context"
	"encoding/json"
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
	"github.com/tidwall/gjson"
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
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return nil
		}
		provider.settings.Logger().ErrorContext(ctx, "license validation failed", "org_id", organizationID.StringValue())
		return err
	}

	data, err := provider.zeus.GetLicense(ctx, activeLicense.Key)
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

	err = activeLicense.Update(data)
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
