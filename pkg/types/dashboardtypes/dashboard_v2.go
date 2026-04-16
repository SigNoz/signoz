package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/go-playground/validator/v10"
	v1 "github.com/perses/perses/pkg/model/api/v1"
	"github.com/perses/perses/pkg/model/api/v1/common"
	"github.com/perses/perses/pkg/model/api/v1/dashboard"
)

// StorableDashboardDataV2 wraps v1.DashboardSpec (Perses) with additional SigNoz-specific fields.
//
// We embed DashboardSpec (not v1.Dashboard) to avoid carrying Perses's Metadata
// (Name, Project, CreatedAt, UpdatedAt, Tags, Version) and Kind field. SigNoz
// manages identity (ID), timestamps (TimeAuditable), and multi-tenancy (OrgID)
// separately on StorableDashboardV2/DashboardV2.
//
// The following v1 request fields map to locations inside v1.DashboardSpec:
//   - title       → Display.Name          (common.Display)
//   - description → Display.Description   (common.Display)
//
// Fields that have no Perses equivalent will be added in this wrapper (like image, uploadGrafana, etc.)
type StorableDashboardDataV2 = v1.DashboardSpec

// UnmarshalAndValidateDashboardV2JSON unmarshals the JSON into a StorableDashboardDataV2
// (= PostableDashboardV2 = UpdatableDashboardV2) and validates plugin kinds and specs.
func UnmarshalAndValidateDashboardV2JSON(data []byte) (*StorableDashboardDataV2, error) {
	var d StorableDashboardDataV2
	// Note: DashboardSpec has a custom UnmarshalJSON which prevents
	// DisallowUnknownFields from working at the top level. Unknown
	// fields in plugin specs are still rejected by validateAndNormalizePluginSpec.
	if err := json.Unmarshal(data, &d); err != nil {
		return nil, err
	}
	if err := validateDashboardV2(d); err != nil {
		return nil, err
	}
	return &d, nil
}

// Plugin kind → spec type factory. Each value is a pointer to the zero value of the
// expected spec struct. validatePluginSpec marshals plugin.Spec back to JSON and
// unmarshals into the typed struct to catch field-level errors.
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
		VariableKindTextbox: func() any { return new(TextboxVariableSpec) },
	}
	datasourcePluginSpecs = map[DatasourcePluginKind]func() any{
		DatasourceKindSigNoz: func() any { return new(struct{}) },
	}

	// allowedQueryKinds maps each panel plugin kind to the query plugin
	// kinds it supports. Composite sub-query types are mapped to these
	// same kind strings via compositeSubQueryTypeToPluginKind.
	allowedQueryKinds = map[PanelPluginKind][]QueryPluginKind{
		PanelKindTimeSeries: {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindPromQL, QueryKindClickHouseSQL},
		PanelKindBarChart:   {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindPromQL, QueryKindClickHouseSQL},
		PanelKindNumber:     {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindPromQL, QueryKindClickHouseSQL},
		PanelKindHistogram:  {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindPromQL, QueryKindClickHouseSQL},
		PanelKindPieChart:   {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindClickHouseSQL},
		PanelKindTable:      {QueryKindBuilder, QueryKindComposite, QueryKindFormula, QueryKindTraceOperator, QueryKindClickHouseSQL},
		PanelKindList:       {QueryKindBuilder},
	}

	// compositeSubQueryTypeToPluginKind maps CompositeQuery sub-query type
	// strings to the equivalent top-level query plugin kind for validation.
	compositeSubQueryTypeToPluginKind = map[qb.QueryType]QueryPluginKind{
		qb.QueryTypeBuilder:       QueryKindBuilder,
		qb.QueryTypeFormula:       QueryKindFormula,
		qb.QueryTypeTraceOperator: QueryKindTraceOperator,
		qb.QueryTypePromQL:        QueryKindPromQL,
		qb.QueryTypeClickHouseSQL: QueryKindClickHouseSQL,
	}
)

func validateDashboardV2(d StorableDashboardDataV2) error {
	for name, ds := range d.Datasources {
		if err := validateDatasourcePlugin(&ds.Plugin, fmt.Sprintf("spec.datasources.%s.plugin", name)); err != nil {
			return err
		}
	}

	for i, v := range d.Variables {
		if err := validateVariablePlugin(v, fmt.Sprintf("spec.variables[%d]", i)); err != nil {
			return err
		}
	}

	for key, panel := range d.Panels {
		if panel == nil {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.panels.%s: panel must not be null", key)
		}
		path := fmt.Sprintf("spec.panels.%s", key)
		if err := validatePanelPlugin(&panel.Spec.Plugin, path+".spec.plugin"); err != nil {
			return err
		}
		panelKind := PanelPluginKind(panel.Spec.Plugin.Kind)
		allowed := allowedQueryKinds[panelKind]
		for qi := range panel.Spec.Queries {
			queryPath := fmt.Sprintf("%s.spec.queries[%d].spec.plugin", path, qi)
			if err := validateQueryPlugin(&panel.Spec.Queries[qi].Spec.Plugin, queryPath); err != nil {
				return err
			}
			if err := validateQueryAllowedForPanel(panel.Spec.Queries[qi].Spec.Plugin, allowed, panelKind, queryPath); err != nil {
				return err
			}
		}
	}

	return nil
}

