package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/preference/store"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type core struct {
	store types.PreferenceStore
}

func NewPreferenceCore(store types.PreferenceStore) preference.Preference {
	return &core{store: store}
}

func (core *core) GetOrgPreference(ctx context.Context, preferenceId string, orgId string) (*types.PreferenceKV, error) {
	preference, seen := store.PreferenceMap[preferenceId]
	if !seen {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no such preferenceId exists: %s", preferenceId)}
	}

	// check if the preference is enabled for org scope or not
	isPreferenceEnabled := preference.IsEnabledForScope(types.OrgAllowedScope)
	if !isPreferenceEnabled {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("preference is not enabled at org scope: %s", preferenceId)}
	}

	// fetch the value from the database
	orgPreference, err := core.store.GetOrgPreference(ctx, orgId, preferenceId)

	// if the value doesn't exist in db then return the default value
	if err != nil {
		if err == sql.ErrNoRows {
			return &types.PreferenceKV{
				PreferenceId:    preferenceId,
				PreferenceValue: preference.DefaultValue,
			}, nil
		}
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in fetching the org preference: %s", err.Error())}

	}

	// else return the value fetched from the org_preference table
	return &types.PreferenceKV{
		PreferenceId:    preferenceId,
		PreferenceValue: preference.SanitizeValue(orgPreference.PreferenceValue),
	}, nil
}

func (core *core) UpdateOrgPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, orgId string) (*types.PreferenceKV, error) {
	// check if the preference key exists or not
	preference, seen := store.PreferenceMap[preferenceId]
	if !seen {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no such preferenceId exists: %s", preferenceId)}
	}

	// check if the preference is enabled at org scope or not
	isPreferenceEnabled := preference.IsEnabledForScope(types.OrgAllowedScope)
	if !isPreferenceEnabled {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("preference is not enabled at org scope: %s", preferenceId)}
	}

	err := preference.IsValidValue(preferenceValue)
	if err != nil {
		return nil, err
	}

	storablePreferenceValue, encodeErr := json.Marshal(preferenceValue)
	if encodeErr != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error in encoding the preference value: %s", encodeErr.Error())}
	}

	orgPreference, dberr := core.store.GetOrgPreference(ctx, orgId, preferenceId)
	if dberr != nil && dberr != sql.ErrNoRows {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", dberr.Error())}
	}

	if dberr != nil {
		orgPreference.ID = valuer.GenerateUUID()
		orgPreference.PreferenceID = preferenceId
		orgPreference.PreferenceValue = string(storablePreferenceValue)
		orgPreference.OrgID = orgId
	} else {
		orgPreference.PreferenceValue = string(storablePreferenceValue)
	}

	dberr = core.store.UpsertOrgPreference(ctx, orgPreference)
	if dberr != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", dberr.Error())}
	}

	return &types.PreferenceKV{
		PreferenceId:    preferenceId,
		PreferenceValue: preferenceValue,
	}, nil
}

