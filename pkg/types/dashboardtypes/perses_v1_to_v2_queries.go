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

// dropUnrenderableQueries removes queries whose aggregation can't render (see
// queryIsUnrenderable). If every query is unrenderable the result is empty, so the
// widget produces no panel and is skipped silently (convertV1Panels) — matching v1,
// which renders nothing.
func dropUnrenderableQueries(queries []map[string]any) []map[string]any {
	renderable := make([]map[string]any, 0, len(queries))
	for _, q := range queries {
		if !queryIsUnrenderable(q) {
			renderable = append(renderable, q)
		}
	}
	return renderable
}

// queryIsUnrenderable reports whether a builder query can't render because of its
// aggregations: a metrics query with none or an empty metric name, or a logs/traces
// query with an empty aggregation expression. No aggregations is valid for a raw
// logs/traces query, so that isn't flagged.
func queryIsUnrenderable(q map[string]any) bool {
	aggs, _ := q["aggregations"].([]any)
	switch signalFromDataSource(q["dataSource"]) {
	case telemetrytypes.SignalMetrics:
		if len(aggs) == 0 {
			return true
		}
		for _, a := range aggs {
			if agg, ok := a.(map[string]any); ok {
				if mn, _ := agg["metricName"].(string); mn == "" {
					return true
				}
			}
		}
	case telemetrytypes.SignalLogs, telemetrytypes.SignalTraces:
		for _, a := range aggs {
			if agg, ok := a.(map[string]any); ok {
				if expr, _ := agg["expression"].(string); expr == "" {
					return true
				}
			}
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
			// Drop empty queries; if none remain the widget produces no queries and is
			// skipped silently (convertV1Panels), as v1 renders nothing.
			if d.readString(q, "query") == "" {
				continue
			}
			out = append(out, promQLEnvelope(q))
		}
		return out, telemetrytypes.Signal{}

	case "clickhouse_sql":
		chQueries := d.readObjects(queryMap, "clickhouse_sql")
		var out []map[string]any
		for _, q := range chQueries {
			// Drop empty queries; if none remain the widget produces no queries and is
			// skipped silently (convertV1Panels), as v1 renders nothing.
			if d.readString(q, "query") == "" {
				continue
			}
			out = append(out, clickhouseEnvelope(q))
		}
		return out, telemetrytypes.Signal{}

	// "builder" plus a blank queryType: v1 defaults an unset type to builder, so a
	// missing value still carries a real builder query — try the builder path.
	case "builder", "":
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
			// After the aggregation is settled (incl. an injected default), so a
			// value-order key (#SIGNOZ_VALUE) can resolve against it.
			normalizeOrderByKeys(q)
		}
		queries = dropUnrenderableQueries(queries)
		for _, q := range queries {
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
			env := qb.WrapInV5Envelope(name, f, string(qb.QueryTypeFormula.StringValue()))
			// Drop a formula whose expression the validator rejects (blank/unparseable);
			// v1 tolerated it but v2 fails the whole query. Reuse the real validator
			// rather than reimplement it, as we do for functions.
			if !formulaEnvelopeIsValid(env) {
				continue
			}
			out = append(out, env)
		}
		for _, op := range d.readObjects(builder, "queryTraceOperator") {
			// A trace operator's expression is the operation itself ("A=>B->C") and is
			// required (ParseExpression rejects a blank one); drop it if empty.
			expression := d.readString(op, "expression")
			if expression == "" {
				continue
			}
			normalizePreV5QueryData(op, widgetType)
			normalizePreV5GroupBy(op)
			normalizeOrderByKeys(op)
			name := d.readString(op, "queryName")
			out = append(out, traceOperatorEnvelope(name, expression, op))
		}
		return out, signal
	default:
		d.note("widget %q has unknown queryType %q", d.readString(widget, "id"), queryType)
	}
	return nil, telemetrytypes.Signal{}
}

// traceOperatorEnvelope builds a v5 builder_trace_operator envelope. WrapInV5Envelope
// would misclassify a trace operator as a formula (its name differs from its
// expression, e.g. "A=>B->C"), so route the map through the builder-query path —
// temporarily aligning expression with name to dodge that heuristic — then restore the
// real expression, drop the builder-only signal (a trace operator's spec has no signal
// field), and set the trace-operator type.
func traceOperatorEnvelope(name, expression string, op map[string]any) map[string]any {
	op["expression"] = name
	env := qb.WrapInV5Envelope(name, op, string(qb.QueryTypeBuilder.StringValue()))
	if spec, ok := env["spec"].(map[string]any); ok {
		delete(spec, "signal")
		spec["expression"] = expression
	}
	env["type"] = string(qb.QueryTypeTraceOperator.StringValue())
	return env
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

// formulaEnvelopeIsValid reports whether a builder_formula envelope's spec passes
// QueryBuilderFormula.Validate (blank/unparseable expression, blank name, invalid
// functions). Reuses the real validator rather than reimplementing it.
func formulaEnvelopeIsValid(env map[string]any) bool {
	spec, ok := env["spec"].(map[string]any)
	if !ok {
		return false
	}
	raw, err := json.Marshal(spec)
	if err != nil {
		return false
	}
	var f qb.QueryBuilderFormula
	if err := json.Unmarshal(raw, &f); err != nil {
		return false
	}
	return f.Validate() == nil
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