func validateDatasourcePlugin(plugin *common.Plugin, path string) error {
	kind := DatasourcePluginKind(plugin.Kind)
	factory, ok := datasourcePluginSpecs[kind]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
			"%s: unknown datasource plugin kind %q; allowed values: %s", path, kind, formatEnum(kind.Enum()))
	}
	return validateAndNormalizePluginSpec(plugin, factory, path)
}

func validateVariablePlugin(v dashboard.Variable, path string) error {
	switch spec := v.Spec.(type) {
	case *dashboard.ListVariableSpec:
		pluginPath := path + ".spec.plugin"
		kind := VariablePluginKind(spec.Plugin.Kind)
		factory, ok := variablePluginSpecs[kind]
		if !ok {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
				"%s: unknown variable plugin kind %q; allowed values: %s", pluginPath, kind, formatEnum(kind.Enum()))
		}
		return validateAndNormalizePluginSpec(&spec.Plugin, factory, pluginPath)
	case *dashboard.TextVariableSpec:
		// TextVariables have no plugin, nothing to validate.
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: unsupported variable kind %q", path, v.Kind)
	}
}

func validatePanelPlugin(plugin *common.Plugin, path string) error {
	kind := PanelPluginKind(plugin.Kind)
	factory, ok := panelPluginSpecs[kind]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
			"%s: unknown panel plugin kind %q; allowed values: %s", path, kind, formatEnum(kind.Enum()))
	}
	return validateAndNormalizePluginSpec(plugin, factory, path)
}

func validateQueryPlugin(plugin *common.Plugin, path string) error {
	kind := QueryPluginKind(plugin.Kind)
	factory, ok := queryPluginSpecs[kind]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
			"%s: unknown query plugin kind %q; allowed values: %s", path, kind, formatEnum(kind.Enum()))
	}
	return validateAndNormalizePluginSpec(plugin, factory, path)
}

func formatEnum(values []any) string {
	parts := make([]string, len(values))
	for i, v := range values {
		parts[i] = fmt.Sprintf("`%v`", v)
	}
	return strings.Join(parts, ", ")
}

// validateAndNormalizePluginSpec validates the plugin spec and writes the typed
// struct (with defaults) back into plugin.Spec so that DB storage and API
// responses contain normalized values.
func validateAndNormalizePluginSpec(plugin *common.Plugin, factory func() any, path string) error {
	if plugin.Kind == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: plugin kind is required", path)
	}
	if plugin.Spec == nil {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: plugin spec is required", path)
	}
	// Re-marshal the spec and unmarshal into the typed struct.
	specJSON, err := json.Marshal(plugin.Spec)
	if err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
	}
	target := factory()
	decoder := json.NewDecoder(bytes.NewReader(specJSON))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
	}
	if err := validator.New().Struct(target); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
	}
	// Write the typed struct back so defaults are included.
	plugin.Spec = target
	return nil
}

// validateQueryAllowedForPanel checks that the query plugin kind is permitted
// for the given panel. For composite queries it recurses into sub-queries.
func validateQueryAllowedForPanel(plugin common.Plugin, allowed []QueryPluginKind, panelKind PanelPluginKind, path string) error {
	queryKind := QueryPluginKind(plugin.Kind)
	if !slices.Contains(allowed, queryKind) {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
			"%s: query kind %q is not supported by panel kind %q", path, queryKind, panelKind)
	}

	// For composite queries, validate each sub-query type.
	if queryKind == QueryKindComposite && plugin.Spec != nil {
		specJSON, err := json.Marshal(plugin.Spec)
		if err != nil {
			return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
		}
		var composite struct {
			Queries []struct {
				Type qb.QueryType `json:"type"`
			} `json:"queries"`
		}
		if err := json.Unmarshal(specJSON, &composite); err != nil {
			return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
		}
		for si, sub := range composite.Queries {
			pluginKind, ok := compositeSubQueryTypeToPluginKind[sub.Type]
			if !ok {
				continue
			}
			if !slices.Contains(allowed, pluginKind) {
				return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
					"%s.spec.queries[%d]: sub-query type %q is not supported by panel kind %q",
					path, si, sub.Type, panelKind)
			}
		}
	}
	return nil
}
