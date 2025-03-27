package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type usecase struct {
	store      preferencetypes.PreferenceStore
	defaultMap map[string]preferencetypes.Preference
}

func NewPreference(store preferencetypes.PreferenceStore, defaultMap map[string]preferencetypes.Preference) preference.Usecase {
	return &usecase{store: store, defaultMap: defaultMap}
}

func (usecase *usecase) GetOrgPreference(ctx context.Context, preferenceID string, orgID string) (*preferencetypes.GettablePreference, error) {
	preference, seen := usecase.defaultMap[preferenceID]
	if !seen {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("no such preferenceID exists: %s", preferenceID))
	}

	isPreferenceEnabled := preference.IsEnabledForScope(preferencetypes.OrgAllowedScope)
	if !isPreferenceEnabled {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("preference is not enabled at org scope: %s", preferenceID))
	}

	orgPreference, err := usecase.store.GetOrgPreference(ctx, orgID, preferenceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return &preferencetypes.GettablePreference{
				PreferenceID:    preferenceID,
				PreferenceValue: preference.DefaultValue,
			}, nil
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, fmt.Sprintf("error in fetching the org preference: %s", preferenceID))
	}

	return &preferencetypes.GettablePreference{
		PreferenceID:    preferenceID,
		PreferenceValue: preference.SanitizeValue(orgPreference.PreferenceValue),
	}, nil
}

func (usecase *usecase) UpdateOrgPreference(ctx context.Context, preferenceID string, preferenceValue interface{}, orgId string) error {
	preference, seen := usecase.defaultMap[preferenceID]
	if !seen {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("no such preferenceID exists: %s", preferenceID))
	}

	isPreferenceEnabled := preference.IsEnabledForScope(preferencetypes.OrgAllowedScope)
	if !isPreferenceEnabled {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("preference is not enabled at org scope: %s", preferenceID))
	}

	err := preference.IsValidValue(preferenceValue)
	if err != nil {
		return err
	}

	storablePreferenceValue, encodeErr := json.Marshal(preferenceValue)
	if encodeErr != nil {
		return errors.Wrapf(encodeErr, errors.TypeInvalidInput, errors.CodeInvalidInput, "error in encoding the preference value")
	}

	orgPreference, dberr := usecase.store.GetOrgPreference(ctx, orgId, preferenceID)
	if dberr != nil && dberr != sql.ErrNoRows {
		return errors.Wrapf(dberr, errors.TypeInternal, errors.CodeInternal, "error in getting the preference value")
	}

	if dberr != nil {
		orgPreference.ID = valuer.GenerateUUID()
		orgPreference.PreferenceID = preferenceID
		orgPreference.PreferenceValue = string(storablePreferenceValue)
		orgPreference.OrgID = orgId
	} else {
		orgPreference.PreferenceValue = string(storablePreferenceValue)
	}

	dberr = usecase.store.UpsertOrgPreference(ctx, orgPreference)
	if dberr != nil {
		return errors.Wrapf(dberr, errors.TypeInternal, errors.CodeInternal, "error in setting the preference value")
	}

	return nil
}

func (usecase *usecase) GetAllOrgPreferences(ctx context.Context, orgID string) ([]*preferencetypes.PreferenceWithValue, error) {
	allOrgPreferences := []*preferencetypes.PreferenceWithValue{}
	orgPreferences, err := usecase.store.GetAllOrgPreferences(ctx, orgID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in setting all org preference values")
	}

	preferenceValueMap := map[string]interface{}{}
	for _, preferenceValue := range orgPreferences {
		preferenceValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	for _, preference := range usecase.defaultMap {
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
			allOrgPreferences = append(allOrgPreferences, preferenceWithValue)
		}
	}
	return allOrgPreferences, nil
}

