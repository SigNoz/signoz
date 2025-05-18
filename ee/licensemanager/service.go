package licensemanager

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/ee/licensemanager/licensemanagerstore"
	validate "github.com/SigNoz/signoz/ee/query-service/integrations/signozio"
	"github.com/SigNoz/signoz/ee/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type license struct {
	store    licensetypes.Store
	zeus     zeus.Zeus
	stopChan chan struct{}
}

func New(sqlstore sqlstore.SQLStore, zeus zeus.Zeus) License {
	licensestore := licensemanagerstore.New(sqlstore)

	return &license{store: licensestore, zeus: zeus, stopChan: make(chan struct{})}
}

func (l *license) Start(ctx context.Context) error {
	organizations, err := l.store.ListOrganizations(ctx)
	if err != nil {
		return err
	}

	tick := time.NewTicker(licensetypes.ValidationFrequency)
	for _, organizationIDStr := range organizations {
		organizationID, err := valuer.NewUUID(organizationIDStr)
		if err != nil {
			return err
		}

		for {
			select {
			case <-l.stopChan:
				return nil
			case <-tick.C:
				l.Validate(ctx, organizationID)
			}
		}
	}

	return nil
}

func (l *license) Stop(context.Context) error {
	panic("unimplemented")
}

func (l *license) Validate(ctx context.Context, organizationID valuer.UUID) error {
	activeLicense, err := l.GetActive(ctx, organizationID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		// log the error here
		return err
	}

	license, err := validate.ValidateLicenseV3(ctx, activeLicense.Key, l.zeus)
	if err != nil {
		// log the error and update the license with increased count for failure
		// if the failure increases by 3 then remove the active license
		return err
	}

	err = l.Update(ctx, organizationID, license)
	if err != nil {
		return err
	}

	return nil
}

func (l *license) Update(ctx context.Context, organizationID valuer.UUID, license *licensetypes.GettableLicense) error {
	storableLicense := licensetypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, organizationID)
	err := l.store.Update(ctx, storableLicense)
	if err != nil {
		return err
	}

	return nil
}

func (l *license) Activate(ctx context.Context, organizationID valuer.UUID, key string) error {
	license, err := validate.ValidateLicenseV3(ctx, key, l.zeus)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to validate license data with upstream server")
	}

	storableLicense := licensetypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, organizationID)
	err = l.store.Create(ctx, storableLicense)
	if err != nil {
		return err
	}

	return nil
}

func (l *license) Get(ctx context.Context, orgID valuer.UUID, ID valuer.UUID) (*licensetypes.GettableLicense, error) {
	storableLicense, err := l.store.Get(ctx, orgID, ID)
	if err != nil {
		return nil, err
	}

	gettableLicense, err := licensetypes.NewGettableLicense(storableLicense.Data)
	if err != nil {
		return nil, err
	}

	return gettableLicense, nil
}

func (l *license) GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.GettableLicense, error) {
	storableLicenses, err := l.store.GetAll(ctx, organizationID)
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

func (l *license) GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.GettableLicense, error) {
	storableLicenses, err := l.store.GetAll(ctx, organizationID)
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

func (l *license) Refresh(ctx context.Context, organizationID valuer.UUID) error {
	activeLicense, err := l.GetActive(ctx, organizationID)
	if err != nil {
		return err
	}

	license, err := validate.ValidateLicenseV3(ctx, activeLicense.Key, l.zeus)
	if err != nil {
		return err
	}

	updatedLicense := licensetypes.NewStorableLicense(valuer.MustNewUUID(license.ID), license.Key, license.Data, organizationID)
	err = l.store.Update(ctx, updatedLicense)
	if err != nil {
		return err
	}

	return nil
}

// feature surrogate
func (l *license) CheckFeature(ctx context.Context, key string) error {
	feature, err := l.store.GetFeature(ctx, key)
	if err != nil {
		return err
	}
	if feature.Active {
		return nil
	}
	return errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "feature unavailable: %s", key)
}

func (l *license) GetFeatureFlag(ctx context.Context, key string) (*featuretypes.Feature, error) {
	featureStatus, err := l.store.GetFeature(ctx, key)
	if err != nil {
		return nil, err
	}
	return &featuretypes.Feature{
		Name:       featureStatus.Name,
		Active:     featureStatus.Active,
		Usage:      int64(featureStatus.Usage),
		UsageLimit: int64(featureStatus.UsageLimit),
		Route:      featureStatus.Route,
	}, nil
}

func (l *license) GetFeatureFlags(ctx context.Context) ([]*types.FeatureStatus, error) {
	return l.store.GetAllFeatures(ctx)
}

func (l *license) InitFeatures(ctx context.Context, features []*featuretypes.Feature) error {
	featureStatus := make([]*types.FeatureStatus, len(features))
	for i, f := range features {
		featureStatus[i] = &types.FeatureStatus{
			Name:       f.Name,
			Active:     f.Active,
			Usage:      int(f.Usage),
			UsageLimit: int(f.UsageLimit),
			Route:      f.Route,
		}
	}
	return l.store.InitFeatures(ctx, featureStatus)
}

func (l *license) UpdateFeatureFlag(ctx context.Context, feature *featuretypes.Feature) error {
	return l.store.UpdateFeature(ctx, &types.FeatureStatus{
		Name:       feature.Name,
		Active:     feature.Active,
		Usage:      int(feature.Usage),
		UsageLimit: int(feature.UsageLimit),
		Route:      feature.Route,
	})
}
