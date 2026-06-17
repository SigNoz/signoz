package dashboardtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// ══════════════════════════════════════════════
// Queries
// ══════════════════════════════════════════════

// convertV1WidgetQuery returns exactly one Query (per Spec.Validate). The
// kind chosen depends on the v1 widget query shape:
//   - single promql               → signoz/PromQLQuery
//   - single clickhouse_sql       → signoz/ClickHouseSQL
//   - exactly one builder query   → signoz/BuilderQuery   (PanelKindList only)
//   - everything else             → signoz/CompositeQuery wrapping all envelopes
//
// Builder queries are routed through qb.WrapInV5Envelope, which translates v4
// builder-field names (orderBy/selectColumns/dataSource) into their v5
// equivalents and adds the `signal` field required by BuilderQuerySpec's
// per-signal dispatch.
func convertV1WidgetQuery(widget map[string]any, panelKind PanelPluginKind) []Query {
	envelopes, signal := collectV1QueryEnvelopes(widget)
	if len(envelopes) == 0 {
		return nil
	}
	requestType := requestTypeForPanel(panelKind)

	// List panels must use signoz/BuilderQuery (the only kind in
	// allowedQueryKinds[PanelKindList]).
	if panelKind == PanelKindList {
		first := envelopes[0]
		if t, _ := first["type"].(string); t == string(qb.QueryTypeBuilder.StringValue()) {
			spec := parseBuilderQuerySpec(first["spec"], signal)
			if spec == nil {
				return nil
			}
			return []Query{{
				Kind: requestType,
				Spec: QuerySpec{
					Name: valueAt[string](first["spec"], "name"),
					Plugin: QueryPlugin{
						Kind: QueryKindBuilder,
						Spec: &BuilderQuerySpec{Spec: spec},
					},
				},
			}}
		}
	}

	// Single non-builder query → use its native kind directly. Cleaner JSON
	// than wrapping in CompositeQuery for the common single-query case.
	if len(envelopes) == 1 {
		if q := singleQueryFromEnvelope(envelopes[0], requestType); q != nil {
			return []Query{*q}
		}
	}

	// Default: wrap in CompositeQuery.
	composite, err := parseCompositeFromEnvelopes(envelopes)
	if err != nil || composite == nil {
		return nil
	}
	return []Query{{
		Kind: requestType,
		Spec: QuerySpec{
			Plugin: QueryPlugin{Kind: QueryKindComposite, Spec: composite},
		},
	}}
}

// requestTypeForPanel maps a v2 panel plugin kind to the request type (result
// shape) its queries produce. Mirrors the shape each visualization consumes:
// time series for line/bar, scalar for number/pie/table, distribution for
// histogram, raw rows for list.
func requestTypeForPanel(panelKind PanelPluginKind) qb.RequestType {
	switch panelKind {
	case PanelKindTimeSeries, PanelKindBarChart:
		return qb.RequestTypeTimeSeries
	case PanelKindNumber, PanelKindPieChart, PanelKindTable:
		return qb.RequestTypeScalar
	case PanelKindHistogram:
		return qb.RequestTypeDistribution
	case PanelKindList:
		return qb.RequestTypeRaw
	}
	return qb.RequestTypeTimeSeries
}

// collectV1QueryEnvelopes inspects widget.query.queryType and produces a
// flattened list of v5-shaped envelopes. The returned signal is the dominant
// builder signal (if any), used for typed builder-query dispatch.
func collectV1QueryEnvelopes(widget map[string]any) ([]map[string]any, telemetrytypes.Signal) {
	queryMap, ok := widget["query"].(map[string]any)
	if !ok {
		return nil, telemetrytypes.Signal{}
	}
	queryType, _ := queryMap["queryType"].(string)

	switch queryType {
	case "promql":
		var out []map[string]any
		for _, q := range readSliceOfMaps(queryMap["promql"]) {
			out = append(out, promQLEnvelope(q))
		}
		return out, telemetrytypes.Signal{}

	case "clickhouse_sql":
		var out []map[string]any
		for _, q := range readSliceOfMaps(queryMap["clickhouse_sql"]) {
			out = append(out, clickhouseEnvelope(q))
		}
		return out, telemetrytypes.Signal{}

	case "builder":
		builder, _ := queryMap["builder"].(map[string]any)
		if builder == nil {
			return nil, telemetrytypes.Signal{}
		}
		var out []map[string]any
		var signal telemetrytypes.Signal
		for _, q := range readSliceOfMaps(builder["queryData"]) {
			name := valueAt[string](q, "queryName")
			out = append(out, qb.WrapInV5Envelope(name, q, string(qb.QueryTypeBuilder.StringValue())))
			if signal.IsZero() {
				signal = signalFromDataSource(q["dataSource"])
			}
		}
		for _, f := range readSliceOfMaps(builder["queryFormulas"]) {
			name := valueAt[string](f, "queryName")
			out = append(out, qb.WrapInV5Envelope(name, f, string(qb.QueryTypeFormula.StringValue())))
		}
		for _, op := range readSliceOfMaps(builder["queryTraceOperator"]) {
			name := valueAt[string](op, "queryName")
			out = append(out, qb.WrapInV5Envelope(name, op, string(qb.QueryTypeTraceOperator.StringValue())))
		}
		return out, signal
	}
	return nil, telemetrytypes.Signal{}
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

// singleQueryFromEnvelope returns a typed Query for an envelope whose type is
// promql/clickhouse_sql. Builder envelopes always fall through to Composite so
// composite-only panel kinds (TimeSeries/BarChart/etc.) get uniform queries.
func singleQueryFromEnvelope(envelope map[string]any, requestType qb.RequestType) *Query {
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

func signalFromDataSource(raw any) telemetrytypes.Signal {
	s, _ := raw.(string)
	switch s {
	case "traces":
		return telemetrytypes.SignalTraces
	case "logs":
		return telemetrytypes.SignalLogs
	case "metrics":
		return telemetrytypes.SignalMetrics
	}
	return telemetrytypes.Signal{}
}
