package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"maps"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/go-playground/validator/v10"
	"github.com/swaggest/jsonschema-go"
)

// ══════════════════════════════════════════════
// Panel plugin
// ══════════════════════════════════════════════

type PanelPlugin struct {
	Kind PanelPluginKind `json:"kind"`
	Spec any             `json:"spec"`
}

// PrepareJSONSchema drops the reflected struct shape (type: object, properties)
// from the envelope so that only the JSONSchemaOneOf result binds.
func (PanelPlugin) PrepareJSONSchema(s *jsonschema.Schema) error {
	return clearOneOfParentShape(s)
}

func (p *PanelPlugin) UnmarshalJSON(data []byte) error {
	kind, specJSON, err := extractKindAndSpec(data)
	if err != nil {
		return err
	}
	factory, ok := panelPluginSpecs[PanelPluginKind(kind)]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown panel plugin kind %q; allowed values: %s", kind, allowedValuesForKind(slices.Sorted(maps.Keys(panelPluginSpecs))))
	}
	spec, err := decodeSpec(specJSON, factory(), kind)
	if err != nil {
		return err
	}
	p.Kind = PanelPluginKind(kind)
	p.Spec = spec
	return nil
}

func (PanelPlugin) JSONSchemaOneOf() []any {
	return []any{
		PanelPluginVariant[TimeSeriesPanelSpec]{Kind: string(PanelKindTimeSeries)},
		PanelPluginVariant[BarChartPanelSpec]{Kind: string(PanelKindBarChart)},
		PanelPluginVariant[NumberPanelSpec]{Kind: string(PanelKindNumber)},
		PanelPluginVariant[PieChartPanelSpec]{Kind: string(PanelKindPieChart)},
		PanelPluginVariant[TablePanelSpec]{Kind: string(PanelKindTable)},
		PanelPluginVariant[HistogramPanelSpec]{Kind: string(PanelKindHistogram)},
		PanelPluginVariant[ListPanelSpec]{Kind: string(PanelKindList)},
	}
}

type PanelPluginVariant[S any] struct {
	Kind string `json:"kind" required:"true"`
	Spec S      `json:"spec" required:"true"`
}

func (v PanelPluginVariant[S]) PrepareJSONSchema(s *jsonschema.Schema) error {
	return restrictKindToOneValue(s, v.Kind)
}

// ══════════════════════════════════════════════
// Query plugin
// ══════════════════════════════════════════════

type QueryPlugin struct {
	Kind QueryPluginKind `json:"kind"`
	Spec any             `json:"spec"`
}

func (QueryPlugin) PrepareJSONSchema(s *jsonschema.Schema) error {
	return clearOneOfParentShape(s)
}

func (p *QueryPlugin) UnmarshalJSON(data []byte) error {
	kind, specJSON, err := extractKindAndSpec(data)
	if err != nil {
		return err
	}
	factory, ok := queryPluginSpecs[QueryPluginKind(kind)]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown query plugin kind %q; allowed values: %s", kind, allowedValuesForKind(slices.Sorted(maps.Keys(queryPluginSpecs))))
	}
	spec, err := decodeSpec(specJSON, factory(), kind)
	if err != nil {
		return err
	}
	p.Kind = QueryPluginKind(kind)
	p.Spec = spec
	return nil
}

func (QueryPlugin) JSONSchemaOneOf() []any {
	return []any{
		QueryPluginVariant[BuilderQuerySpec]{Kind: string(QueryKindBuilder)},
		QueryPluginVariant[CompositeQuerySpec]{Kind: string(QueryKindComposite)},
		QueryPluginVariant[FormulaSpec]{Kind: string(QueryKindFormula)},
		QueryPluginVariant[PromQLQuerySpec]{Kind: string(QueryKindPromQL)},
		QueryPluginVariant[ClickHouseSQLQuerySpec]{Kind: string(QueryKindClickHouseSQL)},
		QueryPluginVariant[TraceOperatorSpec]{Kind: string(QueryKindTraceOperator)},
	}
}

