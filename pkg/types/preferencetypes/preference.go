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
	DefaultValue     Value     `json:"defaultValue"`
	AllowedValues    []any     `json:"allowedValues"`
	IsDiscreteValues bool      `json:"isDiscreteValues"`
	Range            Range     `json:"range"`
	AllowedScopes    []Scope   `json:"allowedScopes"`
	Value            Value     `json:"value"`
}

type GettablePreference = Preference

type UpdatablePreference struct {
	Value any `json:"value"`
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

func NewAvailablePreference() map[Name]Preference {
	return map[Name]Preference{
		NameOrgOnboarding: {
			Name:             NameOrgOnboarding,
			Description:      "Organisation Onboarding",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeOrg},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameWelcomeChecklistDoLater: {
			Name:             NameWelcomeChecklistDoLater,
			Description:      "Welcome Checklist Do Later",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameWelcomeChecklistSendLogsSkipped: {
			Name:             NameWelcomeChecklistSendLogsSkipped,
			Description:      "Welcome Checklist Send Logs Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameWelcomeChecklistSendTracesSkipped: {
			Name:             NameWelcomeChecklistSendTracesSkipped,
			Description:      "Welcome Checklist Send Traces Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameWelcomeChecklistSendInfraMetricsSkipped: {
			Name:             NameWelcomeChecklistSendInfraMetricsSkipped,
			Description:      "Welcome Checklist Send Infra Metrics Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameWelcomeChecklistSetupDashboardsSkipped: {
			Name:             NameWelcomeChecklistSetupDashboardsSkipped,
			Description:      "Welcome Checklist Setup Dashboards Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameWelcomeChecklistSetupAlertsSkipped: {
			Name:             NameWelcomeChecklistSetupAlertsSkipped,
			Description:      "Welcome Checklist Setup Alerts Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameWelcomeChecklistSetupSavedViewSkipped: {
			Name:             NameWelcomeChecklistSetupSavedViewSkipped,
			Description:      "Welcome Checklist Setup Saved View Skipped",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameSidenavPinned: {
			Name:             NameSidenavPinned,
			Description:      "Controls whether the primary sidenav remains expanded or can be collapsed. When enabled, the sidenav will stay open and pinned to provide constant visibility of navigation options.",
			ValueType:        ValueTypeBoolean,
			DefaultValue:     MustNewValue(false, ValueTypeBoolean),
			AllowedValues:    []any{true, false},
			IsDiscreteValues: true,
			AllowedScopes:    []Scope{ScopeUser},
			Value:            MustNewValue(false, ValueTypeBoolean),
		},
		NameNavShortcuts: {
			Name:             NameNavShortcuts,
			Description:      "A list of shortcuts to be shown in the navigation.",
			ValueType:        ValueTypeArray,
			DefaultValue:     MustNewValue([]any{}, ValueTypeArray),
			AllowedValues:    []any{},
			AllowedScopes:    []Scope{ScopeUser},
			IsDiscreteValues: false,
			Value:            MustNewValue([]any{}, ValueTypeArray),
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
		Value:            preference.DefaultValue,
	}, nil
}

func NewGettablePreference(preference *Preference) *GettablePreference {
	return preference
}

func NewStorableOrgPreference(preference *Preference, value Value, orgID valuer.UUID) (*StorableOrgPreference, error) {
	return &StorableOrgPreference{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Name:  preference.Name,
		Value: value.stringValue,
		OrgID: orgID,
	}, nil
}

func NewStorableUserPreference(preference *Preference, value Value, userID valuer.UUID) (*StorableUserPreference, error) {
	return &StorableUserPreference{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Name:   preference.Name,
		Value:  value.stringValue,
		UserID: userID,
	}, nil
}

func (storablePreference *StorableOrgPreference) UpdateValue(value Value) error {
	storablePreference.Value = value.stringValue
	return nil
}

func (storablePreference *StorableUserPreference) UpdateValue(value Value) error {
	storablePreference.Value = value.stringValue
	return nil
}

type Store interface {
	// Returns the preference for the given organization and name.
	GetByOrg(context.Context, valuer.UUID, Name) (*StorableOrgPreference, error)

	// Returns all preferences for the given organization.
	ListByOrg(context.Context, valuer.UUID) ([]*StorableOrgPreference, error)

	// Upserts the preference for the given organization.
	UpsertByOrg(context.Context, *StorableOrgPreference) error

	// Returns the preference for the given user and name.
	GetByUser(context.Context, valuer.UUID, Name) (*StorableUserPreference, error)

	// Returns all preferences for the given user.
	ListByUser(context.Context, valuer.UUID) ([]*StorableUserPreference, error)

	// Upserts the preference for the given user.
	UpsertByUser(context.Context, *StorableUserPreference) error
}
