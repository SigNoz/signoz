package dashboardtypes

import (
	"encoding/json"
	"maps"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/perses/spec/go/common"
	"github.com/perses/spec/go/dashboard"
	"github.com/perses/spec/go/dashboard/variable"
	"github.com/swaggest/jsonschema-go"
)

type Display struct {
	Name        string `json:"name" required:"true"`
	Description string `json:"description,omitempty"`
}

// ══════════════════════════════════════════════
// Datasource
// ══════════════════════════════════════════════

type DatasourceSpec struct {
	Display *common.Display  `json:"display,omitempty"`
	Default bool             `json:"default"`
	Plugin  DatasourcePlugin `json:"plugin"`
}

// ══════════════════════════════════════════════
// Panel
// ══════════════════════════════════════════════

type Panel struct {
	Kind PanelKind `json:"kind" required:"true"`
	Spec PanelSpec `json:"spec" required:"true"`
}

// PanelKind is the panel envelope discriminator. Perses leaves it a free
// string; SigNoz locks it to the single valid value.
type PanelKind string

const PanelKindPanel PanelKind = "Panel"

// Enum surfaces the allowed value in the generated OpenAPI schema.
func (PanelKind) Enum() []any { return []any{PanelKindPanel} }

func (k *PanelKind) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid panel kind")
	}
	if PanelKind(s) != PanelKindPanel {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown panel kind %q; allowed values: %s", s, allowedValuesForKind([]PanelKind{PanelKindPanel}))
	}
	*k = PanelKind(s)
	return nil
}

type PanelSpec struct {
	Display Display          `json:"display" required:"true"`
	Plugin  PanelPlugin      `json:"plugin" required:"true"`
	Queries []Query          `json:"queries" required:"true"`
	Links   []dashboard.Link `json:"links,omitempty"`
}

// ══════════════════════════════════════════════
// Query
// ══════════════════════════════════════════════

type Query struct {
	Kind qb.RequestType `json:"kind" required:"true"`
	Spec QuerySpec      `json:"spec" required:"true"`
}

type QuerySpec struct {
	Name   string      `json:"name,omitempty"`
	Plugin QueryPlugin `json:"plugin" required:"true"`
}

// ══════════════════════════════════════════════
// Variable
// ══════════════════════════════════════════════

// Variable is the list/text sum type. Spec is set to *ListVariableSpec or
// *dashboard.TextVariableSpec by UnmarshalJSON based on Kind. The schema is a
// discriminated oneOf (see JSONSchemaOneOf).
type Variable struct {
	Kind variable.Kind `json:"kind" required:"true"`
	Spec any           `json:"spec" required:"true"`
}

func (Variable) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "kind", map[string]string{
		string(variable.KindList): schemaRef("DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpec"),
		string(variable.KindText): schemaRef("DashboardtypesVariableEnvelopeGithubComPersesSpecGoDashboardTextVariableSpec"),
	})
}

func (v *Variable) UnmarshalJSON(data []byte) error {
	kind, specJSON, err := extractKindAndSpec(data)
	if err != nil {
		return err
	}
	switch kind {
	case string(variable.KindList):
		spec, err := decodeSpec(specJSON, new(ListVariableSpec), kind)
		if err != nil {
			return err
		}
		v.Kind = variable.KindList
		v.Spec = spec
	case string(variable.KindText):
		spec, err := decodeSpec(specJSON, new(dashboard.TextVariableSpec), kind)
		if err != nil {
			return err
		}
		v.Kind = variable.KindText
		v.Spec = spec
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown variable kind %q; allowed values: %s", kind, allowedValuesForKind([]variable.Kind{variable.KindList, variable.KindText}))
	}
	return nil
}

func (Variable) JSONSchemaOneOf() []any {
	return []any{
		VariableEnvelope[ListVariableSpec]{Kind: string(variable.KindList)},
		VariableEnvelope[dashboard.TextVariableSpec]{Kind: string(variable.KindText)},
	}
}

type VariableEnvelope[S any] struct {
	Kind string `json:"kind" required:"true"`
	Spec S      `json:"spec" required:"true"`
}

func (v VariableEnvelope[S]) PrepareJSONSchema(s *jsonschema.Schema) error {
	return restrictKindToOneValue(s, v.Kind)
}

// ListVariableSpec mirrors dashboard.ListVariableSpec (variable.ListSpec
// fields + Name) but with a typed VariablePlugin replacing common.Plugin.
type ListVariableSpec struct {
	Display         Display                `json:"display" required:"true"`
	DefaultValue    *variable.DefaultValue `json:"defaultValue,omitempty"`
	AllowAllValue   bool                   `json:"allowAllValue"`
	AllowMultiple   bool                   `json:"allowMultiple"`
	CustomAllValue  string                 `json:"customAllValue,omitempty"`
	CapturingRegexp string                 `json:"capturingRegexp,omitempty"`
	Sort            *variable.Sort         `json:"sort,omitempty"`
	Plugin          VariablePlugin         `json:"plugin"`
	Name            string                 `json:"name"`
}

// ══════════════════════════════════════════════
// Layout
// ══════════════════════════════════════════════

// Layout is the dashboard layout sum type. Spec is populated by UnmarshalJSON
// with the concrete layout spec struct (today only dashboard.GridLayoutSpec)
// based on Kind. No plugin is involved, so we reuse the Perses spec types as
// leaf imports.
type Layout struct {
	Kind dashboard.LayoutKind `json:"kind" required:"true"`
	Spec any                  `json:"spec" required:"true"`
}

// layoutSpecs is the layout sum type factory. Perses only defines
// KindGridLayout today; adding a new kind upstream surfaces as an
// "unknown layout kind" runtime error here until we add it.
var layoutSpecs = map[dashboard.LayoutKind]func() any{
	dashboard.KindGridLayout: func() any { return new(dashboard.GridLayoutSpec) },
}

func (Layout) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "kind", map[string]string{
		string(dashboard.KindGridLayout): schemaRef("DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpec"),
	})
}

func (l *Layout) UnmarshalJSON(data []byte) error {
	kind, specJSON, err := extractKindAndSpec(data)
	if err != nil {
		return err
	}
	factory, ok := layoutSpecs[dashboard.LayoutKind(kind)]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown layout kind %q; allowed values: %s", kind, allowedValuesForKind(slices.Sorted(maps.Keys(layoutSpecs))))
	}
	spec, err := decodeSpec(specJSON, factory(), kind)
	if err != nil {
		return err
	}
	l.Kind = dashboard.LayoutKind(kind)
	l.Spec = spec
	return nil
}

func (Layout) JSONSchemaOneOf() []any {
	return []any{
		LayoutEnvelope[dashboard.GridLayoutSpec]{Kind: string(dashboard.KindGridLayout)},
	}
}

type LayoutEnvelope[S any] struct {
	Kind string `json:"kind" required:"true"`
	Spec S      `json:"spec" required:"true"`
}

func (v LayoutEnvelope[S]) PrepareJSONSchema(s *jsonschema.Schema) error {
	return restrictKindToOneValue(s, v.Kind)
}
