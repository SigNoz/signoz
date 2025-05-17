package licensemanager

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/ee/licensemanager/licensemanagerstore"
	validate "github.com/SigNoz/signoz/ee/query-service/integrations/signozio"
	"github.com/SigNoz/signoz/ee/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
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
	organizations, err := l.store.ListOrgs(ctx)
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

func (l *license) Update(ctx context.Context, organizationID valuer.UUID, license *licensetypes.License) error {
	err := l.store.Update(ctx, license)
	if err != nil {
		return err
	}
	return nil
}

func (l *license) Activate(ctx context.Context, organizationID valuer.UUID, ID string) error {
	license, err := validate.ValidateLicenseV3(ctx, ID, l.zeus)
	if err != nil {
		return err
	}

	err = l.store.Create(ctx, license)
	if err != nil {
		return err
	}

	return nil
}

func (l *license) Get(ctx context.Context, orgID valuer.UUID, ID valuer.UUID) (*licensetypes.License, error) {
	license, err := l.store.Get(ctx, orgID, ID)
	if err != nil {
		return nil, err
	}
	return license, nil
}

func (l *license) GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.License, error) {
	panic("unimplemented")
}

func (l *license) GetAll(ctx context.Context, orgID valuer.UUID) ([]*licensetypes.License, error) {
	licenses, err := l.store.GetAll(ctx, orgID)
	if err != nil {
		return nil, err
	}
	return licenses, nil
}

func (l *license) Refresh(ctx context.Context, organizationID valuer.UUID) error {
	activeLicense, err := l.GetActive(ctx, organizationID)
	if err != nil {
		return err
	}

	license, err := validate.ValidateLicenseV3(ctx, activeLicense.ID, l.zeus)
	if err != nil {
		return err
	}

	err = l.store.Update(ctx, license)
	if err != nil {
		return err
	}

	return nil
}

// feature surrogate
func (l *license) CheckFeature() {
	panic("unimplemented")
}

func (l *license) GetFeatureFlag() {
	panic("unimplemented")
}

func (l *license) GetFeatureFlags() {
	panic("unimplemented")
}

func (l *license) InitFeatures() {
	panic("unimplemented")
}

func (l *license) UpdateFeatureFlag() {
	panic("unimplemented")
}