func (core *core) GetAllOrgPreferences(ctx context.Context, orgId string) ([]*types.AllPreferences, error) {
	// filter out all the org enabled preferences from the preference variable
	allOrgPreferences := []*types.AllPreferences{}

	// fetch all the org preference values stored in org_preference table
	orgPreferences, err := core.store.GetAllOrgPreferences(ctx, orgId)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting all org preference values: %s", err)}
	}

	// create a map of key vs values from the above response
	preferenceValueMap := map[string]interface{}{}
	for _, preferenceValue := range orgPreferences {
		preferenceValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	// update in the above filtered list wherver value present in the map
	for _, preference := range store.PreferenceMap {
		isEnabledForOrgScope := preference.IsEnabledForScope(types.OrgAllowedScope)
		if isEnabledForOrgScope {
			preferenceWithValue := &types.AllPreferences{}
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

// user preference functions
func (core *core) GetUserPreference(ctx context.Context, preferenceId string, orgId string, userId string) (*types.PreferenceKV, error) {
	// check if the preference key exists
	preference, seen := store.PreferenceMap[preferenceId]
	if !seen {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no such preferenceId exists: %s", preferenceId)}
	}

	preferenceValue := types.PreferenceKV{
		PreferenceId:    preferenceId,
		PreferenceValue: preference.DefaultValue,
	}

	// check if the preference is enabled at user scope
	isPreferenceEnabledAtUserScope := preference.IsEnabledForScope(types.UserAllowedScope)
	if !isPreferenceEnabledAtUserScope {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("preference is not enabled at user scope: %s", preferenceId)}
	}

	isPreferenceEnabledAtOrgScope := preference.IsEnabledForScope(types.OrgAllowedScope)
	// get the value from the org scope if enabled at org scope
	if isPreferenceEnabledAtOrgScope {
		orgPreference, err := core.store.GetOrgPreference(ctx, orgId, preferenceId)
		// if there is error in getting values and its not an empty rows error return from here
		if err != nil && err != sql.ErrNoRows {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting org preference values: %s", err.Error())}
		}

		// if there is no error update the preference value with value from org preference
		if err == nil {
			preferenceValue.PreferenceValue = orgPreference.PreferenceValue
		}
	}

	// get the value from the user_preference table, if exists return this value else the one calculated in the above step
	userPreference, err := core.store.GetUserPreference(ctx, userId, preferenceId)
	if err != nil && err != sql.ErrNoRows {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting user preference values: %s", err.Error())}
	}

	if err == nil {
		preferenceValue.PreferenceValue = userPreference.PreferenceValue
	}

	return &types.PreferenceKV{
		PreferenceId:    preferenceValue.PreferenceId,
		PreferenceValue: preference.SanitizeValue(preferenceValue.PreferenceValue),
	}, nil
}

func (core *core) UpdateUserPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, userId string) (*types.PreferenceKV, error) {
	// check if the preference id is valid
	preference, seen := store.PreferenceMap[preferenceId]
	if !seen {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no such preferenceId exists: %s", preferenceId)}
	}

	// check if the preference is enabled at user scope
	isPreferenceEnabledAtUserScope := preference.IsEnabledForScope(types.UserAllowedScope)
	if !isPreferenceEnabledAtUserScope {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("preference is not enabled at user scope: %s", preferenceId)}
	}

	err := preference.IsValidValue(preferenceValue)
	if err != nil {
		return nil, err
	}

	storablePreferenceValue, encodeErr := json.Marshal(preferenceValue)
	if encodeErr != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error in encoding the preference value: %s", encodeErr.Error())}
	}

	userPreference, dberr := core.store.GetUserPreference(ctx, userId, preferenceId)
	if dberr != nil && dberr != sql.ErrNoRows {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", dberr.Error())}
	}

	if dberr != nil {
		userPreference.ID = valuer.GenerateUUID()
		userPreference.PreferenceID = preferenceId
		userPreference.PreferenceValue = string(storablePreferenceValue)
		userPreference.UserID = userId
	} else {
		userPreference.PreferenceValue = string(storablePreferenceValue)
	}

	dberr = core.store.UpsertUserPreference(ctx, userPreference)
	if dberr != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", dberr.Error())}
	}

	return &types.PreferenceKV{
		PreferenceId:    preferenceId,
		PreferenceValue: preferenceValue,
	}, nil
}

func (core *core) GetAllUserPreferences(ctx context.Context, orgId string, userId string) ([]*types.AllPreferences, error) {
	allUserPreferences := []*types.AllPreferences{}

	orgPreferences, err := core.store.GetAllOrgPreferences(ctx, orgId)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting all org preference values: %s", err)}
	}

	// create a map of key vs values from the above response
	preferenceOrgValueMap := map[string]interface{}{}
	for _, preferenceValue := range orgPreferences {
		preferenceOrgValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	userPreferences, err := core.store.GetAllUserPreferences(ctx, userId)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting all user preference values: %s", err)}
	}

	// create a map of key vs values from the above response
	preferenceUserValueMap := map[string]interface{}{}
	for _, preferenceValue := range userPreferences {
		preferenceUserValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	// update in the above filtered list wherver value present in the map
	for _, preference := range store.PreferenceMap {
		isEnabledForUserScope := preference.IsEnabledForScope(types.UserAllowedScope)

		if isEnabledForUserScope {
			preferenceWithValue := &types.AllPreferences{}
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

			isEnabledForOrgScope := preference.IsEnabledForScope(types.OrgAllowedScope)
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
