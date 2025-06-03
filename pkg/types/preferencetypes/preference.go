package preferencetypes

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type Preference struct {
	Name             Name      `json:"name"`
	Description      string    `json:"description"`
	ValueType        ValueType `json:"valueType"`
	DefaultValue     any       `json:"defaultValue"`
	AllowedValues    []any     `json:"allowedValues"`
	IsDiscreteValues bool      `json:"isDiscreteValues"`
	Range            Range     `json:"range"`
	AllowedScopes    []Scope   `json:"allowedScopes"`
}

type StorableOrgPreference struct {
	bun.BaseModel `bun:"table:org_preference"`
	types.Identifiable
	Name  Name        `bun:"preference_id,type:text,notnull"`
	Value string      `bun:"preference_value,type:text,notnull"`
	OrgID valuer.UUID `bun:"org_id,type:text,notnull"`
}

type StorableUserPreference struct {
	bun.BaseModel `bun:"table:user_preference"`
	types.Identifiable
	Name   Name        `bun:"preference_id,type:text,notnull"`
	Value  string      `bun:"preference_value,type:text,notnull"`
	UserID valuer.UUID `bun:"user_id,type:text,notnull"`
}

type GettablePreference struct {
	*Preference
	Value any `json:"preference_value"`
}

type UpdatablePreference struct {
	Value string `json:"preference_value"`
}

func NewAvailablePreference() map[Name]Preference {
	return map[Name]Preference{
		NameOrgOnboarding: {
			Name:             NameOrgOnboarding,
			Description:      "Organisation Onboarding",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeOrg},
		},
		NameWelcomeChecklistDoLater: {
			Name:             NameWelcomeChecklistDoLater,
			Description:      "Welcome Checklist Do Later",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
		},
		NameWelcomeChecklistSendLogsSkipped: {
			Name:             NameWelcomeChecklistSendLogsSkipped,
			Description:      "Welcome Checklist Send Logs Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
		},
		NameWelcomeChecklistSendTracesSkipped: {
			Name:             NameWelcomeChecklistSendTracesSkipped,
			Description:      "Welcome Checklist Send Traces Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
		},
		NameWelcomeChecklistSendInfraMetricsSkipped: {
			Name:             NameWelcomeChecklistSendInfraMetricsSkipped,
			Description:      "Welcome Checklist Send Infra Metrics Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
		},
		NameWelcomeChecklistSetupDashboardsSkipped: {
			Name:             NameWelcomeChecklistSetupDashboardsSkipped,
			Description:      "Welcome Checklist Setup Dashboards Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
		},
		NameWelcomeChecklistSetupAlertsSkipped: {
			Name:             NameWelcomeChecklistSetupAlertsSkipped,
			Description:      "Welcome Checklist Setup Alerts Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
		},
		NameWelcomeChecklistSetupSavedViewSkipped: {
			Name:             NameWelcomeChecklistSetupSavedViewSkipped,
			Description:      "Welcome Checklist Setup Saved View Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
		},
		NameSidenavPinned: {
			Name:             NameSidenavPinned,
			Description:      "Controls whether the primary sidenav remains expanded or can be collapsed. When enabled, the sidenav will stay open and pinned to provide constant visibility of navigation options.",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     false,
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
		},
	}
}

func NewPreference(name Name, scope Scope, available map[Name]Preference) (*Preference, error) {
	preference, ok := available[name]
	if !ok {
		return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "the preference does not exist: %s", name)
	}

	if !slices.Contains(preference.AllowedScopes, scope) {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "the preference is not allowed for the given scope: %s", scope)
	}

	return &Preference{
		Name:             name,
		Description:      preference.Description,
		ValueType:        preference.ValueType,
		DefaultValue:     preference.DefaultValue,
		AllowedValues:    preference.AllowedValues,
		IsDiscreteValues: preference.IsDiscreteValues,
		Range:            preference.Range,
		AllowedScopes:    preference.AllowedScopes,
	}, nil
}

func NewPreferenceFromAvailable(name Name, available map[Name]Preference) (*Preference, error) {
	preference, ok := available[name]
	if !ok {
		return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "the preference does not exist: %s", name)
	}

	return &Preference{
		Name:             name,
		Description:      preference.Description,
		ValueType:        preference.ValueType,
		DefaultValue:     preference.DefaultValue,
		AllowedValues:    preference.AllowedValues,
		IsDiscreteValues: preference.IsDiscreteValues,
		Range:            preference.Range,
		AllowedScopes:    preference.AllowedScopes,
	}, nil
}

func NewGettablePreference(preference *Preference, value any) *GettablePreference {
	return &GettablePreference{
		Preference: preference,
		Value:      value,
	}
}

func NewStorableOrgPreference(preference *Preference, value string, orgID valuer.UUID) *StorableOrgPreference {
	return &StorableOrgPreference{
		Name:  preference.Name,
		Value: value,
		OrgID: orgID,
	}
}

func NewStorableUserPreference(preference *Preference, value string, userID valuer.UUID) *StorableUserPreference {
	return &StorableUserPreference{
		Name:   preference.Name,
		Value:  value,
		UserID: userID,
	}
}

type Store interface {
	GetByOrg(context.Context, valuer.UUID, Name) (*StorableOrgPreference, error)
	ListByOrg(context.Context, valuer.UUID) ([]*StorableOrgPreference, error)
	UpsertByOrg(context.Context, *StorableOrgPreference) error
	GetByUser(context.Context, valuer.UUID, Name) (*StorableUserPreference, error)
	ListByUser(context.Context, valuer.UUID) ([]*StorableUserPreference, error)
	UpsertByUser(context.Context, *StorableUserPreference) error
}
