package dashboardtypes

import (
	"encoding/json"
	"fmt"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/go-playground/validator/v10"
	v1 "github.com/perses/perses/pkg/model/api/v1"
	"github.com/perses/perses/pkg/model/api/v1/common"
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
	panelPluginSpecs = map[string]func() any{
		PanelKindTimeSeries: func() any { return new(TimeSeriesPanelSpec) },
		PanelKindBarChart:   func() any { return new(BarChartPanelSpec) },
		PanelKindNumber:     func() any { return new(NumberPanelSpec) },
		PanelKindPieChart:   func() any { return new(PieChartPanelSpec) },
		PanelKindTable:      func() any { return new(TablePanelSpec) },
		PanelKindHistogram:  func() any { return new(HistogramPanelSpec) },
		PanelKindList:       func() any { return new(ListPanelSpec) },
	}
	queryPluginSpecs = map[string]func() any{
		QueryKindBuilder:       func() any { return new(BuilderQuerySpec) },
		QueryKindComposite:     func() any { return new(CompositeQuerySpec) },
		QueryKindFormula:       func() any { return new(FormulaSpec) },
		QueryKindPromQL:        func() any { return new(PromQLQuerySpec) },
		QueryKindClickHouseSQL: func() any { return new(ClickHouseSQLQuerySpec) },
		QueryKindTraceOperator: func() any { return new(TraceOperatorSpec) },
	}
	variablePluginSpecs = map[string]func() any{
		VariableKindDynamic: func() any { return new(DynamicVariableSpec) },
		VariableKindQuery:   func() any { return new(QueryVariableSpec) },
		VariableKindCustom:  func() any { return new(CustomVariableSpec) },
		VariableKindTextbox: func() any { return new(TextboxVariableSpec) },
	}
	datasourcePluginSpecs = map[string]func() any{
		DatasourceKindSigNoz: func() any { return new(struct{}) },
	}

	// allowedQueryKinds maps each panel plugin kind to the query plugin
	// kinds it supports. Composite sub-query types are mapped to these
	// same kind strings via compositeSubQueryTypeToPluginKind.
	allowedQueryKinds = map[string][]string{
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
	compositeSubQueryTypeToPluginKind = map[string]string{
		qb.QueryTypeBuilder.StringValue():       QueryKindBuilder,
		qb.QueryTypeFormula.StringValue():       QueryKindFormula,
		qb.QueryTypeTraceOperator.StringValue(): QueryKindTraceOperator,
		qb.QueryTypePromQL.StringValue():        QueryKindPromQL,
		qb.QueryTypeClickHouseSQL.StringValue(): QueryKindClickHouseSQL,
	}
)

func validateDashboardV2(d StorableDashboardDataV2) error {
	// Validate datasource plugins.
	for name, ds := range d.Datasources {
		if err := validatePlugin(ds.Plugin, datasourcePluginSpecs, fmt.Sprintf("spec.datasources.%s.plugin", name)); err != nil {
			return err
		}
	}

	// Validate variable plugins (only ListVariables have plugins; TextVariables do not).
	for i, v := range d.Variables {
		plugin, err := extractPluginFromVariable(v)
		if err != nil {
			return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "spec.variables[%d]", i)
		}
		if plugin == nil {
			continue
		}
		if err := validatePlugin(*plugin, variablePluginSpecs, fmt.Sprintf("spec.variables[%d].spec.plugin", i)); err != nil {
			return err
		}
	}

	// Validate panel and query plugins.
	for key, panel := range d.Panels {
		if panel == nil {
			continue
		}
		path := fmt.Sprintf("spec.panels.%s", key)
		if err := validatePlugin(panel.Spec.Plugin, panelPluginSpecs, path+".spec.plugin"); err != nil {
			return err
		}
		allowed := allowedQueryKinds[panel.Spec.Plugin.Kind]
		for qi, query := range panel.Spec.Queries {
			queryPath := fmt.Sprintf("%s.spec.queries[%d].spec.plugin", path, qi)
			if err := validatePlugin(query.Spec.Plugin, queryPluginSpecs, queryPath); err != nil {
				return err
			}
			if err := validateQueryAllowedForPanel(query.Spec.Plugin, allowed, panel.Spec.Plugin.Kind, queryPath); err != nil {
				return err
			}
		}
	}

	return nil
}

func validatePlugin(plugin common.Plugin, specs map[string]func() any, path string) error {
	if plugin.Kind == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: plugin kind is required", path)
	}
	factory, ok := specs[plugin.Kind]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: unknown plugin kind %q", path, plugin.Kind)
	}
	if plugin.Spec == nil {
		return nil
	}
	// Re-marshal the spec and unmarshal into the typed struct.
	specJSON, err := json.Marshal(plugin.Spec)
	if err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
	}
	target := factory()
	if err := json.Unmarshal(specJSON, target); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
	}
	if err := validator.New().Struct(target); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
	}
	return nil
}

// validateQueryAllowedForPanel checks that the query plugin kind is permitted
// for the given panel. For composite queries it recurses into sub-queries.
func validateQueryAllowedForPanel(plugin common.Plugin, allowed []string, panelKind string, path string) error {
	if !slices.Contains(allowed, plugin.Kind) {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
			"%s: query kind %q is not supported by panel kind %q", path, plugin.Kind, panelKind)
	}

	// For composite queries, validate each sub-query type.
	if plugin.Kind == QueryKindComposite && plugin.Spec != nil {
		specJSON, err := json.Marshal(plugin.Spec)
		if err != nil {
			return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s.spec", path)
		}
		var composite struct {
			Queries []struct {
				Type string `json:"type"`
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

// extractPluginFromVariable extracts the plugin from a variable.
// Returns nil if the variable has no plugin (e.g. TextVariable).
func extractPluginFromVariable(v any) (*common.Plugin, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var raw struct {
		Spec struct {
			Plugin *common.Plugin `json:"plugin,omitempty"`
		} `json:"spec"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, err
	}
	return raw.Spec.Plugin, nil
}
