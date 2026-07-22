package dashboardtypes

import (
	"encoding/json"
	"maps"
	"slices"
	"strconv"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/perses/spec/go/common"
	"github.com/perses/spec/go/dashboard"
	"github.com/perses/spec/go/dashboard/variable"
	"github.com/swaggest/jsonschema-go"
)

// MaxDisplayNameLen bounds every human-readable display name — dashboard, panel,
// and variable display names, plus the grid layout title.
const MaxDisplayNameLen = 128

type Display struct {
	Name string `json:"name" required:"true"`
	// Description always serializes ("" included) so a create -> GET round-trip
	// preserves what a typed client sent; omitempty would drop an explicit "".
	Description string `json:"description"`
}

func (d Display) Validate(label, path string) error {
	if n := utf8.RuneCountInString(d.Name); n > MaxDisplayNameLen {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: %s name must be at most %d characters, got %d", path, label, MaxDisplayNameLen, n)
	}
	return nil
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
	Display Display     `json:"display" required:"true"`
	Plugin  PanelPlugin `json:"plugin" required:"true"`
	Queries []Query     `json:"queries" required:"true" nullable:"false"`
	Links   []Link      `json:"links,omitzero"`
}

// Link replicates dashboard.Link (Perses) so its zero-valued fields survive the
// create -> GET round-trip. Perses tags name/tooltip/renderVariables/targetBlank
// omitempty, which drops "" and false; here every field always serializes so a
// typed client reads back exactly what it sent.
type Link struct {
	Name            string `json:"name"`
	URL             string `json:"url"`
	Tooltip         string `json:"tooltip"`
	RenderVariables bool   `json:"renderVariables"`
	TargetBlank     bool   `json:"targetBlank"`
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
// *TextVariableSpec by UnmarshalJSON based on Kind. The schema is a
// discriminated oneOf (see JSONSchemaOneOf).
type Variable struct {
	Kind variable.Kind `json:"kind" required:"true"`
	Spec any           `json:"spec" required:"true"`
}

func (Variable) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "kind", map[string]string{
		string(variable.KindList): schemaRef("DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpec"),
		string(variable.KindText): schemaRef("DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpec"),
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
		v.Spec = *spec
	case string(variable.KindText):
		spec, err := decodeSpec(specJSON, new(TextVariableSpec), kind)
		if err != nil {
			return err
		}
		v.Kind = variable.KindText
		v.Spec = *spec
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown variable kind %q; allowed values: %s", kind, allowedValuesForKind([]variable.Kind{variable.KindList, variable.KindText}))
	}
	return nil
}

