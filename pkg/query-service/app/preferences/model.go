package preferences

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Range struct {
	Min int64 `json:"min"`
	Max int64 `json:"max"`
}

type Preference struct {
	Key              string        `json:"key"`
	Name             string        `json:"name"`
	Description      string        `json:"description"`
	ValueType        string        `json:"valueType"`
	DefaultValue     interface{}   `json:"defaultValue"`
	AllowedValues    []interface{} `json:"allowedValues"`
	IsDiscreteValues bool          `json:"isDiscreteValues"`
	Range            Range         `json:"range"`
	AllowedScopes    []string      `json:"allowedScopes"`
}

func (p *Preference) ErrorValueTypeMismatch() *model.ApiError {
	return &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("the preference value is not of expected type: %s", p.ValueType)}
}

const (
	PreferenceValueTypeInteger string = "integer"
	PreferenceValueTypeFloat   string = "float"
	PreferenceValueTypeString  string = "string"
	PreferenceValueTypeBoolean string = "boolean"
)

const (
	OrgAllowedScope  string = "org"
	UserAllowedScope string = "user"
)

func (p *Preference) checkIfInAllowedValues(preferenceValue interface{}) (bool, *model.ApiError) {

	switch p.ValueType {
	case PreferenceValueTypeInteger:
		_, ok := preferenceValue.(int64)
		if !ok {
			return false, p.ErrorValueTypeMismatch()
		}
	case PreferenceValueTypeFloat:
		_, ok := preferenceValue.(float64)
		if !ok {
			return false, p.ErrorValueTypeMismatch()
		}
	case PreferenceValueTypeString:
		_, ok := preferenceValue.(string)
		if !ok {
			return false, p.ErrorValueTypeMismatch()
		}
	case PreferenceValueTypeBoolean:
		_, ok := preferenceValue.(bool)
		if !ok {
			return false, p.ErrorValueTypeMismatch()
		}
	}
	isInAllowedValues := false
	for _, value := range p.AllowedValues {
		switch p.ValueType {
		case PreferenceValueTypeInteger:
			allowedValue, ok := value.(int64)
			if !ok {
				return false, p.ErrorValueTypeMismatch()
			}

			if allowedValue == preferenceValue {
				isInAllowedValues = true
			}
		case PreferenceValueTypeFloat:
			allowedValue, ok := value.(float64)
			if !ok {
				return false, p.ErrorValueTypeMismatch()
			}

			if allowedValue == preferenceValue {
				isInAllowedValues = true
			}
		case PreferenceValueTypeString:
			allowedValue, ok := value.(string)
			if !ok {
				return false, p.ErrorValueTypeMismatch()
			}

			if allowedValue == preferenceValue {
				isInAllowedValues = true
			}
		case PreferenceValueTypeBoolean:
			allowedValue, ok := value.(bool)
			if !ok {
				return false, p.ErrorValueTypeMismatch()
			}

			if allowedValue == preferenceValue {
				isInAllowedValues = true
			}
		}
	}
	return isInAllowedValues, nil
}

func (p *Preference) IsValidValue(preferenceValue interface{}) *model.ApiError {
	typeSafeValue := preferenceValue
	switch p.ValueType {
	case PreferenceValueTypeInteger:
		val, ok := preferenceValue.(int64)
		if !ok {
			floatVal, ok := preferenceValue.(float64)
			if !ok || floatVal != float64(int64(floatVal)) {
				return p.ErrorValueTypeMismatch()
			}
			val = int64(floatVal)
			typeSafeValue = val
		}
		if !p.IsDiscreteValues {
			if val < p.Range.Min || val > p.Range.Max {
				return &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("the preference value is not in the range specified, min: %v , max:%v", p.Range.Min, p.Range.Max)}
			}
		}
	case PreferenceValueTypeString:
		_, ok := preferenceValue.(string)
		if !ok {
			return p.ErrorValueTypeMismatch()
		}
	case PreferenceValueTypeFloat:
		_, ok := preferenceValue.(float64)
		if !ok {
			return p.ErrorValueTypeMismatch()
		}
	case PreferenceValueTypeBoolean:
		_, ok := preferenceValue.(bool)
		if !ok {
			return p.ErrorValueTypeMismatch()
		}
	}

	// check the validity of the value being part of allowed values or the range specified if any
	if p.IsDiscreteValues {
		if p.AllowedValues != nil {
			isInAllowedValues, valueMisMatchErr := p.checkIfInAllowedValues(typeSafeValue)

			if valueMisMatchErr != nil {
				return valueMisMatchErr
			}
			if !isInAllowedValues {
				return &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("the preference value is not in the list of allowedValues: %v", p.AllowedValues)}
			}
		}
	}
	return nil
}

