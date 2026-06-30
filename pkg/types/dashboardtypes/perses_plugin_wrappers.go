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
	Kind PanelPluginKind `json:"kind" required:"true"`
	Spec any             `json:"spec" required:"true"`
}

// PrepareJSONSchema marks the envelope with x-signoz-discriminator;
// signoz.attachDiscriminators promotes it to a real OpenAPI 3 discriminator
// (and strips the duplicate parent properties) after reflection.
func (PanelPlugin) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "kind", map[string]string{
		string(PanelKindTimeSeries): schemaRef("DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpec"),
		string(PanelKindBarChart):   schemaRef("DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpec"),
		string(PanelKindNumber):     schemaRef("DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpec"),
		string(PanelKindPieChart):   schemaRef("DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpec"),
		string(PanelKindTable):      schemaRef("DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpec"),
		string(PanelKindHistogram):  schemaRef("DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpec"),
		string(PanelKindList):       schemaRef("DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpec"),
	})
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
	p.Spec = *spec
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
	Kind QueryPluginKind `json:"kind" required:"true"`
	Spec any             `json:"spec" required:"true"`
}

func (QueryPlugin) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "kind", map[string]string{
		string(QueryKindBuilder):       schemaRef("DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpec"),
		string(QueryKindComposite):     schemaRef("DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQuery"),
		string(QueryKindFormula):       schemaRef("DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormula"),
		string(QueryKindPromQL):        schemaRef("DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQuery"),
		string(QueryKindClickHouseSQL): schemaRef("DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQuery"),
		string(QueryKindTraceOperator): schemaRef("DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperator"),
	})
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
	p.Spec = *spec
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
	Kind VariablePluginKind `json:"kind" required:"true"`
	Spec any                `json:"spec" required:"true"`
}

func (VariablePlugin) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "kind", map[string]string{
		string(VariableKindDynamic): schemaRef("DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpec"),
		string(VariableKindQuery):   schemaRef("DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpec"),
		string(VariableKindCustom):  schemaRef("DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpec"),
	})
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
	p.Spec = *spec
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
	Kind DatasourcePluginKind `json:"kind" required:"true"`
	Spec any                  `json:"spec" required:"true"`
}

func (DatasourcePlugin) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "kind", map[string]string{
		string(DatasourceKindSigNoz): schemaRef("DashboardtypesDatasourcePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesSigNozDatasourceSpec"),
	})
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
	p.Spec = *spec
	return nil
}

func (DatasourcePlugin) JSONSchemaOneOf() []any {
	return []any{
		DatasourcePluginVariant[SigNozDatasourceSpec]{Kind: string(DatasourceKindSigNoz)},
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
		DatasourceKindSigNoz: func() any { return new(SigNozDatasourceSpec) },
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

func decodeSpec[T any](specJSON []byte, target T, kind string) (*T, error) {
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
	if v, ok := any(target).(interface{ validate() error }); ok {
		if err := v.validate(); err != nil {
			return nil, errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "kind %q: %s", kind, err.Error())
		}
	}
	return &target, nil
}

// signozDiscriminatorKey is the extension key that signoz.attachDiscriminators
// promotes into a native OpenAPI 3 discriminator after reflection.
const signozDiscriminatorKey = "x-signoz-discriminator"

// schemaRef builds a local component schema reference for a discriminator mapping.
func schemaRef(name string) string {
	return "#/components/schemas/" + name
}

// markDiscriminator tags a oneOf envelope schema with x-signoz-discriminator so
// signoz.attachDiscriminators promotes it to a real OpenAPI 3 discriminator,
// keyed on propertyName, with the given value -> schema-ref mapping. This turns
// the union into a discriminated DTO (instead of an intersection) for generated
// clients.
func markDiscriminator(s *jsonschema.Schema, propertyName string, mapping map[string]string) error {
	if s.ExtraProperties == nil {
		s.ExtraProperties = map[string]any{}
	}
	s.ExtraProperties[signozDiscriminatorKey] = map[string]any{
		"propertyName": propertyName,
		"mapping":      mapping,
	}
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
