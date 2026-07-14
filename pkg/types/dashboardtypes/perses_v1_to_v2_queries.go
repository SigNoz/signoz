package dashboardtypes

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// ══════════════════════════════════════════════
// Queries
// ══════════════════════════════════════════════

// convertV1WidgetQuery returns exactly one Query (per Spec.Validate). The kind
// chosen depends on the v1 widget query shape:
//   - a single query (promql / clickhouse_sql / builder) → its native kind
//   - multiple queries                                   → signoz/CompositeQuery
//
// A single query is never wrapped in a CompositeQuery; in particular List
// panels accept only a bare signoz/BuilderQuery. Builder queries are routed
// through qb.WrapInV5Envelope (in collectV1QueryEnvelopes), which translates v4
// builder-field names (orderBy/selectColumns/dataSource) into their v5
// equivalents and adds the `signal` field required by BuilderQuerySpec's
// per-signal dispatch.
func (d *v1Decoder) convertV1WidgetQuery(widget map[string]any, panelKind PanelPluginKind) []Query {
	envelopes, signal := d.collectV1QueryEnvelopes(widget, panelKind)
	if len(envelopes) == 0 {
		return nil
	}
	// List panels accept only a bare BuilderQuery — never a CompositeQuery. Keep the
	// first query and drop the rest so a multi-query v1 list widget still migrates.
	if panelKind == PanelKindList && len(envelopes) > 1 {
		envelopes = envelopes[:1]
	}
	requestType := requestTypeForPanel(panelKind)

	// A single query keeps its native kind — never wrapped in a CompositeQuery.
	if len(envelopes) == 1 {
		if q := singleQueryFromEnvelope(envelopes[0], requestType, signal); q != nil {
			return []Query{*q}
		}
	}

	// Default: wrap in CompositeQuery.
	composite, err := parseCompositeFromEnvelopes(envelopes)
	if err != nil || composite == nil {
		d.note("widget %q: could not build query from %d envelope(s): %s", d.readString(widget, "id"), len(envelopes), detailErr(err))
		return nil
	}
	return []Query{{
		Kind: requestType,
		Spec: QuerySpec{
			Plugin: QueryPlugin{Kind: QueryKindComposite, Spec: composite},
		},
	}}
}

// isUnrenderableMetricQuery reports whether the panel's only query is a metric
// builder query that v2 rejects: no aggregations at all ("at least one aggregation
// is required") or an aggregation with no metric name ("metric name is required").
// v1 doesn't render either, so the widget is skipped silently.
func isUnrenderableMetricQuery(panel *Panel) bool {
	if len(panel.Spec.Queries) != 1 {
		return false
	}
	plugin := panel.Spec.Queries[0].Spec.Plugin
	if plugin.Kind != QueryKindBuilder {
		return false
	}
	bqs, ok := plugin.Spec.(*BuilderQuerySpec)
	if !ok {
		return false
	}
	mq, ok := bqs.Spec.(qb.QueryBuilderQuery[qb.MetricAggregation])
	if !ok {
		return false
	}
	if len(mq.Aggregations) == 0 {
		return true
	}
	for _, agg := range mq.Aggregations {
		if agg.MetricName == "" {
			return true
		}
	}
	return false
}

// requestTypeForPanel maps a v2 panel plugin kind to the request type (result
// shape) its queries produce. Mirrors the frontend's panelTypeToRequestType
// (buildQueryRangeRequest.ts): time series for line/bar/histogram (histogram
// bins client-side from raw time series, V1 parity), scalar for
// number/pie/table, raw rows for list.
func requestTypeForPanel(panelKind PanelPluginKind) qb.RequestType {
	switch panelKind {
	case PanelKindTimeSeries, PanelKindBarChart, PanelKindHistogram:
		return qb.RequestTypeTimeSeries
	case PanelKindNumber, PanelKindPieChart, PanelKindTable:
		return qb.RequestTypeScalar
	case PanelKindList:
		return qb.RequestTypeRaw
	}
	return qb.RequestTypeTimeSeries
}