func (Variable) JSONSchemaOneOf() []any {
	return []any{
		VariableEnvelope[ListVariableSpec]{Kind: string(variable.KindList)},
		VariableEnvelope[TextVariableSpec]{Kind: string(variable.KindText)},
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
	Display         Display               `json:"display" required:"true"`
	DefaultValue    *VariableDefaultValue `json:"defaultValue,omitempty"`
	AllowAllValue   bool                  `json:"allowAllValue"`
	AllowMultiple   bool                  `json:"allowMultiple"`
	CustomAllValue  string                `json:"customAllValue"`
	CapturingRegexp string                `json:"capturingRegexp"`
	Sort            ListVariableSpecSort  `json:"sort"`
	Plugin          VariablePlugin        `json:"plugin"`
	Name            string                `json:"name" required:"true" minLength:"1"`
}

// VariableDefaultValue is a list variable's defaultValue: the string | []string
// union. It subclasses the perses variable.DefaultValue (which marshals as a
// scalar-or-array) so SigNoz can attach the oneOf schema to it as a named
// component.
//
// Emitting it as a named oneOf component (and having defaultValue $ref it),
// instead of inlining the union onto the property, gives downstream codegen a
// hook to canonicalize: oapi-codegen generates the union's Marshal/UnmarshalJSON
// and skaff's scalar-union pre-pass flattens it to a string attribute. An inline
// oneOf has no such named component to hook.
type VariableDefaultValue struct {
	variable.DefaultValue
}

// PrepareJSONSchema shapes the component as the string | []string oneOf; the
// reflected struct shape (a bare object) is wrong because the value marshals as
// a scalar-or-array, not an object.
func (VariableDefaultValue) PrepareJSONSchema(s *jsonschema.Schema) error {
	stringItem := jsonschema.String.ToSchemaOrBool()
	s.Type = nil
	s.Properties = nil
	s.WithOneOf(
		jsonschema.String.ToSchemaOrBool(),
		(&jsonschema.Schema{}).
			WithType(jsonschema.Array.Type()).
			WithItems(jsonschema.Items{SchemaOrBool: &stringItem}).
			ToSchemaOrBool(),
	)
	return nil
}

// validate mirrors perses ListVariableSpec validation (plus the digits-only name
// check perses only applies to text variables). path is the JSON path to this
// variable (e.g. "spec.variables[0]") and prefixes each message. Taking a param
// keeps it out of decodeSpec's validate() hook, so errors surface from Validate()
// with clean messages and also run for programmatically built specs (cloning).
func (s *ListVariableSpec) validate(path string) error {
	if err := s.Display.Validate("variable", path+".spec.display.name"); err != nil {
		return err
	}
	if err := common.ValidateID(s.Name); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s: %s", path, err.Error())
	}
	if _, err := strconv.Atoi(s.Name); err == nil {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: variable name cannot contain only digits", path)
	}
	if s.CustomAllValue != "" && !s.AllowAllValue {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: customAllValue cannot be set if allowAllValue is not set to true", path)
	}
	if s.DefaultValue != nil && len(s.DefaultValue.SliceValues) > 0 && !s.AllowMultiple {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: defaultValue cannot be a list if allowMultiple is not set to true", path)
	}
	return nil
}

// ListVariableSpecSort is the value-list sort method, mirrored from Perses as a
// stable enum so the allowed values surface in the generated OpenAPI schema.
type ListVariableSpecSort struct{ valuer.String }

var (
	SortNone                            = ListVariableSpecSort{valuer.NewString("none")}
	SortAlphabeticalAsc                 = ListVariableSpecSort{valuer.NewString("alphabetical-asc")}
	SortAlphabeticalDesc                = ListVariableSpecSort{valuer.NewString("alphabetical-desc")}
	SortNumericalAsc                    = ListVariableSpecSort{valuer.NewString("numerical-asc")}
	SortNumericalDesc                   = ListVariableSpecSort{valuer.NewString("numerical-desc")}
	SortAlphabeticalCaseInsensitiveAsc  = ListVariableSpecSort{valuer.NewString("alphabetical-ci-asc")}
	SortAlphabeticalCaseInsensitiveDesc = ListVariableSpecSort{valuer.NewString("alphabetical-ci-desc")}
)

func (ListVariableSpecSort) Enum() []any {
	return []any{
		SortNone,
		SortAlphabeticalAsc,
		SortAlphabeticalDesc,
		SortNumericalAsc,
		SortNumericalDesc,
		SortAlphabeticalCaseInsensitiveAsc,
		SortAlphabeticalCaseInsensitiveDesc,
	}
}

func (s ListVariableSpecSort) IsValid() bool {
	return slices.ContainsFunc(s.Enum(), func(v any) bool { return v == s })
}

func (s ListVariableSpecSort) ValueOrDefault() string {
	if s.IsZero() {
		return SortNone.StringValue()
	}
	return s.StringValue()
}

func (s ListVariableSpecSort) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.ValueOrDefault())
}

