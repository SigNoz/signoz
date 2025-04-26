package implpreference

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Do not take inspiration from this code, it is a work in progress. See Organization module for a better implementation.
type module struct {
	store      preferencetypes.Store
	defaultMap map[string]preferencetypes.Preference
}

func NewModule(store preferencetypes.Store, defaultMap map[string]preferencetypes.Preference) preference.Module {
	return &module{store: store, defaultMap: defaultMap}
}

func (module *module) GetOrg(ctx context.Context, preferenceID string, orgID string) (*preferencetypes.GettablePreference, error) {
	preference, seen := module.defaultMap[preferenceID]
	if !seen {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot find preference with id: %s", preferenceID)
	}

	isEnabled := preference.IsEnabledForScope(preferencetypes.OrgAllowedScope)
	if !isEnabled {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "preference is not enabled at org scope: %s", preferenceID)
	}

	org, err := module.store.GetOrg(ctx, orgID, preferenceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return &preferencetypes.GettablePreference{
				PreferenceID:    preferenceID,
				PreferenceValue: preference.DefaultValue,
			}, nil
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in fetching the org preference: %s", preferenceID)
	}

	return &preferencetypes.GettablePreference{
		PreferenceID:    preferenceID,
		PreferenceValue: preference.SanitizeValue(org.PreferenceValue),
	}, nil
}

func (module *module) UpdateOrg(ctx context.Context, preferenceID string, preferenceValue interface{}, orgID string) error {
	preference, seen := module.defaultMap[preferenceID]
	if !seen {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot find preference with id: %s", preferenceID)
	}

	isEnabled := preference.IsEnabledForScope(preferencetypes.OrgAllowedScope)
	if !isEnabled {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "preference is not enabled at org scope: %s", preferenceID)
	}

	err := preference.IsValidValue(preferenceValue)
	if err != nil {
		return err
	}

	storableValue, encodeErr := json.Marshal(preferenceValue)
	if encodeErr != nil {
		return errors.Wrapf(encodeErr, errors.TypeInvalidInput, errors.CodeInvalidInput, "error in encoding the preference value")
	}

	org, dberr := module.store.GetOrg(ctx, orgID, preferenceID)
	if dberr != nil && dberr != sql.ErrNoRows {
		return errors.Wrapf(dberr, errors.TypeInternal, errors.CodeInternal, "error in getting the preference value")
	}

	if dberr != nil {
		org.ID = valuer.GenerateUUID()
		org.PreferenceID = preferenceID
		org.PreferenceValue = string(storableValue)
		org.OrgID = orgID
	} else {
		org.PreferenceValue = string(storableValue)
	}

	dberr = module.store.UpsertOrg(ctx, org)
	if dberr != nil {
		return errors.Wrapf(dberr, errors.TypeInternal, errors.CodeInternal, "error in setting the preference value")
	}

	return nil
}

func (module *module) GetAllOrg(ctx context.Context, orgID string) ([]*preferencetypes.PreferenceWithValue, error) {
	allOrgs := []*preferencetypes.PreferenceWithValue{}
	orgs, err := module.store.GetAllOrg(ctx, orgID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in setting all org preference values")
	}

	preferenceValueMap := map[string]interface{}{}
	for _, preferenceValue := range orgs {
		preferenceValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	for _, preference := range module.defaultMap {
		isEnabledForOrgScope := preference.IsEnabledForScope(preferencetypes.OrgAllowedScope)
		if isEnabledForOrgScope {
			preferenceWithValue := &preferencetypes.PreferenceWithValue{}
			preferenceWithValue.Key = preference.Key
			preferenceWithValue.Name = preference.Name
			preferenceWithValue.Description = preference.Description
			preferenceWithValue.AllowedScopes = preference.AllowedScopes
			preferenceWithValue.AllowedValues = preference.AllowedValues
			preferenceWithValue.DefaultValue = preference.DefaultValue
			preferenceWithValue.Range = preference.Range
			preferenceWithValue.ValueType = preference.ValueType
			preferenceWithValue.IsDiscreteValues = preference.IsDiscreteValues
			value, seen := preferenceValueMap[preference.Key]

			if seen {
				preferenceWithValue.Value = value
			} else {
				preferenceWithValue.Value = preference.DefaultValue
			}

			preferenceWithValue.Value = preference.SanitizeValue(preferenceWithValue.Value)
			allOrgs = append(allOrgs, preferenceWithValue)
		}
	}
	return allOrgs, nil
}

func (module *module) GetUser(ctx context.Context, preferenceID string, orgID string, userID string) (*preferencetypes.GettablePreference, error) {
	preference, seen := module.defaultMap[preferenceID]
	if !seen {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot find preference with id: %s", preferenceID)
	}

	preferenceValue := preferencetypes.GettablePreference{
		PreferenceID:    preferenceID,
		PreferenceValue: preference.DefaultValue,
	}

	isEnabledAtUserScope := preference.IsEnabledForScope(preferencetypes.UserAllowedScope)
	if !isEnabledAtUserScope {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "preference is not enabled at user scope: %s", preferenceID)
	}

	isEnabledAtOrgScope := preference.IsEnabledForScope(preferencetypes.OrgAllowedScope)
	if isEnabledAtOrgScope {
		org, err := module.store.GetOrg(ctx, orgID, preferenceID)
		if err != nil && err != sql.ErrNoRows {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in fetching the org preference: %s", preferenceID)
		}
		if err == nil {
			preferenceValue.PreferenceValue = org.PreferenceValue
		}
	}

	user, err := module.store.GetUser(ctx, userID, preferenceID)
	if err != nil && err != sql.ErrNoRows {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in fetching the user preference: %s", preferenceID)
	}

	if err == nil {
		preferenceValue.PreferenceValue = user.PreferenceValue
	}

	return &preferencetypes.GettablePreference{
		PreferenceID:    preferenceValue.PreferenceID,
		PreferenceValue: preference.SanitizeValue(preferenceValue.PreferenceValue),
	}, nil
}

