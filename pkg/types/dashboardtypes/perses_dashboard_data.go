package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	v1 "github.com/perses/perses/pkg/model/api/v1"
	"github.com/perses/perses/pkg/model/api/v1/common"
)

// DashboardData is the SigNoz dashboard v2 spec shape. It mirrors
// v1.DashboardSpec (Perses) field-for-field, except every common.Plugin
// occurrence is replaced with a typed SigNoz plugin whose OpenAPI schema is a
// per-site discriminated oneOf.
type DashboardData struct {
	Display         *common.Display            `json:"display,omitempty"`
	Datasources     map[string]*DatasourceSpec `json:"datasources,omitempty"`
	Variables       []Variable                 `json:"variables,omitempty"`
	Panels          map[string]*Panel          `json:"panels"`
	Layouts         []Layout                   `json:"layouts"`
	Duration        common.DurationString      `json:"duration"`
	RefreshInterval common.DurationString      `json:"refreshInterval,omitempty"`
	Links           []v1.Link                  `json:"links,omitempty"`
}

// ══════════════════════════════════════════════
// Unmarshal + validate entry point
// ══════════════════════════════════════════════

func (d *DashboardData) UnmarshalJSON(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	type alias DashboardData
	var tmp alias
	if err := dec.Decode(&tmp); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "invalid dashboard spec")
	}
	*d = DashboardData(tmp)
	return d.Validate()
}

// ══════════════════════════════════════════════
// Cross-field validation
// ══════════════════════════════════════════════

func (d *DashboardData) Validate() error {
	for key, panel := range d.Panels {
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

var (
	compositeSubQueryTypeToPluginKind = map[qb.QueryType]QueryPluginKind{
		qb.QueryTypeBuilder:       QueryKindBuilder,
		qb.QueryTypeFormula:       QueryKindFormula,
		qb.QueryTypeTraceOperator: QueryKindTraceOperator,
		qb.QueryTypePromQL:        QueryKindPromQL,
		qb.QueryTypeClickHouseSQL: QueryKindClickHouseSQL,
	}
)