type QueryPluginVariant[S any] struct {
	Kind string `json:"kind" required:"true"`
	Spec S      `json:"spec" required:"true"`
}

func (v QueryPluginVariant[S]) PrepareJSONSchema(s *jsonschema.Schema) error {
	return restrictKindToOneValue(s, v.Kind)
}

// ══════════════════════════════════════════════
// Variable plugin
// ══════════════════════════════════════════════

type VariablePlugin struct {
	Kind VariablePluginKind `json:"kind"`
	Spec any                `json:"spec"`
}

func (VariablePlugin) PrepareJSONSchema(s *jsonschema.Schema) error {
	return clearOneOfParentShape(s)
}

func (p *VariablePlugin) UnmarshalJSON(data []byte) error {
	kind, specJSON, err := extractKindAndSpec(data)
	if err != nil {
		return err
	}
	factory, ok := variablePluginSpecs[VariablePluginKind(kind)]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown variable plugin kind %q; allowed values: %s", kind, allowedValuesForKind(slices.Sorted(maps.Keys(variablePluginSpecs))))
	}
	spec, err := decodeSpec(specJSON, factory(), kind)
	if err != nil {
		return err
	}
	p.Kind = VariablePluginKind(kind)
	p.Spec = spec
	return nil
}

func (VariablePlugin) JSONSchemaOneOf() []any {
	return []any{
		VariablePluginVariant[DynamicVariableSpec]{Kind: string(VariableKindDynamic)},
		VariablePluginVariant[QueryVariableSpec]{Kind: string(VariableKindQuery)},
		VariablePluginVariant[CustomVariableSpec]{Kind: string(VariableKindCustom)},
	}
}

type VariablePluginVariant[S any] struct {
	Kind string `json:"kind" required:"true"`
	Spec S      `json:"spec" required:"true"`
}

func (v VariablePluginVariant[S]) PrepareJSONSchema(s *jsonschema.Schema) error {
	return restrictKindToOneValue(s, v.Kind)
}

// ══════════════════════════════════════════════
// Datasource plugin
// ══════════════════════════════════════════════

type DatasourcePlugin struct {
	Kind DatasourcePluginKind `json:"kind"`
	Spec any                  `json:"spec"`
}

func (DatasourcePlugin) PrepareJSONSchema(s *jsonschema.Schema) error {
	return clearOneOfParentShape(s)
}

func (p *DatasourcePlugin) UnmarshalJSON(data []byte) error {
	kind, specJSON, err := extractKindAndSpec(data)
	if err != nil {
		return err
	}
	factory, ok := datasourcePluginSpecs[DatasourcePluginKind(kind)]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "unknown datasource plugin kind %q; allowed values: %s", kind, allowedValuesForKind(slices.Sorted(maps.Keys(datasourcePluginSpecs))))
	}
	spec, err := decodeSpec(specJSON, factory(), kind)
	if err != nil {
		return err
	}
	p.Kind = DatasourcePluginKind(kind)
	p.Spec = spec
	return nil
}

func (DatasourcePlugin) JSONSchemaOneOf() []any {
	return []any{
		DatasourcePluginVariant[struct{}]{Kind: string(DatasourceKindSigNoz)},
	}
}

type DatasourcePluginVariant[S any] struct {
	Kind string `json:"kind" required:"true"`
	Spec S      `json:"spec" required:"true"`
}

func (v DatasourcePluginVariant[S]) PrepareJSONSchema(s *jsonschema.Schema) error {
	return restrictKindToOneValue(s, v.Kind)
}

// ══════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════

