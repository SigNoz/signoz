package implservices

import (
	"context"
	"fmt"
	"time"

	"strconv"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/services"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/servicetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	Querier        querier.Querier
	TelemetryStore telemetrystore.TelemetryStore
}

// NewModule constructs the services module with the provided querier dependency.
func NewModule(q querier.Querier, ts telemetrystore.TelemetryStore) services.Module {
	return &module{
		Querier:        q,
		TelemetryStore: ts,
	}
}

// Get implements services.Module
// Builds a QBv5 traces aggregation grouped by service.name and maps results to ResponseItem.
func (m *module) Get(ctx context.Context, orgID string, req *servicetypes.Request) ([]*servicetypes.ResponseItem, error) {
	if req == nil {
		return nil, nil
	}

	// Parse start/end (nanoseconds) from strings and convert to milliseconds for QBv5
	startNs, err := strconv.ParseUint(req.Start, 10, 64)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start timestamp: %v", err)
	}
	endNs, err := strconv.ParseUint(req.End, 10, 64)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid end timestamp: %v", err)
	}
	if startNs == 0 || endNs == 0 || startNs >= endNs {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid time range: start=%s end=%s", req.Start, req.End)
	}
	startMs := startNs / 1_000_000
	endMs := endNs / 1_000_000

	filterExpr := buildFilterExpression(req.Tags)
	// ensure we only consider root or entry-point spans
	scopeExpr := "isRoot = 'true' OR isEntryPoint = 'true'"
	if filterExpr != "" {
		filterExpr = "(" + filterExpr + ") AND (" + scopeExpr + ")"
	} else {
		filterExpr = scopeExpr
	}

	q := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:   "A",
		Signal: telemetrytypes.SignalTraces,
		GroupBy: []qbtypes.GroupByKey{
			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name: "service.name", // TODO(nikhilmantri0902): confirm whether to use serviceName, resource_string_service$name, or service.name
				//FieldDataType: telemetrytypes.FieldDataTypeString,
				// FieldContext: telemetrytypes.FieldContextResource,
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

	q.Filter = &qbtypes.Filter{
		Expression: filterExpr,
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

	// this stores the index at which service name is found in the response
	serviceNameRespIndex := -1
	aggIndexMappings := map[int]int{}
	for i, c := range sd.Columns {
		switch c.Type {
		case qbtypes.ColumnTypeGroup:
			if c.TelemetryFieldKey.Name == "service.name" {
				serviceNameRespIndex = i
			}
		case qbtypes.ColumnTypeAggregation:
			aggIndexMappings[int(c.AggregationIndex)] = i
		}
	}
	if serviceNameRespIndex == -1 {
		return []*servicetypes.ResponseItem{}, nil
	}

	periodSeconds := float64((endMs - startMs) / 1000)
	if periodSeconds <= 0 {
		periodSeconds = 1
	}

	out := make([]*servicetypes.ResponseItem, 0, len(sd.Data))
	serviceNames := make([]string, 0, len(sd.Data))
	for _, row := range sd.Data {
		if serviceNameRespIndex >= len(row) {
			continue
		}
		svcName := fmt.Sprintf("%v", row[serviceNameRespIndex])
		serviceNames = append(serviceNames, svcName)

		p99 := toFloat(row, aggIndexMappings[0])
		avgDuration := toFloat(row, aggIndexMappings[1])
		numCalls := toUint64(row, aggIndexMappings[2])
		numErrors := toUint64(row, aggIndexMappings[3])
		num4xx := toUint64(row, aggIndexMappings[4])

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

	// Fetch top level operations using TelemetryStore and attach
	if len(serviceNames) > 0 {

		startTime := time.Unix(0, int64(startNs)).UTC()
		opsMap, err := m.FetchTopLevelOperations(ctx, startTime, serviceNames)
		if err != nil {
			return nil, err
		}

		if opsMap == nil {
			return out, fmt.Errorf("no top level operations found")
		}

		for i := range out {
			if tops, ok := opsMap[out[i].ServiceName]; ok {
				out[i].DataWarning.TopLevelOps = tops
			}
		}
	}

	return out, nil
}

// FetchTopLevelOperations returns top-level operations per service using the legacy table
func (m *module) FetchTopLevelOperations(ctx context.Context, start time.Time, services []string) (map[string][]string, error) {
	db := m.TelemetryStore.ClickhouseDB()
	// Using distributed_top_level_operations under signoz_traces
	// NOTE: we rely on the legacy semantics: SELECT name, serviceName, max(time)
	query := "SELECT name, serviceName, max(time) as ts FROM signoz_traces.distributed_top_level_operations WHERE time >= @start"
	args := []any{clickhouse.Named("start", start)}
	if len(services) > 0 {
		query += " AND serviceName IN @services"
		args = append(args, clickhouse.Named("services", services))
	}
	query += " GROUP BY name, serviceName ORDER BY ts DESC LIMIT 5000"

	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ops := make(map[string][]string)
	for rows.Next() {
		var name, serviceName string
		var ts time.Time
		if err := rows.Scan(&name, &serviceName, &ts); err != nil {
			return nil, err
		}
		if _, ok := ops[serviceName]; !ok {
			ops[serviceName] = []string{"overflow_operation"}
		}
		ops[serviceName] = append(ops[serviceName], name)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return ops, nil
}