func (usecase *usecase) GetUserPreference(ctx context.Context, preferenceID string, orgId string, userId string) (*preferencetypes.GettablePreference, error) {
	preference, seen := usecase.defaultMap[preferenceID]
	if !seen {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("no such preferenceID exists: %s", preferenceID))
	}

	preferenceValue := preferencetypes.GettablePreference{
		PreferenceID:    preferenceID,
		PreferenceValue: preference.DefaultValue,
	}

	isPreferenceEnabledAtUserScope := preference.IsEnabledForScope(preferencetypes.UserAllowedScope)
	if !isPreferenceEnabledAtUserScope {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("preference is not enabled at user scope: %s", preferenceID))
	}

	isPreferenceEnabledAtOrgScope := preference.IsEnabledForScope(preferencetypes.OrgAllowedScope)
	if isPreferenceEnabledAtOrgScope {
		orgPreference, err := usecase.store.GetOrgPreference(ctx, orgId, preferenceID)
		if err != nil && err != sql.ErrNoRows {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, fmt.Sprintf("error in fetching the org preference: %s", preferenceID))
		}
		if err == nil {
			preferenceValue.PreferenceValue = orgPreference.PreferenceValue
		}
	}

	userPreference, err := usecase.store.GetUserPreference(ctx, userId, preferenceID)
	if err != nil && err != sql.ErrNoRows {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, fmt.Sprintf("error in fetching the user preference: %s", preferenceID))
	}

	if err == nil {
		preferenceValue.PreferenceValue = userPreference.PreferenceValue
	}

	return &preferencetypes.GettablePreference{
		PreferenceID:    preferenceValue.PreferenceID,
		PreferenceValue: preference.SanitizeValue(preferenceValue.PreferenceValue),
	}, nil
}

func (usecase *usecase) UpdateUserPreference(ctx context.Context, preferenceID string, preferenceValue interface{}, userId string) error {
	preference, seen := usecase.defaultMap[preferenceID]
	if !seen {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("no such preferenceID exists: %s", preferenceID))
	}

	isPreferenceEnabledAtUserScope := preference.IsEnabledForScope(preferencetypes.UserAllowedScope)
	if !isPreferenceEnabledAtUserScope {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("preference is not enabled at user scope: %s", preferenceID))
	}

	err := preference.IsValidValue(preferenceValue)
	if err != nil {
		return err
	}

	storablePreferenceValue, encodeErr := json.Marshal(preferenceValue)
	if encodeErr != nil {
		return errors.Wrapf(encodeErr, errors.TypeInvalidInput, errors.CodeInvalidInput, "error in encoding the preference value")
	}

	userPreference, dberr := usecase.store.GetUserPreference(ctx, userId, preferenceID)
	if dberr != nil && dberr != sql.ErrNoRows {
		return errors.Wrapf(dberr, errors.TypeInternal, errors.CodeInternal, "error in getting the preference value")
	}

	if dberr != nil {
		userPreference.ID = valuer.GenerateUUID()
		userPreference.PreferenceID = preferenceID
		userPreference.PreferenceValue = string(storablePreferenceValue)
		userPreference.UserID = userId
	} else {
		userPreference.PreferenceValue = string(storablePreferenceValue)
	}

	dberr = usecase.store.UpsertUserPreference(ctx, userPreference)
	if dberr != nil {
		return errors.Wrapf(dberr, errors.TypeInternal, errors.CodeInternal, "error in setting the preference value")
	}

	return nil
}

func (usecase *usecase) GetAllUserPreferences(ctx context.Context, orgID string, userID string) ([]*preferencetypes.PreferenceWithValue, error) {
	allUserPreferences := []*preferencetypes.PreferenceWithValue{}

	orgPreferences, err := usecase.store.GetAllOrgPreferences(ctx, orgID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in setting all org preference values")
	}

	preferenceOrgValueMap := map[string]interface{}{}
	for _, preferenceValue := range orgPreferences {
		preferenceOrgValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	userPreferences, err := usecase.store.GetAllUserPreferences(ctx, userID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error in setting all user preference values")
	}

	preferenceUserValueMap := map[string]interface{}{}
	for _, preferenceValue := range userPreferences {
		preferenceUserValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	for _, preference := range usecase.defaultMap {
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
			allUserPreferences = append(allUserPreferences, preferenceWithValue)
		}
	}
	return allUserPreferences, nil
}
