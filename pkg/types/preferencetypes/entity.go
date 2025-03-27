package preferencetypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

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

type PreferenceWithValue struct {
	Preference
	Value interface{} `json:"value"`
}

type GettablePreference struct {
	PreferenceId    string      `json:"preference_id" db:"preference_id"`
	PreferenceValue interface{} `json:"preference_value" db:"preference_value"`
}

type UpdatablePreference struct {
	PreferenceValue interface{} `json:"preference_value" db:"preference_value"`
}

func (p *Preference) ErrorValueTypeMismatch() error {
	return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("the preference value is not of expected type: %s", p.ValueType))
}

func (p *Preference) checkIfInAllowedValues(preferenceValue interface{}) (bool, error) {

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

func (p *Preference) IsValidValue(preferenceValue interface{}) error {
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
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("the preference value is not in the range specified, min: %v , max:%v", p.Range.Min, p.Range.Max))
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
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("the preference value is not in the list of allowedValues: %v", p.AllowedValues))
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
		if preferenceValue == "1" || preferenceValue == true || preferenceValue == "true" {
			return true
		} else {
			return false
		}
	default:
		return preferenceValue
	}
}
