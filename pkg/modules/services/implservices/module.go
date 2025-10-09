package implservices

import (
	"context"
	"fmt"
	"time"

	"strconv"

	"github.com/ClickHouse/clickhouse-go/v2"
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

	// Prepare phase
	queryRangeReq, startMs, endMs, err := m.buildQueryRangeRequest(req)
	if err != nil {
		return nil, err
	}

	// Fetch phase
	resp, err := m.executeQuery(ctx, orgID, &queryRangeReq)
	if err != nil {
		return nil, err
	}

	// Process phase
	items, serviceNames := m.mapScalarDataToServiceItems(resp, startMs, endMs)
	if len(items) == 0 {
		return []*servicetypes.ResponseItem{}, nil
	}

	// attach top level ops to service items
	if len(serviceNames) > 0 {
		if err := m.attachTopLevelOps(ctx, serviceNames, startMs, items); err != nil {
			return nil, err
		}
	}

	return items, nil
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

// buildQueryRangeRequest constructs the QBv5 QueryRangeRequest and computes the time window.
func (m *module) buildQueryRangeRequest(req *servicetypes.Request) (qbtypes.QueryRangeRequest, uint64, uint64, error) {
	// Parse start/end (nanoseconds) from strings and convert to milliseconds for QBv5
	startNs, err := strconv.ParseUint(req.Start, 10, 64)
	if err != nil {
		return qbtypes.QueryRangeRequest{}, 0, 0, fmt.Errorf("invalid start time: %w", err)
	}
	endNs, err := strconv.ParseUint(req.End, 10, 64)
	if err != nil {
		return qbtypes.QueryRangeRequest{}, 0, 0, fmt.Errorf("invalid end time: %w", err)
	}
	startMs := startNs / 1_000_000
	endMs := endNs / 1_000_000

	if startMs >= endMs {
		return qbtypes.QueryRangeRequest{}, 0, 0, fmt.Errorf("start must be before end")
	}

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
				Name: "service.name",
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

	q.Filter = &qbtypes.Filter{Expression: filterExpr}

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

	return reqV5, startMs, endMs, nil
}

// executeQuery calls the underlying Querier with the provided request.
func (m *module) executeQuery(ctx context.Context, orgID string, qr *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {
	orgUUID, err := valuer.NewUUID(orgID)
	if err != nil {
		return nil, err
	}
	return m.Querier.QueryRange(ctx, orgUUID, qr)
}

// mapScalarDataToServiceItems converts the raw query response into service items and collected service names.
func (m *module) mapScalarDataToServiceItems(resp *qbtypes.QueryRangeResponse, startMs, endMs uint64) ([]*servicetypes.ResponseItem, []string) {
	if resp == nil || len(resp.Data.Results) == 0 {
		return []*servicetypes.ResponseItem{}, []string{}
	}

	sd, ok := resp.Data.Results[0].(*qbtypes.ScalarData)
	if !ok || sd == nil {
		return []*servicetypes.ResponseItem{}, []string{}
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
		return []*servicetypes.ResponseItem{}, []string{}
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

	return out, serviceNames
}

// attachTopLevelOps fetches top-level ops from TelemetryStore and attaches them to items.
func (m *module) attachTopLevelOps(ctx context.Context, serviceNames []string, startMs uint64, items []*servicetypes.ResponseItem) error {
	startTime := time.UnixMilli(int64(startMs)).UTC()
	opsMap, err := m.FetchTopLevelOperations(ctx, startTime, serviceNames)
	if err != nil {
		return err
	}
	if opsMap == nil {
		return fmt.Errorf("no top level operations found")
	}
	for i := range items {
		if tops, ok := opsMap[items[i].ServiceName]; ok {
			items[i].DataWarning.TopLevelOps = tops
		}
	}
	return nil
}