// collectV1QueryEnvelopes inspects widget.query.queryType and produces a
// flattened list of v5-shaped envelopes. The returned signal is the dominant
// builder signal (if any), used for typed builder-query dispatch.
func (d *v1Decoder) collectV1QueryEnvelopes(widget map[string]any, panelKind PanelPluginKind) ([]map[string]any, telemetrytypes.Signal) {
	queryMap := d.readObject(widget, "query")
	if queryMap == nil {
		d.note("widget %q has no query map", d.readString(widget, "id"))
		return nil, telemetrytypes.Signal{}
	}
	rowLimitPanel := panelKind == PanelKindList || panelKind == PanelKindTable
	// Raw (list) panels legitimately have no aggregation; every other panel needs one.
	needsAggregation := requestTypeForPanel(panelKind) != qb.RequestTypeRaw

	queryType := d.readString(queryMap, "queryType")
	switch queryType {
	case "promql":
		promQueries := d.readObjects(queryMap, "promql")
		var out []map[string]any
		for _, q := range promQueries {
			// With multiple promql queries, drop the empty ones; a lone query is
			// kept even if empty (nothing else would remain).
			if len(promQueries) > 1 && d.readString(q, "query") == "" {
				continue
			}
			out = append(out, promQLEnvelope(q))
		}
		return out, telemetrytypes.Signal{}

	case "clickhouse_sql":
		chQueries := d.readObjects(queryMap, "clickhouse_sql")
		var out []map[string]any
		for _, q := range chQueries {
			// With multiple clickhouse queries, drop the empty ones; a lone query is
			// kept even if empty (nothing else would remain).
			if len(chQueries) > 1 && d.readString(q, "query") == "" {
				continue
			}
			out = append(out, clickhouseEnvelope(q))
		}
		return out, telemetrytypes.Signal{}

	case "builder":
		builder := d.readObject(queryMap, "builder")
		if builder == nil {
			d.note("widget %q has no builder data in the query map", d.readString(widget, "id"))
			return nil, telemetrytypes.Signal{}
		}
		var out []map[string]any
		var signal telemetrytypes.Signal
		widgetType := d.readString(widget, "panelTypes")
		queries := d.readObjects(builder, "queryData")
		assignQueryDataNames(queries)
		for _, q := range queries {
			normalizePreV5QueryData(q, widgetType)
			normalizePreV5SelectColumns(q)
			normalizePreV5GroupBy(q)
			normalizePreV5PageSize(q, rowLimitPanel)
			normalizeQueryLimit(q)
			if needsAggregation {
				ensureDefaultAggregation(q)
			}
			name := d.readString(q, "queryName")
			out = append(out, qb.WrapInV5Envelope(name, q, string(qb.QueryTypeBuilder.StringValue())))
			if signal.IsZero() {
				signal = signalFromDataSource(q["dataSource"])
			}
		}
		formulas := d.readObjects(builder, "queryFormulas")
		assignMissingFormulaNames(formulas)
		for _, f := range formulas {
			normalizePreV5QueryData(f, widgetType)
			name := d.readString(f, "queryName")
			out = append(out, qb.WrapInV5Envelope(name, f, string(qb.QueryTypeFormula.StringValue())))
		}
		for _, op := range d.readObjects(builder, "queryTraceOperator") {
			normalizePreV5QueryData(op, widgetType)
			name := d.readString(op, "queryName")
			out = append(out, qb.WrapInV5Envelope(name, op, string(qb.QueryTypeTraceOperator.StringValue())))
		}
		return out, signal
	default:
		d.note("widget %q has unknown queryType %q", d.readString(widget, "id"), queryType)
	}
	return nil, telemetrytypes.Signal{}
}

// maxQueries mirrors the frontend MAX_QUERIES; builder query names run A..Z.
const maxQueries = 26

// assignQueryDataNames names builder data queries the way the frontend does: each
// unnamed query takes the first unused A..Z, deduped against existing names. It also
// forces expression == queryName, since a data query's expression is always its own
// name and WrapInV5Envelope's name != expression heuristic would otherwise
// misclassify the query as a formula.
func assignQueryDataNames(queries []map[string]any) {
	taken := make(map[string]bool, len(queries))
	for _, q := range queries {
		if name, _ := q["queryName"].(string); name != "" {
			taken[name] = true
		}
	}
	for _, q := range queries {
		name, _ := q["queryName"].(string)
		if name == "" {
			for i := 0; i < maxQueries; i++ {
				candidate := string(rune('A' + i))
				if !taken[candidate] {
					name = candidate
					taken[candidate] = true
					break
				}
			}
			q["queryName"] = name
		}
		q["expression"] = name
	}
}

// maxFormulas mirrors the frontend MAX_FORMULAS; formula names run F1..F20.
const maxFormulas = 20