func (module *module) UpdateUser(ctx context.Context, preferenceID string, preferenceValue interface{}, userID string) error {
	preference, seen := module.defaultMap[preferenceID]
	if !seen {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot find preference with id: %s", preferenceID)
	}

	isEnabledAtUserScope := preference.IsEnabledForScope(preferencetypes.UserAllowedScope)
	if !isEnabledAtUserScope {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "preference is not enabled at user scope: %s", preferenceID)
	}

	err := preference.IsValidValue(preferenceValue)
	if err != nil {
		return err
	}

	storableValue, encodeErr := json.Marshal(preferenceValue)
	if encodeErr != nil {
		return errors.Wrapf(encodeErr, errors.TypeInvalidInput, errors.CodeInvalidInput, "error in encoding the preference value")
	}

	user, dberr := module.store.GetUser(ctx, userID, preferenceID)
	if dberr != nil && dberr != sql.ErrNoRows {
		return errors.Wrapf(dberr, errors.TypeInternal, errors.CodeInternal, "error in getting the preference value")
	}

	if dberr != nil {
		user.ID = valuer.GenerateUUID()
		user.PreferenceID = preferenceID
		user.PreferenceValue = string(storableValue)
		user.UserID = userID
	} else {
		user.PreferenceValue = string(storableValue)
	}

	dberr = module.store.UpsertUser(ctx, user)
	if dberr != nil {
		return errors.Wrapf(dberr, errors.TypeInternal, errors.CodeInternal, "error in setting the preference value")
	}

	return nil
}

func (module *module) GetAllUser(ctx context.Context, orgID string, userID string) ([]*preferencetypes.PreferenceWithValue, error) {
	allUsers := []*preferencetypes.PreferenceWithValue{}

	orgs, err := module.store.GetAllOrg(ctx, orgID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in setting all org preference values")
	}

	preferenceOrgValueMap := map[string]interface{}{}
	for _, preferenceValue := range orgs {
		preferenceOrgValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	users, err := module.store.GetAllUser(ctx, userID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in setting all user preference values")
	}

	preferenceUserValueMap := map[string]interface{}{}
	for _, preferenceValue := range users {
		preferenceUserValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	for _, preference := range module.defaultMap {
		isEnabledForUserScope := preference.IsEnabledForScope(preferencetypes.UserAllowedScope)

		if isEnabledForUserScope {
			preferenceWithValue := &preferencetypes.PreferenceWithValue{}
			preferenceWithValue.Key = preference.Key
			preferenceWithValue.Name = preference.Name
			preferenceWithValue.Description = preference.Description
			preferenceWithValue.AllowedScopes = preference.AllowedScopes
			preferenceWithValue.AllowedValues = preference.AllowedValues
			preferenceWithValue.DefaultValue = preference.DefaultValue
			preferenceWithValue.Range = preference.Range
			preferenceWithValue.ValueType = preference.ValueType
			preferenceWithValue.IsDiscreteValues = preference.IsDiscreteValues
			preferenceWithValue.Value = preference.DefaultValue

			isEnabledForOrgScope := preference.IsEnabledForScope(preferencetypes.OrgAllowedScope)
			if isEnabledForOrgScope {
				value, seen := preferenceOrgValueMap[preference.Key]
				if seen {
					preferenceWithValue.Value = value
				}
			}

			value, seen := preferenceUserValueMap[preference.Key]

			if seen {
				preferenceWithValue.Value = value
			}

			preferenceWithValue.Value = preference.SanitizeValue(preferenceWithValue.Value)
			allUsers = append(allUsers, preferenceWithValue)
		}
	}
	return allUsers, nil
}
