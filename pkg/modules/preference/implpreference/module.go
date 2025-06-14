package implpreference

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store     preferencetypes.Store
	available map[preferencetypes.Name]preferencetypes.Preference
}

func NewModule(store preferencetypes.Store, available map[preferencetypes.Name]preferencetypes.Preference) preference.Module {
	return &module{
		store:     store,
		available: available,
	}
}

func (module *module) ListByOrg(ctx context.Context, orgID valuer.UUID) ([]*preferencetypes.Preference, error) {
	storableOrgPreferences, err := module.store.ListByOrg(ctx, orgID)
	if err != nil {
		return nil, err
	}

	preferences := make([]*preferencetypes.Preference, 0)
	for _, availablePreference := range module.available {
		preference, err := preferencetypes.NewPreference(availablePreference.Name, preferencetypes.ScopeOrg, module.available)
		if err != nil {
			continue
		}

		// update the preference value from the storable preference
		for _, storableOrgPreference := range storableOrgPreferences {
			if storableOrgPreference.Name == preference.Name {
				value, err := preferencetypes.NewValueFromString(storableOrgPreference.Value, preference.ValueType)
				if err != nil {
					return nil, err
				}

				err = preference.UpdateValue(value)
				if err != nil {
					return nil, err
				}
			}
		}

		preferences = append(preferences, preference)
	}

	return preferences, nil
}

func (module *module) GetByOrg(ctx context.Context, orgID valuer.UUID, name preferencetypes.Name) (*preferencetypes.Preference, error) {
	preference, err := preferencetypes.NewPreference(name, preferencetypes.ScopeOrg, module.available)
	if err != nil {
		return nil, err
	}

	storableOrgPreference, err := module.store.GetByOrg(ctx, orgID, name)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if storableOrgPreference != nil {
		value, err := preferencetypes.NewValueFromString(storableOrgPreference.Value, preference.ValueType)
		if err != nil {
			return nil, err
		}

		err = preference.UpdateValue(value)
		if err != nil {
			return nil, err
		}
	}

	return preference, nil
}

func (module *module) UpdateByOrg(ctx context.Context, orgID valuer.UUID, name preferencetypes.Name, input any) error {
	preference, err := preferencetypes.NewPreference(name, preferencetypes.ScopeOrg, module.available)
	if err != nil {
		return err
	}

	value, err := preferencetypes.NewValue(input, preference.ValueType)
	if err != nil {
		return err
	}

	err = preference.UpdateValue(value)
	if err != nil {
		return err
	}

	storableOrgPreference, err := module.store.GetByOrg(ctx, orgID, name)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return err
		}
	}

	if storableOrgPreference == nil {
		storableOrgPreference, err = preferencetypes.NewStorableOrgPreference(preference, value, orgID)
		if err != nil {
			return err
		}
	} else {
		err = storableOrgPreference.UpdateValue(value)
		if err != nil {
			return err
		}
	}

	err = module.store.UpsertByOrg(ctx, storableOrgPreference)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) ListByUser(ctx context.Context, userID valuer.UUID) ([]*preferencetypes.Preference, error) {
	storableUserPreferences, err := module.store.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	preferences := make([]*preferencetypes.Preference, 0)
	for _, availablePreference := range module.available {
		preference, err := preferencetypes.NewPreference(availablePreference.Name, preferencetypes.ScopeUser, module.available)
		if err != nil {
			continue
		}

		// update the preference value from the storable preference
		for _, storableUserPreference := range storableUserPreferences {
			if storableUserPreference.Name == preference.Name {
				value, err := preferencetypes.NewValueFromString(storableUserPreference.Value, preference.ValueType)
				if err != nil {
					return nil, err
				}

				err = preference.UpdateValue(value)
				if err != nil {
					return nil, err
				}
			}
		}

		preferences = append(preferences, preference)
	}

	return preferences, nil
}

func (module *module) GetByUser(ctx context.Context, userID valuer.UUID, name preferencetypes.Name) (*preferencetypes.Preference, error) {
	preference, err := preferencetypes.NewPreference(name, preferencetypes.ScopeUser, module.available)
	if err != nil {
		return nil, err
	}

	storableUserPreference, err := module.store.GetByUser(ctx, userID, name)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}

		return nil, err
	}

	if storableUserPreference != nil {
		value, err := preferencetypes.NewValueFromString(storableUserPreference.Value, preference.ValueType)
		if err != nil {
			return nil, err
		}

		err = preference.UpdateValue(value)
		if err != nil {
			return nil, err
		}
	}

	return preference, nil
}

func (module *module) UpdateByUser(ctx context.Context, userID valuer.UUID, name preferencetypes.Name, input any) error {
	preference, err := preferencetypes.NewPreference(name, preferencetypes.ScopeUser, module.available)
	if err != nil {
		return err
	}

	value, err := preferencetypes.NewValue(input, preference.ValueType)
	if err != nil {
		return err
	}

	err = preference.UpdateValue(value)
	if err != nil {
		return err
	}

	storableUserPreference, err := module.store.GetByUser(ctx, userID, name)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return err
		}
	}

	if storableUserPreference == nil {
		storableUserPreference, err = preferencetypes.NewStorableUserPreference(preference, value, userID)
		if err != nil {
			return err
		}
	} else {
		err = storableUserPreference.UpdateValue(value)
		if err != nil {
			return err
		}
	}

	err = module.store.UpsertByUser(ctx, storableUserPreference)
	if err != nil {
		return err
	}

	return nil
}