// assignMissingFormulaNames fills queryName for unnamed formulas, mirroring the
// frontend: pick the first F{n} (n in 1..20) not already used by another formula.
// Formulas that already have a name keep it.
func assignMissingFormulaNames(formulas []map[string]any) {
	taken := make(map[string]bool, len(formulas))
	for _, f := range formulas {
		if name, _ := f["queryName"].(string); name != "" {
			taken[name] = true
		}
	}
	for _, f := range formulas {
		if name, _ := f["queryName"].(string); name != "" {
			continue
		}
		for i := 1; i <= maxFormulas; i++ {
			candidate := "F" + strconv.Itoa(i)
			if !taken[candidate] {
				f["queryName"] = candidate
				taken[candidate] = true
				break
			}
		}
	}
}

func promQLEnvelope(q map[string]any) map[string]any {
	return map[string]any{
		"type": qb.QueryTypePromQL.StringValue(),
		"spec": map[string]any{
			"name":     q["name"],
			"query":    q["query"],
			"disabled": q["disabled"],
			"legend":   q["legend"],
		},
	}
}

func clickhouseEnvelope(q map[string]any) map[string]any {
	return map[string]any{
		"type": qb.QueryTypeClickHouseSQL.StringValue(),
		"spec": map[string]any{
			"name":     q["name"],
			"query":    q["query"],
			"disabled": q["disabled"],
			"legend":   q["legend"],
		},
	}
}

// singleQueryFromEnvelope returns a typed Query for one envelope, using its
// native query kind (promql/clickhouse_sql/builder) rather than wrapping it in
// a CompositeQuery. A bare signoz/BuilderQuery is valid for every panel kind
// and is the only kind List panels accept.
func singleQueryFromEnvelope(envelope map[string]any, requestType qb.RequestType, signal telemetrytypes.Signal) *Query {
	t, _ := envelope["type"].(string)
	spec, _ := envelope["spec"].(map[string]any)
	switch t {
	case qb.QueryTypePromQL.StringValue():
		prom, err := decodeMapInto[qb.PromQuery](spec)
		if err != nil {
			return nil
		}
		return &Query{
			Kind: requestType,
			Spec: QuerySpec{
				Name:   prom.Name,
				Plugin: QueryPlugin{Kind: QueryKindPromQL, Spec: &prom},
			},
		}
	case qb.QueryTypeClickHouseSQL.StringValue():
		ch, err := decodeMapInto[qb.ClickHouseQuery](spec)
		if err != nil {
			return nil
		}
		return &Query{
			Kind: requestType,
			Spec: QuerySpec{
				Name:   ch.Name,
				Plugin: QueryPlugin{Kind: QueryKindClickHouseSQL, Spec: &ch},
			},
		}
	case qb.QueryTypeBuilder.StringValue():
		builderSpec := parseBuilderQuerySpec(spec, signal)
		if builderSpec == nil {
			return nil
		}
		name, _ := spec["name"].(string)
		return &Query{
			Kind: requestType,
			Spec: QuerySpec{
				Name:   name,
				Plugin: QueryPlugin{Kind: QueryKindBuilder, Spec: &BuilderQuerySpec{Spec: builderSpec}},
			},
		}
	}
	return nil
}

func parseCompositeFromEnvelopes(envelopes []map[string]any) (*CompositeQuerySpec, error) {
	bytes, err := json.Marshal(envelopes)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal v1 query envelopes")
	}
	var parsed []qb.QueryEnvelope
	if err := json.Unmarshal(bytes, &parsed); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidWidgetQuery, "decode v5 query envelopes")
	}
	return &CompositeQuerySpec{Queries: parsed}, nil
}

func parseBuilderQuerySpec(rawSpec any, signal telemetrytypes.Signal) any {
	spec, ok := rawSpec.(map[string]any)
	if !ok {
		return nil
	}
	if !signal.IsZero() {
		spec["signal"] = signal.StringValue()
	}
	bytes, err := json.Marshal(spec)
	if err != nil {
		return nil
	}
	parsed, err := qb.UnmarshalBuilderQueryBySignal(bytes)
	if err != nil {
		return nil
	}
	return parsed
}

// signalFromDataSource maps a v1 data-source string to a v5 signal. Casing
// varies by source: builder queries store lowercase ("traces"), while variable
// `dynamicVariablesSource` stores capitalized ("Traces"), so match
// case-insensitively. Unknown values (e.g. "All telemetry") map to the zero
// Signal.
func signalFromDataSource(raw any) telemetrytypes.Signal {
	s, _ := raw.(string)
	switch strings.ToLower(s) {
	case "traces":
		return telemetrytypes.SignalTraces
	case "logs":
		return telemetrytypes.SignalLogs
	case "metrics":
		return telemetrytypes.SignalMetrics
	}
	return telemetrytypes.Signal{}
}
