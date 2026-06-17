package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"

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
		switch s := v.Spec.(type) {
		case *ListVariableSpec:
			name = s.Name
		case *TextVariableSpec:
			name = s.Name
		default:
			// Unreachable via UnmarshalJSON; reaching here means a Go caller broke the Kind/Spec pairing.
			return errors.NewInternalf(errors.CodeInternal, "spec.variables[%d].spec: unexpected variable spec type %T", i, v.Spec)
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
		panelKind := panel.Spec.Plugin.Kind
		if len(panel.Spec.Queries) != 1 {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "%s.spec.queries: panel must have one query", path)
		}
		allowed := allowedQueryKinds[panelKind]
		for qi, q := range panel.Spec.Queries {
			queryPath := fmt.Sprintf("%s.spec.queries[%d].spec.plugin", path, qi)
			if err := validateQueryAllowedForPanel(q.Spec.Plugin, allowed, panelKind, queryPath); err != nil {
				return err
			}
		}
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

// validateLayouts rejects grid items referencing a panel that doesn't exist.
func (d *DashboardSpec) validateLayouts() error {
	for li, layout := range d.Layouts {
		grid, ok := layout.Spec.(*dashboard.GridLayoutSpec)
		if !ok {
			// Unreachable via UnmarshalJSON; reaching here means a Go caller broke the Kind/Spec pairing.
			return errors.NewInternalf(errors.CodeInternal, "spec.layouts[%d].spec: unexpected layout spec type %T", li, layout.Spec)
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