func (p *Preference) IsEnabledForScope(scope string) bool {
	isPreferenceEnabledForGivenScope := false
	if p.AllowedScopes != nil {
		for _, allowedScope := range p.AllowedScopes {
			if allowedScope == strings.ToLower(scope) {
				isPreferenceEnabledForGivenScope = true
			}
		}
	}
	return isPreferenceEnabledForGivenScope
}

func (p *Preference) SanitizeValue(preferenceValue interface{}) interface{} {
	switch p.ValueType {
	case PreferenceValueTypeBoolean:
		if preferenceValue == "1" || preferenceValue == true {
			return true
		} else {
			return false
		}
	default:
		return preferenceValue
	}
}

type AllPreferences struct {
	Preference
	Value interface{} `json:"value"`
}

type PreferenceKV struct {
	PreferenceId    string      `json:"preference_id" db:"preference_id"`
	PreferenceValue interface{} `json:"preference_value" db:"preference_value"`
}

type UpdatePreference struct {
	PreferenceValue interface{} `json:"preference_value"`
}

var store sqlstore.SQLStore

func InitDB(store sqlstore.SQLStore) error {
	store = store
	return nil
}

// org preference functions
func GetOrgPreference(ctx context.Context, preferenceId string, orgId string) (*PreferenceKV, *model.ApiError) {
	// check if the preference key exists or not
	preference, seen := preferenceMap[preferenceId]
	if !seen {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no such preferenceId exists: %s", preferenceId)}
	}

	// check if the preference is enabled for org scope or not
	isPreferenceEnabled := preference.IsEnabledForScope(OrgAllowedScope)
	if !isPreferenceEnabled {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("preference is not enabled at org scope: %s", preferenceId)}
	}

	// fetch the value from the database
	orgPreference := new(types.OrgPreference)
	err := store.
		BunDB().
		NewSelect().
		Model(orgPreference).
		Where("preference_id = ?", preferenceId).
		Where("org_id = ?", orgId).
		Scan(ctx)

	// if the value doesn't exist in db then return the default value
	if err != nil {
		if err == sql.ErrNoRows {
			return &PreferenceKV{
				PreferenceId:    preferenceId,
				PreferenceValue: preference.DefaultValue,
			}, nil
		}
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in fetching the org preference: %s", err.Error())}

	}

	// else return the value fetched from the org_preference table
	return &PreferenceKV{
		PreferenceId:    preferenceId,
		PreferenceValue: preference.SanitizeValue(orgPreference.PreferenceValue),
	}, nil
}

func UpdateOrgPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, orgId string) (*PreferenceKV, *model.ApiError) {
	// check if the preference key exists or not
	preference, seen := preferenceMap[preferenceId]
	if !seen {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no such preferenceId exists: %s", preferenceId)}
	}

	// check if the preference is enabled at org scope or not
	isPreferenceEnabled := preference.IsEnabledForScope(OrgAllowedScope)
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

	orgPreference := new(types.OrgPreference)
	dberr := store.
		BunDB().
		NewSelect().
		Model(orgPreference).
		Where("preference_id = ?", preferenceId).
		Where("org_id = ?", orgId).
		Scan(ctx)
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

	dberr = store.
		BunDB().
		NewInsert().
		Model(orgPreference).
		Scan(ctx)
	if dberr != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", dberr.Error())}
	}

	return &PreferenceKV{
		PreferenceId:    preferenceId,
		PreferenceValue: preferenceValue,
	}, nil
}

