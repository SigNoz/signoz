package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"
	"unicode/utf8"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/perses/spec/go/common"
	"github.com/perses/spec/go/dashboard"
)

// DashboardSpec is the SigNoz dashboard v2 spec shape. It mirrors
// dashboard.Spec (Perses) field-for-field, except every common.Plugin
// occurrence is replaced with a typed SigNoz plugin whose OpenAPI schema is a
// per-site discriminated oneOf.
type DashboardSpec struct {
	Display         Display                    `json:"display" required:"true"`
	Datasources     map[string]*DatasourceSpec `json:"datasources,omitempty"`
	Variables       []Variable                 `json:"variables" required:"true" nullable:"false"`
	Panels          map[string]*Panel          `json:"panels" required:"true" nullable:"false"`
	Layouts         []Layout                   `json:"layouts" required:"true" nullable:"false"`
	Duration        common.DurationString      `json:"duration,omitempty"`
	RefreshInterval common.DurationString      `json:"refreshInterval,omitempty"`
	Links           []dashboard.Link           `json:"links,omitempty"`
}

// ══════════════════════════════════════════════
// Unmarshal + validate entry point
// ══════════════════════════════════════════════

func (d *DashboardSpec) UnmarshalJSON(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	type alias DashboardSpec
	var tmp alias
	if err := dec.Decode(&tmp); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid dashboard spec")
	}
	*d = DashboardSpec(tmp)
	return d.Validate()
}

// ══════════════════════════════════════════════
// Cross-field validation
// ══════════════════════════════════════════════

func (d *DashboardSpec) Validate() error {
	if err := d.Display.Validate("dashboard", "spec.display.name"); err != nil {
		return err
	}
	if err := d.validateVariables(); err != nil {
		return err
	}
	if err := d.validatePanels(); err != nil {
		return err
	}
	return d.validateLayouts()
}

// validateVariables rejects two variables sharing the same name.
func (d *DashboardSpec) validateVariables() error {
	seen := make(map[string]struct{}, len(d.Variables))
	for i, v := range d.Variables {
		var name string
		var err error
		// Validated here, not by decodeSpec on decode, so variable errors surface from
		// Validate() with clean messages (not buried under the decoder's "invalid
		// dashboard spec" wrap) and also run for programmatically built specs (cloning).
		path := fmt.Sprintf("spec.variables[%d]", i)
		switch s := v.Spec.(type) {
		case *ListVariableSpec:
			name, err = s.Name, s.validate(path)
		case *TextVariableSpec:
			name, err = s.Name, s.validate(path)
		default:
			// Unreachable via UnmarshalJSON; reaching here means a Go caller broke the Kind/Spec pairing.
			return errors.NewInternalf(errors.CodeInternal, "spec.variables[%d].spec: unexpected variable spec type %T", i, v.Spec)
		}
		if err != nil {
			return err
		}
		if _, dup := seen[name]; dup {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.variables[%d]: duplicate variable name %q", i, name)
		}
		seen[name] = struct{}{}
	}
	return nil
}

func (d *DashboardSpec) validatePanels() error {
	for key, panel := range d.Panels {
		if err := common.ValidateID(key); err != nil {
			return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "spec.panels: %s", err.Error())
		}
		if panel == nil {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.panels.%s: panel must not be null", key)
		}
		path := fmt.Sprintf("spec.panels.%s", key)
		if err := panel.Spec.Display.Validate("panel", path+".spec.display.name"); err != nil {
			return err
		}
		panelKind := panel.Spec.Plugin.Kind
		if len(panel.Spec.Queries) != 1 {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s.spec.queries: panel must have one query", path)
		}
		allowed := allowedQueryKinds[panelKind]
		for qi, q := range panel.Spec.Queries {
			if err := d.validateQuery(qi, q, panelKind, path, allowed); err != nil {
				return err
			}
		}
	}
	return nil
}

