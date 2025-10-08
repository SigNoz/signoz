package implservices

import (
	"context"
	"fmt"
	"strings"

	"strconv"

	"github.com/SigNoz/signoz/pkg/querier"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/servicetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module struct {
	Querier querier.Querier
}

// NewModule constructs the services module with the provided querier dependency.
func NewModule(q querier.Querier) *Module {
	return &Module{
		Querier: q,
	}
}

// Get implements services.Module
// Builds a QBv5 traces aggregation grouped by service.name and maps results to ResponseItem.
func (m *Module) Get(ctx context.Context, orgID string, req *servicetypes.Request) ([]*servicetypes.ResponseItem, error) {
	if req == nil {
		return nil, nil
	}

	// Parse start/end (nanoseconds) from strings and convert to milliseconds for QBv5
	startNs, _ := strconv.ParseUint(req.Start, 10, 64)
	endNs, _ := strconv.ParseUint(req.End, 10, 64)
	startMs := startNs / 1_000_000
	endMs := endNs / 1_000_000

	filterExpr := buildFilterExpression(req.Tags)

	q := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:   "A",
		Signal: telemetrytypes.SignalTraces,
		GroupBy: []qbtypes.GroupByKey{
			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}},
		},
		Aggregations: []qbtypes.TraceAggregation{
			{Expression: "p99(duration_nano)", Alias: "p99"},
			{Expression: "avg(duration_nano)", Alias: "avgDuration"},
			{Expression: "count()", Alias: "numCalls"},
			{Expression: "countIf(status_code = 2)", Alias: "numErrors"},
			{Expression: "countIf(response_status_code >= 400 AND response_status_code < 500)", Alias: "num4XX"},
		},
	}
	if filterExpr != "" {
		q.Filter = &qbtypes.Filter{Expression: filterExpr}
	}

	reqV5 := qbtypes.QueryRangeRequest{
		Start:       startMs,
		End:         endMs,
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{Type: qbtypes.QueryTypeBuilder, Spec: q},
			},
		},
	}

	orgUUID, err := valuer.NewUUID(orgID)
	if err != nil {
		return nil, err
	}

	resp, err := m.Querier.QueryRange(ctx, orgUUID, &reqV5)
	if err != nil {
		return nil, err
	}
	if resp == nil || len(resp.Data.Results) == 0 {
		return []*servicetypes.ResponseItem{}, nil
	}

	sd, ok := resp.Data.Results[0].(*qbtypes.ScalarData)
	if !ok || sd == nil {
		return []*servicetypes.ResponseItem{}, nil
	}

	groupIdx := -1
	aggIdxByPos := map[int]int{}
	for i, c := range sd.Columns {
		switch c.Type {
		case qbtypes.ColumnTypeGroup:
			if c.TelemetryFieldKey.Name == "service.name" {
				groupIdx = i
			}
		case qbtypes.ColumnTypeAggregation:
			aggIdxByPos[int(c.AggregationIndex)] = i
		}
	}
	if groupIdx == -1 {
		return []*servicetypes.ResponseItem{}, nil
	}

	periodSeconds := float64((endMs - startMs) / 1000)
	if periodSeconds <= 0 {
		periodSeconds = 1
	}

	out := make([]*servicetypes.ResponseItem, 0, len(sd.Data))
	for _, row := range sd.Data {
		if groupIdx >= len(row) {
			continue
		}
		svcName := fmt.Sprintf("%v", row[groupIdx])

		p99 := toFloat(row, aggIdxByPos[0])
		avgDuration := toFloat(row, aggIdxByPos[1])
		numCalls := toUint64(row, aggIdxByPos[2])
		numErrors := toUint64(row, aggIdxByPos[3])
		num4xx := toUint64(row, aggIdxByPos[4])

		callRate := 0.0
		if numCalls > 0 {
			callRate = float64(numCalls) / periodSeconds
		}
		errorRate := 0.0
		if numCalls > 0 {
			errorRate = float64(numErrors) * 100 / float64(numCalls)
		}
		fourXXRate := 0.0
		if numCalls > 0 {
			fourXXRate = float64(num4xx) * 100 / float64(numCalls)
		}

		out = append(out, &servicetypes.ResponseItem{
			ServiceName:  svcName,
			Percentile99: p99,
			AvgDuration:  avgDuration,
			NumCalls:     numCalls,
			CallRate:     callRate,
			NumErrors:    numErrors,
			ErrorRate:    errorRate,
			Num4XX:       num4xx,
			FourXXRate:   fourXXRate,
			DataWarning:  servicetypes.DataWarning{TopLevelOps: []string{}},
		})
	}
	return out, nil
}

// buildFilterExpression converts tag filters into a QBv5-compatible boolean expression.
func buildFilterExpression(tags []servicetypes.TagFilterItem) string {
	if len(tags) == 0 {
		return ""
	}
	parts := make([]string, 0, len(tags))
	for _, t := range tags {
		key := t.Key
		switch strings.ToLower(t.Operator) {
		case "in":
			if len(t.StringValues) == 0 {
				continue
			}
			ors := make([]string, 0, len(t.StringValues))
			for _, v := range t.StringValues {
				ors = append(ors, fmt.Sprintf("%s = '%s'", key, escapeSingleQuotes(v)))
			}
			parts = append(parts, "("+strings.Join(ors, " OR ")+")")
		case "equal", "=":
			if len(t.StringValues) == 0 {
				continue
			}
			parts = append(parts, fmt.Sprintf("%s = '%s'", key, escapeSingleQuotes(t.StringValues[0])))
		default:
			// skip unsupported for now
		}
	}
	return strings.Join(parts, " AND ")
}

// escapeSingleQuotes escapes single quotes in string literals for filter expressions.
func escapeSingleQuotes(s string) string {
	return strings.ReplaceAll(s, "'", "\\'")
}

// toFloat safely converts a cell value to float64, returning 0 on type mismatch.
func toFloat(row []any, idx int) float64 {
	if idx < 0 || idx >= len(row) || row[idx] == nil {
		return 0
	}
	switch v := row[idx].(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int64:
		return float64(v)
	case int:
		return float64(v)
	case uint64:
		return float64(v)
	default:
		return 0
	}
}

// toUint64 safely converts a cell value to uint64, guarding against negatives and nils.
func toUint64(row []any, idx int) uint64 {
	if idx < 0 || idx >= len(row) || row[idx] == nil {
		return 0
	}
	switch v := row[idx].(type) {
	case uint64:
		return v
	case int64:
		if v < 0 {
			return 0
		}
		return uint64(v)
	case int:
		if v < 0 {
			return 0
		}
		return uint64(v)
	case float64:
		if v < 0 {
			return 0
		}
		return uint64(v)
	default:
		return 0
	}
}