func GetAllOrgPreferences(ctx context.Context, orgId string) (*[]AllPreferences, *model.ApiError) {
	// filter out all the org enabled preferences from the preference variable
	allOrgPreferences := []AllPreferences{}

	// fetch all the org preference values stored in org_preference table
	orgPreferences := make([]*types.OrgPreference, 0)
	err := store.
		BunDB().
		NewSelect().
		Model(&orgPreferences).
		Where("org_id = ?", orgId).
		Scan(ctx)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting all org preference values: %s", err)}
	}

	// create a map of key vs values from the above response
	preferenceValueMap := map[string]interface{}{}

	for _, preferenceValue := range orgPreferences {
		preferenceValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	// update in the above filtered list wherver value present in the map
	for _, preference := range preferenceMap {
		isEnabledForOrgScope := preference.IsEnabledForScope(OrgAllowedScope)
		if isEnabledForOrgScope {
			preferenceWithValue := AllPreferences{}
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
	return &allOrgPreferences, nil
}

// user preference functions
func GetUserPreference(ctx context.Context, preferenceId string, orgId string, userId string) (*PreferenceKV, *model.ApiError) {
	// check if the preference key exists
	preference, seen := preferenceMap[preferenceId]
	if !seen {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no such preferenceId exists: %s", preferenceId)}
	}

	preferenceValue := PreferenceKV{
		PreferenceId:    preferenceId,
		PreferenceValue: preference.DefaultValue,
	}

	// check if the preference is enabled at user scope
	isPreferenceEnabledAtUserScope := preference.IsEnabledForScope(UserAllowedScope)
	if !isPreferenceEnabledAtUserScope {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("preference is not enabled at user scope: %s", preferenceId)}
	}

	isPreferenceEnabledAtOrgScope := preference.IsEnabledForScope(OrgAllowedScope)
	// get the value from the org scope if enabled at org scope
	if isPreferenceEnabledAtOrgScope {
		orgPreference := new(types.OrgPreference)
		err := store.
			BunDB().
			NewSelect().
			Model(orgPreference).
			Where("preference_id = ?", preferenceId).
			Where("org_id = ?", orgId).
			Scan(ctx)

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
	userPreference := new(types.UserPreference)
	err := store.
		BunDB().
		NewSelect().
		Model(userPreference).
		Where("preference_id = ?", preferenceId).
		Where("user_id = ?", userId).
		Scan(ctx)

	if err != nil && err != sql.ErrNoRows {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting user preference values: %s", err.Error())}
	}

	if err == nil {
		preferenceValue.PreferenceValue = userPreference.PreferenceValue
	}

	return &PreferenceKV{
		PreferenceId:    preferenceValue.PreferenceId,
		PreferenceValue: preference.SanitizeValue(preferenceValue.PreferenceValue),
	}, nil
}

func UpdateUserPreference(ctx context.Context, preferenceId string, preferenceValue interface{}, userId string) (*PreferenceKV, *model.ApiError) {
	// check if the preference id is valid
	preference, seen := preferenceMap[preferenceId]
	if !seen {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no such preferenceId exists: %s", preferenceId)}
	}

	// check if the preference is enabled at user scope
	isPreferenceEnabledAtUserScope := preference.IsEnabledForScope(UserAllowedScope)
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

	userPreference := new(types.UserPreference)
	dberr := store.
		BunDB().
		NewSelect().
		Model(userPreference).
		Where("preference_id = ?", preferenceId).
		Where("user_id = ?", userId).
		Scan(ctx)
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

	dberr = store.
		BunDB().
		NewInsert().
		Model(userPreference).
		Scan(ctx)
	if dberr != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", dberr.Error())}
	}

	return &PreferenceKV{
		PreferenceId:    preferenceId,
		PreferenceValue: preferenceValue,
	}, nil
}

func GetAllUserPreferences(ctx context.Context, orgId string, userId string) (*[]AllPreferences, *model.ApiError) {
	allUserPreferences := []AllPreferences{}

	// fetch all the org preference values stored in org_preference table
	// fetch all the org preference values stored in org_preference table
	orgPreferences := make([]*types.OrgPreference, 0)
	err := store.
		BunDB().
		NewSelect().
		Model(&orgPreferences).
		Where("org_id = ?", orgId).
		Scan(ctx)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting all org preference values: %s", err)}
	}

	// create a map of key vs values from the above response
	preferenceOrgValueMap := map[string]interface{}{}

	for _, preferenceValue := range orgPreferences {
		preferenceOrgValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	// fetch all the user preference values stored in user_preference table
	// fetch all the org preference values stored in org_preference table
	userPreferences := make([]*types.UserPreference, 0)
	err = store.
		BunDB().
		NewSelect().
		Model(&userPreferences).
		Where("user_id = ?", userId).
		Scan(ctx)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting all user preference values: %s", err)}
	}

	// create a map of key vs values from the above response
	preferenceUserValueMap := map[string]interface{}{}

	for _, preferenceValue := range userPreferences {
		preferenceUserValueMap[preferenceValue.PreferenceID] = preferenceValue.PreferenceValue
	}

	// update in the above filtered list wherver value present in the map
	for _, preference := range preferenceMap {
		isEnabledForUserScope := preference.IsEnabledForScope(UserAllowedScope)

		if isEnabledForUserScope {
			preferenceWithValue := AllPreferences{}
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

			isEnabledForOrgScope := preference.IsEnabledForScope(OrgAllowedScope)
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
	return &allUserPreferences, nil
}