var (
	panelPluginSpecs = map[PanelPluginKind]func() any{
		PanelKindTimeSeries: func() any { return new(TimeSeriesPanelSpec) },
		PanelKindBarChart:   func() any { return new(BarChartPanelSpec) },
		PanelKindNumber:     func() any { return new(NumberPanelSpec) },
		PanelKindPieChart:   func() any { return new(PieChartPanelSpec) },
		PanelKindTable:      func() any { return new(TablePanelSpec) },
		PanelKindHistogram:  func() any { return new(HistogramPanelSpec) },
		PanelKindList:       func() any { return new(ListPanelSpec) },
	}
	queryPluginSpecs = map[QueryPluginKind]func() any{
		QueryKindBuilder:       func() any { return new(BuilderQuerySpec) },
		QueryKindComposite:     func() any { return new(CompositeQuerySpec) },
		QueryKindFormula:       func() any { return new(FormulaSpec) },
		QueryKindPromQL:        func() any { return new(PromQLQuerySpec) },
		QueryKindClickHouseSQL: func() any { return new(ClickHouseSQLQuerySpec) },
		QueryKindTraceOperator: func() any { return new(TraceOperatorSpec) },
	}
	variablePluginSpecs = map[VariablePluginKind]func() any{
		VariableKindDynamic: func() any { return new(DynamicVariableSpec) },
		VariableKindQuery:   func() any { return new(QueryVariableSpec) },
		VariableKindCustom:  func() any { return new(CustomVariableSpec) },
	}
	datasourcePluginSpecs = map[DatasourcePluginKind]func() any{
		DatasourceKindSigNoz: func() any { return new(struct{}) },
	}

	allowedQueryKinds = map[PanelPluginKind][]QueryPluginKind{
		PanelKindTimeSeries: {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindPromQL, QueryKindClickHouseSQL},
		PanelKindBarChart:   {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindPromQL, QueryKindClickHouseSQL},
		PanelKindNumber:     {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindPromQL, QueryKindClickHouseSQL},
		PanelKindHistogram:  {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindPromQL, QueryKindClickHouseSQL},
		PanelKindPieChart:   {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindClickHouseSQL},
		PanelKindTable:      {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindClickHouseSQL},
		PanelKindList:       {QueryKindBuilder},
	}
)

func allowedValuesForKind[K ~string](kinds []K) string {
	parts := make([]string, len(kinds))
	for i, k := range kinds {
		parts[i] = "`" + string(k) + "`"
	}
	return strings.Join(parts, ", ")
}

// extractKindAndSpec parses a {"kind": "...", "spec": {...}} envelope and returns
// kind and the raw spec bytes for typed decoding.
func extractKindAndSpec(data []byte) (string, []byte, error) {
	var head struct {
		Kind string          `json:"kind"`
		Spec json.RawMessage `json:"spec"`
	}
	if err := json.Unmarshal(data, &head); err != nil {
		return "", nil, errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid plugin envelope")
	}
	return head.Kind, head.Spec, nil
}

// decodeSpec strict-decodes a spec JSON into target and runs struct-tag validation (go-playground/validator).
func decodeSpec(specJSON []byte, target any, kind string) (any, error) {
	if len(specJSON) == 0 {
		return nil, errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "kind %q: spec is required", kind)
	}
	dec := json.NewDecoder(bytes.NewReader(specJSON))
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "kind %q: invalid spec JSON", kind)
	}
	if err := validator.New().Struct(target); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "kind %q: spec failed validation", kind)
	}
	return target, nil
}

// clearOneOfParentShape drops Type and Properties on a schema that also has a JSONSchemaOneOf.
func clearOneOfParentShape(s *jsonschema.Schema) error {
	s.Type = nil
	s.Properties = nil
	return nil
}

// restrictKindToOneValue ensures that the schema only allows one Kind value for a type.
// For eg. PanelPluginVariant[TimeSeriesPanelSpec]{Kind: string(PanelKindTimeSeries)} should
// only allow "signoz/TimeSeriesPanel" in its kind field.
func restrictKindToOneValue(schema *jsonschema.Schema, kind string) error {
	kindProp, ok := schema.Properties["kind"]
	if !ok || kindProp.TypeObject == nil {
		return errors.NewInternalf(errors.CodeInternal, "variant schema missing `kind` property")
	}
	kindProp.TypeObject.WithEnum(kind)
	schema.Properties["kind"] = kindProp
	return nil
}