func (d *DashboardSpec) validateQuery(qi int, q Query, panelKind PanelPluginKind, path string, allowed []QueryPluginKind) error {
	queryPath := fmt.Sprintf("%s.spec.queries[%d].spec.plugin", path, qi)
	if err := validateQueryAllowedForPanel(q.Spec.Plugin, allowed, panelKind, queryPath); err != nil {
		return err
	}
	if err := validateQueryContent(q, queryPath); err != nil {
		return err
	}
	return nil
}

func validateQueryAllowedForPanel(plugin QueryPlugin, allowed []QueryPluginKind, panelKind PanelPluginKind, path string) error {
	compositeSubQueryTypeToPluginKind := map[qb.QueryType]QueryPluginKind{
		qb.QueryTypeBuilder:       QueryKindBuilder,
		qb.QueryTypeFormula:       QueryKindFormula,
		qb.QueryTypeTraceOperator: QueryKindTraceOperator,
		qb.QueryTypePromQL:        QueryKindPromQL,
		qb.QueryTypeClickHouseSQL: QueryKindClickHouseSQL,
	}
	if !slices.Contains(allowed, plugin.Kind) {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
			"%s: query kind %q is not supported by panel kind %q", path, plugin.Kind, panelKind)
	}

	if plugin.Kind != QueryKindComposite {
		return nil
	}
	composite, ok := plugin.Spec.(*CompositeQuerySpec)
	if !ok || composite == nil {
		// Unreachable via UnmarshalJSON; reaching here means a Go caller broke the Kind/Spec pairing.
		return errors.NewInternalf(errors.CodeInternal, "%s: composite query plugin has unexpected spec type %T", path, plugin.Spec)
	}
	for si, sub := range composite.Queries {
		subKind, ok := compositeSubQueryTypeToPluginKind[sub.Type]
		if !ok {
			continue
		}
		if !slices.Contains(allowed, subKind) {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput,
				"%s.spec.queries[%d]: sub-query type %q is not supported by panel kind %q",
				path, si, sub.Type, panelKind)
		}
	}
	return nil
}

// validateQueryContent runs the query-builder type's own validation on the panel's
// query - whatever its kind - by assembling the same v5 composite query the panel would
// execute and delegating to it. The rules (aggregations, group by, order by, promql /
// clickhouse / formula / trace-operator specifics, ...) live on querybuildertypesv5; this
// only delegates, scoped to the query's request type, so a dashboard cannot persist a
// query the querier would later reject. Request-type options keep e.g. a list (raw) panel
// from being forced to carry an aggregation.
func validateQueryContent(q Query, path string) error {
	composite, err := q.Spec.Plugin.buildV5CompositeQueryFromPlugin()
	if err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s: %s", path, err.Error())
	}
	if err := composite.Validate(qb.GetValidationOptions(q.Kind)...); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s: %s", path, err.Error())
	}
	// Dashboard-write only, not the query-range request, so query-range behaviour is
	// unchanged: agg_rewriter trims after a comma there; dashboards reject the packing.
	if err := validateSingleExpressionAggregations(composite); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s: %s", path, err.Error())
	}
	return nil
}

