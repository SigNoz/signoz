package implpreference

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Do not take inspiration from this code, it is a work in progress. See Organization module for a better implementation.
type module struct {
	store     preferencetypes.Store
	available map[preferencetypes.Name]preferencetypes.Preference
}

func NewModule(store preferencetypes.Store, available map[preferencetypes.Name]preferencetypes.Preference) preference.Module {
	return &module{store: store, available: available}
}

func (module *module) ListByOrg(ctx context.Context, orgID valuer.UUID) ([]*preferencetypes.GettablePreference, error) {
	storableOrgPreferences, err := module.store.ListByOrg(ctx, orgID)
	if err != nil {
		return nil, err
	}

	var gettablePreferences []*preferencetypes.GettablePreference
	for _, preference := range module.available {
		copyOfPreference, err := preferencetypes.NewPreferenceFromAvailable(preference.Name, module.available)
		if err != nil {
			continue
		}
		for _, storableOrgPreference := range storableOrgPreferences {
			if storableOrgPreference.Name == preference.Name {
				gettablePreferences = append(gettablePreferences, preferencetypes.NewGettablePreference(copyOfPreference, storableOrgPreference.Value))
				continue
			}

			gettablePreferences = append(gettablePreferences, preferencetypes.NewGettablePreference(copyOfPreference, preference.DefaultValue))
		}
	}

	return gettablePreferences, nil
}

func (module *module) GetByOrg(ctx context.Context, orgID valuer.UUID, name preferencetypes.Name) (*preferencetypes.GettablePreference, error) {
	preference, err := preferencetypes.NewPreference(name, preferencetypes.ScopeOrg, module.available)
	if err != nil {
		return nil, err
	}

	org, err := module.store.GetByOrg(ctx, orgID, name)
	if err != nil {
		if errors.As(err, errors.TypeNotFound) {
			return preferencetypes.NewGettablePreference(preference, preference.DefaultValue), nil
		}

		return nil, err
	}

	return preferencetypes.NewGettablePreference(preference, org.Value), nil
}

func (module *module) UpdateByOrg(ctx context.Context, orgID valuer.UUID, name preferencetypes.Name, preferenceValue string) error {
	preference, err := preferencetypes.NewPreference(name, preferencetypes.ScopeOrg, module.available)
	if err != nil {
		return err
	}

	_, err = preferencetypes.NewPreferenceValueFromString(preference, preferenceValue)
	if err != nil {
		return err
	}

	storableOrgPreference, err := module.store.GetByOrg(ctx, orgID, name)
	if err != nil {
		if !errors.As(err, errors.TypeNotFound) {
			return err
		}
	}

	if storableOrgPreference == nil {
		storableOrgPreference = preferencetypes.NewStorableOrgPreference(preference, preferenceValue, orgID)
	}

	err = module.store.UpsertByOrg(ctx, storableOrgPreference)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) ListByUser(ctx context.Context, userID valuer.UUID) ([]*preferencetypes.GettablePreference, error) {
	storableUserPreferences, err := module.store.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	var gettablePreferences []*preferencetypes.GettablePreference
	for _, preference := range module.available {
		copyOfPreference, err := preferencetypes.NewPreferenceFromAvailable(preference.Name, module.available)
		if err != nil {
			continue
		}
		for _, storableUserPreference := range storableUserPreferences {
			if storableUserPreference.Name == preference.Name {
				gettablePreferences = append(gettablePreferences, preferencetypes.NewGettablePreference(copyOfPreference, storableUserPreference.Value))
				continue
			}

			gettablePreferences = append(gettablePreferences, preferencetypes.NewGettablePreference(copyOfPreference, preference.DefaultValue))
		}
	}

	return gettablePreferences, nil
}

func (module *module) GetByUser(ctx context.Context, userID valuer.UUID, name preferencetypes.Name) (*preferencetypes.GettablePreference, error) {
	preference, err := preferencetypes.NewPreference(name, preferencetypes.ScopeUser, module.available)
	if err != nil {
		return nil, err
	}

	storableUserPreference, err := module.store.GetByUser(ctx, userID, name)
	if err != nil {
		if errors.As(err, errors.TypeNotFound) {
			return preferencetypes.NewGettablePreference(preference, preference.DefaultValue), nil
		}

		return nil, err
	}

	return preferencetypes.NewGettablePreference(preference, storableUserPreference.Value), nil
}

func (module *module) UpdateByUser(ctx context.Context, userID valuer.UUID, name preferencetypes.Name, preferenceValue string) error {
	preference, err := preferencetypes.NewPreference(name, preferencetypes.ScopeUser, module.available)
	if err != nil {
		return err
	}

	_, err = preferencetypes.NewPreferenceValueFromString(preference, preferenceValue)
	if err != nil {
		return err
	}

	storableUserPreference, err := module.store.GetByUser(ctx, userID, name)
	if err != nil {
		if !errors.As(err, errors.TypeNotFound) {
			return err
		}
	}

	if storableUserPreference == nil {
		storableUserPreference = preferencetypes.NewStorableUserPreference(preference, preferenceValue, userID)
	}

	err = module.store.UpsertByUser(ctx, storableUserPreference)
	if err != nil {
		return err
	}

	return nil
}
