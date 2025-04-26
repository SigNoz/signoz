package preferencetypes

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

type GettablePreference struct {
	PreferenceID    string      `json:"preference_id" db:"preference_id"`
	PreferenceValue interface{} `json:"preference_value" db:"preference_value"`
}

type UpdatablePreference struct {
	PreferenceValue interface{} `json:"preference_value" db:"preference_value"`
}

type StorableOrgPreference struct {
	bun.BaseModel `bun:"table:org_preference"`
	types.Identifiable
	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	OrgID           string `bun:"org_id,type:text,notnull"`
}

type StorableUserPreference struct {
	bun.BaseModel `bun:"table:user_preference"`
	types.Identifiable
	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	UserID          string `bun:"user_id,type:text,notnull"`
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

func NewDefaultPreferenceMap() map[string]Preference {
	return map[string]Preference{
		"ORG_ONBOARDING": {
			Key:              "ORG_ONBOARDING",
			Name:             "Organisation Onboarding",
			Description:      "Organisation Onboarding",
			ValueType:        "boolean",
			DefaultValue:     false,
			AllowedValues:    []interface{}{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []string{"org"},
		},
		"WELCOME_CHECKLIST_DO_LATER": {
			Key:              "WELCOME_CHECKLIST_DO_LATER",
			Name:             "Welcome Checklist Do Later",
			Description:      "Welcome Checklist Do Later",
			ValueType:        "boolean",
			DefaultValue:     false,
			AllowedValues:    []interface{}{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []string{"user"},
		},
		"WELCOME_CHECKLIST_SEND_LOGS_SKIPPED": {
			Key:              "WELCOME_CHECKLIST_SEND_LOGS_SKIPPED",
			Name:             "Welcome Checklist Send Logs Skipped",
			Description:      "Welcome Checklist Send Logs Skipped",
			ValueType:        "boolean",
			DefaultValue:     false,
			AllowedValues:    []interface{}{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []string{"user"},
		},
		"WELCOME_CHECKLIST_SEND_TRACES_SKIPPED": {
			Key:              "WELCOME_CHECKLIST_SEND_TRACES_SKIPPED",
			Name:             "Welcome Checklist Send Traces Skipped",
			Description:      "Welcome Checklist Send Traces Skipped",
			ValueType:        "boolean",
			DefaultValue:     false,
			AllowedValues:    []interface{}{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []string{"user"},
		},
		"WELCOME_CHECKLIST_SEND_INFRA_METRICS_SKIPPED": {
			Key:              "WELCOME_CHECKLIST_SEND_INFRA_METRICS_SKIPPED",
			Name:             "Welcome Checklist Send Infra Metrics Skipped",
			Description:      "Welcome Checklist Send Infra Metrics Skipped",
			ValueType:        "boolean",
			DefaultValue:     false,
			AllowedValues:    []interface{}{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []string{"user"},
		},
		"WELCOME_CHECKLIST_SETUP_DASHBOARDS_SKIPPED": {
			Key:              "WELCOME_CHECKLIST_SETUP_DASHBOARDS_SKIPPED",
			Name:             "Welcome Checklist Setup Dashboards Skipped",
			Description:      "Welcome Checklist Setup Dashboards Skipped",
			ValueType:        "boolean",
			DefaultValue:     false,
			AllowedValues:    []interface{}{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []string{"user"},
		},
		"WELCOME_CHECKLIST_SETUP_ALERTS_SKIPPED": {
			Key:              "WELCOME_CHECKLIST_SETUP_ALERTS_SKIPPED",
			Name:             "Welcome Checklist Setup Alerts Skipped",
			Description:      "Welcome Checklist Setup Alerts Skipped",
			ValueType:        "boolean",
			DefaultValue:     false,
			AllowedValues:    []interface{}{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []string{"user"},
		},
		"WELCOME_CHECKLIST_SETUP_SAVED_VIEW_SKIPPED": {
			Key:              "WELCOME_CHECKLIST_SETUP_SAVED_VIEW_SKIPPED",
			Name:             "Welcome Checklist Setup Saved View Skipped",
			Description:      "Welcome Checklist Setup Saved View Skipped",
			ValueType:        "boolean",
			DefaultValue:     false,
			AllowedValues:    []interface{}{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []string{"user"},
		},
	}
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

type Store interface {
	GetOrg(context.Context, string, string) (*StorableOrgPreference, error)
	GetAllOrg(context.Context, string) ([]*StorableOrgPreference, error)
	UpsertOrg(context.Context, *StorableOrgPreference) error
	GetUser(context.Context, string, string) (*StorableUserPreference, error)
	GetAllUser(context.Context, string) ([]*StorableUserPreference, error)
	UpsertUser(context.Context, *StorableUserPreference) error
}