// validateSingleExpressionAggregations rejects a logs/traces aggregation that packs
// several calls into one expression (e.g. "count(), sum(field)"), which the rewriter
// would silently truncate to the first call.
func validateSingleExpressionAggregations(composite qb.CompositeQuery) error {
	for _, envelope := range composite.Queries {
		switch query := envelope.Spec.(type) {
		case qb.QueryBuilderQuery[qb.LogAggregation]:
			for _, agg := range query.Aggregations {
				if err := ensureSingleExpressionAggregation(agg.Expression); err != nil {
					return err
				}
			}
		case qb.QueryBuilderQuery[qb.TraceAggregation]:
			for _, agg := range query.Aggregations {
				if err := ensureSingleExpressionAggregation(agg.Expression); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

// ensureSingleExpressionAggregation rejects an expression that parses to more than one
// SELECT item; exact where a regex count is not (string literals, nesting). Same
// SELECT-wrap parse as parseFragment in pkg/querybuilder/agg_rewrite.go.
func ensureSingleExpressionAggregation(expression string) error {
	wrapped := fmt.Sprintf("SELECT %s", expression)
	p := chparser.NewParser(wrapped)
	stmts, err := p.ParseStmts()
	if err != nil {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid aggregation expression `%s`: unable to parse expression", expression)
	}
	if len(stmts) == 0 {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "invalid aggregation expression `%s`: no statements in the expression", expression)
	}
	sel, ok := stmts[0].(*chparser.SelectQuery)
	if !ok {
		// can't happen cuz wrapped is a SELECT query.
		return errors.NewInternalf(errors.CodeInternal, "invalid aggregation expression `%s`", expression)
	}
	if len(sel.SelectItems) > 1 {
		// this is the only part that is different from pkg/querybuilder/agg_rewrite.go.
		return errors.NewInvalidInputf(
			ErrCodeDashboardInvalidInput,
			"aggregation expression `%s` must contain a single function call; provide multiple aggregations as separate entries",
			expression,
		)
	}
	if len(sel.SelectItems) == 0 {
		// can't happen cuz wrapped is a SELECT query.
		return errors.NewInternalf(errors.CodeInternal, "invalid aggregation expression `%s`", expression)
	}
	return nil
}

// validateLayouts rejects grid items referencing a panel that doesn't exist.
const maxLayoutsPerDashboard = 500

// validateLayouts validates the dashboard's layouts: bounded section count,
// per-item geometry, resolvable panel references, and no panel placed twice.
// Geometry (validateGridLayoutGeometry) needs only each layout's own data but
// runs here so its errors can name the layout by index.
func (d *DashboardSpec) validateLayouts() error {
	if len(d.Layouts) > maxLayoutsPerDashboard {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts: dashboard has %d layouts; maximum is %d", len(d.Layouts), maxLayoutsPerDashboard)
	}

	// Could enforce this but skipping for now: panels in no grid item (orphans)
	// are allowed.

	// The frontend keys each grid item by its panel id, so placing one panel in
	// two grid items collides; reject duplicate references dashboard-wide. Maps
	// each referenced panel key to the path of the item that first placed it.
	referencedPanels := make(map[string]string, len(d.Panels))
	for li, layout := range d.Layouts {
		grid, ok := layout.Spec.(*dashboard.GridLayoutSpec)
		if !ok {
			// Unreachable via UnmarshalJSON; reaching here means a Go caller broke the Kind/Spec pairing.
			return errors.NewInternalf(errors.CodeInternal, "spec.layouts[%d].spec: unexpected layout spec type %T", li, layout.Spec)
		}
		if grid.Display != nil {
			if n := utf8.RuneCountInString(grid.Display.Title); n > MaxDisplayNameLen {
				return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.layouts[%d].spec.display.title: layout name must be at most %d characters, got %d", li, MaxDisplayNameLen, n)
			}
		}
		if err := validateGridLayoutGeometry(grid, li); err != nil {
			return err
		}
		for ii, item := range grid.Items {
			path := fmt.Sprintf("spec.layouts[%d].spec.items[%d].content", li, ii)
			if item.Content == nil {
				return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: content reference is required", path)
			}
			key, err := panelKeyFromRef(item.Content.Path, item.Content.Ref, path)
			if err != nil {
				return err
			}
			if _, ok := d.Panels[key]; !ok {
				return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: references unknown panel %q", path, key)
			}
			if firstPath, dup := referencedPanels[key]; dup {
				return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: panel %q is already placed by %s", path, key, firstPath)
			}
			referencedPanels[key] = path
		}
	}
	return nil
}

// panelKeyFromRef extracts <key> from a "#/spec/panels/<key>" content ref.
func panelKeyFromRef(refPath []string, ref string, path string) (string, error) {
	if len(refPath) != 3 || refPath[0] != "spec" || refPath[1] != "panels" {
		return "", errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s: %q must reference a panel as \"#/spec/panels/<key>\"", path, ref)
	}
	return refPath[2], nil
}