// UnmarshalJSON validates against the enum on decode (valuer.String alone
// accepts any string). An omitted sort defaults to `none` via ValueOrDefault; an
// explicit value present in the JSON — including `""` — is validated as-is.
func (s *ListVariableSpecSort) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid sort: must be a string, one of `none`, `alphabetical-asc`, `alphabetical-desc`, `numerical-asc`, `numerical-desc`, `alphabetical-ci-asc`, or `alphabetical-ci-desc`")
	}
	sort := ListVariableSpecSort{valuer.NewString(v)}
	if !sort.IsValid() {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown sort %q: must be `none`, `alphabetical-asc`, `alphabetical-desc`, `numerical-asc`, `numerical-desc`, `alphabetical-ci-asc`, or `alphabetical-ci-desc`", v)
	}
	*s = sort
	return nil
}

// TextVariableSpec replicates dashboard.TextVariableSpec so name can carry the
// required/non-empty schema tags perses leaves off.
type TextVariableSpec struct {
	Display  Display `json:"display" required:"true"`
	Value    string  `json:"value" required:"true"`
	Constant bool    `json:"constant"`
	Name     string  `json:"name" required:"true" minLength:"1"`
}

// validate mirrors perses TextVariableSpec validation. path is the JSON path to
// this variable (e.g. "spec.variables[0]") and prefixes each message. See
// ListVariableSpec.validate for why it takes a param.
func (s *TextVariableSpec) validate(path string) error {
	if err := s.Display.Validate("variable", path+".spec.display.name"); err != nil {
		return err
	}
	if err := common.ValidateID(s.Name); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s: %s", path, err.Error())
	}
	if _, err := strconv.Atoi(s.Name); err == nil {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: variable name cannot contain only digits", path)
	}
	if s.Value == "" && s.Constant {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: value for a constant text variable cannot be empty", path)
	}
	return nil
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
	l.Spec = *spec
	return nil
}

const (
	gridColumnCount       = 12
	maxItemsPerGridLayout = 100
)

// validateGridLayoutGeometry checks a single grid layout's item geometry (size,
// position, and intra-section overlap), which Perses does not. It reads only the
// layout's own items; layoutIndex is supplied by the caller (validateLayouts)
// solely to name the layout in error paths.
func validateGridLayoutGeometry(spec *dashboard.GridLayoutSpec, layoutIndex int) error {
	if len(spec.Items) > maxItemsPerGridLayout {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items: has %d items; maximum is %d", layoutIndex, len(spec.Items), maxItemsPerGridLayout)
	}
	for i, item := range spec.Items {
		// The width/x bounds keep x+width small enough not to overflow.
		switch {
		case item.Width < 1:
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items[%d]: width must be at least 1, got %d", layoutIndex, i, item.Width)
		case item.Height < 1:
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items[%d]: height must be at least 1, got %d", layoutIndex, i, item.Height)
		case item.X < 0:
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items[%d]: x must not be negative, got %d", layoutIndex, i, item.X)
		case item.Y < 0:
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items[%d]: y must not be negative, got %d", layoutIndex, i, item.Y)
		case item.Width > gridColumnCount:
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items[%d]: width (%d) exceeds grid width %d", layoutIndex, i, item.Width, gridColumnCount)
		case item.X >= gridColumnCount:
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items[%d]: x (%d) must be less than grid width %d", layoutIndex, i, item.X, gridColumnCount)
		case item.X+item.Width > gridColumnCount:
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items[%d]: x (%d) + width (%d) exceeds grid width %d", layoutIndex, i, item.X, item.Width, gridColumnCount)
		}
		// Could cap y/height but skipping for now: the grid grows vertically
		// without limit (frontend autoSize), so "too big" has no natural bound.
	}
	// Two items overlap iff their rectangles intersect on both axes.
	overlap := func(a, b dashboard.GridItem) bool {
		return a.X < b.X+b.Width && b.X < a.X+a.Width &&
			a.Y < b.Y+b.Height && b.Y < a.Y+a.Height
	}
	for i := 0; i < len(spec.Items); i++ {
		for j := i + 1; j < len(spec.Items); j++ {
			if overlap(spec.Items[i], spec.Items[j]) {
				return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.items[%d] and items[%d] overlap", layoutIndex, i, j)
			}
		}
	}
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
