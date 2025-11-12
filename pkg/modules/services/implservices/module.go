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
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
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

// FetchTopLevelOperations returns top-level operations per service using db query
func (m *module) FetchTopLevelOperations(ctx context.Context, start time.Time, services []string) (map[string][]string, error) {
	db := m.TelemetryStore.ClickhouseDB()
	query := fmt.Sprintf("SELECT name, serviceName, max(time) as ts FROM %s.%s WHERE time >= @start", telemetrytraces.DBName, telemetrytraces.TopLevelOperationsTableName)
	args := []any{clickhouse.Named("start", start)}
	if len(services) > 0 {
		query += " AND serviceName IN @services"
		args = append(args, clickhouse.Named("services", services))
	}
	query += " GROUP BY name, serviceName ORDER BY ts DESC LIMIT 5000"

	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch top level operations")
	}
	defer rows.Close()

	ops := make(map[string][]string)
	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch top level operations")
	}
	for rows.Next() {
		var name, serviceName string
		var ts time.Time
		if err := rows.Scan(&name, &serviceName, &ts); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan top level operation")
		}
		if _, ok := ops[serviceName]; !ok {
			ops[serviceName] = []string{"overflow_operation"}
		}
		ops[serviceName] = append(ops[serviceName], name)
	}
	return ops, nil
}

// Get implements services.Module
// Builds a QBv5 traces aggregation grouped by service.name and maps results to ResponseItem.
func (m *module) Get(ctx context.Context, orgUUID valuer.UUID, req *servicetypesv1.Request) ([]*servicetypesv1.ResponseItem, error) {
	if req == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	// Prepare phase
	queryRangeReq, startMs, endMs, err := m.buildQueryRangeRequest(req)
	if err != nil {
		return nil, err
	}

	// Fetch phase
	resp, err := m.executeQuery(ctx, orgUUID, queryRangeReq)
	if err != nil {
		return nil, err
	}

	// Process phase
	items, serviceNames := m.mapQueryRangeRespToServices(resp, startMs, endMs)
	if len(items) == 0 {
		return []*servicetypesv1.ResponseItem{}, nil
	}

	// attach top level ops to service items
	if len(serviceNames) > 0 {
		if err := m.attachTopLevelOps(ctx, serviceNames, startMs, items); err != nil {
			return nil, err
		}
	}

	return items, nil
}

// GetTopOperations implements services.Module for QBV5 based top ops
func (m *module) GetTopOperations(ctx context.Context, orgUUID valuer.UUID, req *servicetypesv1.OperationsRequest) ([]servicetypesv1.OperationItem, error) {
	if req == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	qr, err := m.buildTopOpsQueryRangeRequest(req)
	if err != nil {
		return nil, err
	}

	resp, err := m.executeQuery(ctx, orgUUID, qr)
	if err != nil {
		return nil, err
	}

	items := m.mapTopOpsQueryRangeResp(resp)
	return items, nil
}

// GetEntryPointOperations implements services.Module for QBV5 based entry point ops
func (m *module) GetEntryPointOperations(ctx context.Context, orgUUID valuer.UUID, req *servicetypesv1.OperationsRequest) ([]servicetypesv1.OperationItem, error) {
	if req == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	qr, err := m.buildEntryPointOpsQueryRangeRequest(req)
	if err != nil {
		return nil, err
	}

	resp, err := m.executeQuery(ctx, orgUUID, qr)
	if err != nil {
		return nil, err
	}

	items := m.mapEntryPointOpsQueryRangeResp(resp)
	return items, nil
}

// buildQueryRangeRequest constructs the QBv5 QueryRangeRequest and computes the time window.
func (m *module) buildQueryRangeRequest(req *servicetypesv1.Request) (*qbtypes.QueryRangeRequest, uint64, uint64, error) {
	// Parse start/end (nanoseconds) from strings and convert to milliseconds for QBv5
	startNs, err := strconv.ParseUint(req.Start, 10, 64)
	if err != nil {
		return nil, 0, 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start time: %v", err)
	}
	endNs, err := strconv.ParseUint(req.End, 10, 64)
	if err != nil {
		return nil, 0, 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid end time: %v", err)
	}
	if startNs >= endNs {
		return nil, 0, 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "start must be before end")
	}
	if err := validateTagFilterItems(req.Tags); err != nil {
		return nil, 0, 0, err
	}

	startMs := startNs / 1_000_000
	endMs := endNs / 1_000_000

	// tags filter
	filterExpr, variables := buildFilterExpression(req.Tags)
	// ensure we only consider root or entry-point spans
	scopeExpr := "isRoot = true OR isEntryPoint = true"
	if filterExpr != "" {
		filterExpr = "(" + filterExpr + ") AND (" + scopeExpr + ")"
	} else {
		filterExpr = scopeExpr
	}

	reqV5 := qbtypes.QueryRangeRequest{
		Start:       startMs,
		End:         endMs,
		RequestType: qbtypes.RequestTypeScalar,
		Variables:   variables,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
						Filter: &qbtypes.Filter{
							Expression: filterExpr,
						},
						GroupBy: []qbtypes.GroupByKey{
							{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "service.name",
								FieldContext:  telemetrytypes.FieldContextResource,
								FieldDataType: telemetrytypes.FieldDataTypeString,
								Materialized:  true,
							}},
						},
						Aggregations: []qbtypes.TraceAggregation{
							{Expression: "p99(duration_nano)", Alias: "p99"},
							{Expression: "avg(duration_nano)", Alias: "avgDuration"},
							{Expression: "count()", Alias: "numCalls"},
							{Expression: "countIf(status_code = 2)", Alias: "numErrors"},
							{Expression: "countIf(response_status_code >= 400 AND response_status_code < 500)", Alias: "num4XX"},
						},
					},
				},
			},
		},
	}

	return &reqV5, startMs, endMs, nil
}

// executeQuery calls the underlying Querier with the provided request.
func (m *module) executeQuery(ctx context.Context, orgUUID valuer.UUID, qr *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {
	return m.Querier.QueryRange(ctx, orgUUID, qr)
}

// mapQueryRangeRespToServices converts the raw query response into service items and collected service names.
func (m *module) mapQueryRangeRespToServices(resp *qbtypes.QueryRangeResponse, startMs, endMs uint64) ([]*servicetypesv1.ResponseItem, []string) {
	if resp == nil || len(resp.Data.Results) == 0 { // no rows
		return []*servicetypesv1.ResponseItem{}, []string{}
	}

	sd, ok := resp.Data.Results[0].(*qbtypes.ScalarData) // empty rows
	if !ok || sd == nil {
		return []*servicetypesv1.ResponseItem{}, []string{}
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

	periodSeconds := float64((endMs - startMs) / 1000)

	out := make([]*servicetypesv1.ResponseItem, 0, len(sd.Data))
	serviceNames := make([]string, 0, len(sd.Data))
	for _, row := range sd.Data {
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
			errorRate = float64(numErrors) * 100 / float64(numCalls) // percentage
		}
		fourXXRate := 0.0
		if numCalls > 0 {
			fourXXRate = float64(num4xx) * 100 / float64(numCalls) // percentage
		}

		out = append(out, &servicetypesv1.ResponseItem{
			ServiceName:  svcName,
			Percentile99: p99,
			AvgDuration:  avgDuration,
			NumCalls:     numCalls,
			CallRate:     callRate,
			NumErrors:    numErrors,
			ErrorRate:    errorRate,
			Num4XX:       num4xx,
			FourXXRate:   fourXXRate,
			DataWarning:  servicetypesv1.DataWarning{TopLevelOps: []string{}},
		})
	}

	return out, serviceNames
}

// attachTopLevelOps fetches top-level ops from TelemetryStore and attaches them to items.
func (m *module) attachTopLevelOps(ctx context.Context, serviceNames []string, startMs uint64, items []*servicetypesv1.ResponseItem) error {
	startTime := time.UnixMilli(int64(startMs)).UTC()
	opsMap, err := m.FetchTopLevelOperations(ctx, startTime, serviceNames)
	if err != nil {
		return err
	}
	applyOpsToItems(items, opsMap)
	return nil
}

func (m *module) buildTopOpsQueryRangeRequest(req *servicetypesv1.OperationsRequest) (*qbtypes.QueryRangeRequest, error) {
	if req.Service == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "service is required")
	}
	startNs, err := strconv.ParseUint(req.Start, 10, 64)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start time: %v", err)
	}
	endNs, err := strconv.ParseUint(req.End, 10, 64)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid end time: %v", err)
	}
	if startNs >= endNs {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "start must be before end")
	}
	if req.Limit < 1 || req.Limit > 5000 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be between 1 and 5000")
	}
	if err := validateTagFilterItems(req.Tags); err != nil {
		return nil, err
	}

	startMs := startNs / 1_000_000
	endMs := endNs / 1_000_000

	serviceTag := servicetypesv1.TagFilterItem{
		Key:          "service.name",
		Operator:     "in",
		StringValues: []string{req.Service},
	}
	tags := append([]servicetypesv1.TagFilterItem{serviceTag}, req.Tags...)
	filterExpr, variables := buildFilterExpression(tags)

	reqV5 := qbtypes.QueryRangeRequest{
		Start:       startMs,
		End:         endMs,
		RequestType: qbtypes.RequestTypeScalar,
		Variables:   variables,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
						Filter: &qbtypes.Filter{Expression: filterExpr},
						GroupBy: []qbtypes.GroupByKey{
							{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "name",
								FieldContext:  telemetrytypes.FieldContextSpan,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							}},
						},
						Aggregations: []qbtypes.TraceAggregation{
							{Expression: "p50(duration_nano)", Alias: "p50"},
							{Expression: "p95(duration_nano)", Alias: "p95"},
							{Expression: "p99(duration_nano)", Alias: "p99"},
							{Expression: "count()", Alias: "numCalls"},
							{Expression: "countIf(status_code = 2)", Alias: "errorCount"},
						},
						Order: []qbtypes.OrderBy{
							{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "p99"}}, Direction: qbtypes.OrderDirectionDesc},
						},
						Limit: req.Limit,
					},
				},
			},
		},
	}
	return &reqV5, nil
}

func (m *module) mapTopOpsQueryRangeResp(resp *qbtypes.QueryRangeResponse) []servicetypesv1.OperationItem {
	if resp == nil || len(resp.Data.Results) == 0 {
		return []servicetypesv1.OperationItem{}
	}
	sd, ok := resp.Data.Results[0].(*qbtypes.ScalarData)
	if !ok || sd == nil {
		return []servicetypesv1.OperationItem{}
	}

	nameIdx := -1
	aggIdx := map[int]int{}
	for i, c := range sd.Columns {
		switch c.Type {
		case qbtypes.ColumnTypeGroup:
			if c.TelemetryFieldKey.Name == "name" {
				nameIdx = i
			}
		case qbtypes.ColumnTypeAggregation:
			aggIdx[int(c.AggregationIndex)] = i
		}
	}

	out := make([]servicetypesv1.OperationItem, 0, len(sd.Data))
	for _, row := range sd.Data {
		item := servicetypesv1.OperationItem{
			Name:       fmt.Sprintf("%v", row[nameIdx]),
			P50:        toFloat(row, aggIdx[0]),
			P95:        toFloat(row, aggIdx[1]),
			P99:        toFloat(row, aggIdx[2]),
			NumCalls:   toUint64(row, aggIdx[3]),
			ErrorCount: toUint64(row, aggIdx[4]),
		}
		out = append(out, item)
	}
	return out
}

func (m *module) buildEntryPointOpsQueryRangeRequest(req *servicetypesv1.OperationsRequest) (*qbtypes.QueryRangeRequest, error) {
	if req.Service == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "service is required")
	}
	startNs, err := strconv.ParseUint(req.Start, 10, 64)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start time: %v", err)
	}
	endNs, err := strconv.ParseUint(req.End, 10, 64)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid end time: %v", err)
	}
	if startNs >= endNs {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "start must be before end")
	}
	if req.Limit < 1 || req.Limit > 5000 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be between 1 and 5000")
	}
	if err := validateTagFilterItems(req.Tags); err != nil {
		return nil, err
	}

	startMs := startNs / 1_000_000
	endMs := endNs / 1_000_000

	serviceTag := servicetypesv1.TagFilterItem{
		Key:          "service.name",
		Operator:     "in",
		StringValues: []string{req.Service},
	}
	tags := append([]servicetypesv1.TagFilterItem{serviceTag}, req.Tags...)
	filterExpr, variables := buildFilterExpression(tags)
	scopeExpr := "isRoot = true OR isEntryPoint = true"
	if filterExpr != "" {
		filterExpr = "(" + filterExpr + ") AND (" + scopeExpr + ")"
	} else {
		filterExpr = scopeExpr
	}

	reqV5 := qbtypes.QueryRangeRequest{
		Start:       startMs,
		End:         endMs,
		RequestType: qbtypes.RequestTypeScalar,
		Variables:   variables,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
						Filter: &qbtypes.Filter{Expression: filterExpr},
						GroupBy: []qbtypes.GroupByKey{
							{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "name",
								FieldContext:  telemetrytypes.FieldContextSpan,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							}},
						},
						Aggregations: []qbtypes.TraceAggregation{
							{Expression: "p50(duration_nano)", Alias: "p50"},
							{Expression: "p95(duration_nano)", Alias: "p95"},
							{Expression: "p99(duration_nano)", Alias: "p99"},
							{Expression: "count()", Alias: "numCalls"},
							{Expression: "countIf(status_code = 2)", Alias: "errorCount"},
						},
						Order: []qbtypes.OrderBy{
							{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "p99"}}, Direction: qbtypes.OrderDirectionDesc},
						},
						Limit: req.Limit,
					},
				},
			},
		},
	}
	return &reqV5, nil
}

func (m *module) mapEntryPointOpsQueryRangeResp(resp *qbtypes.QueryRangeResponse) []servicetypesv1.OperationItem {
	if resp == nil || len(resp.Data.Results) == 0 {
		return []servicetypesv1.OperationItem{}
	}
	sd, ok := resp.Data.Results[0].(*qbtypes.ScalarData)
	if !ok || sd == nil {
		return []servicetypesv1.OperationItem{}
	}

	nameIdx := -1
	aggIdx := map[int]int{}
	for i, c := range sd.Columns {
		switch c.Type {
		case qbtypes.ColumnTypeGroup:
			if c.TelemetryFieldKey.Name == "name" {
				nameIdx = i
			}
		case qbtypes.ColumnTypeAggregation:
			aggIdx[int(c.AggregationIndex)] = i
		}
	}

	out := make([]servicetypesv1.OperationItem, 0, len(sd.Data))
	for _, row := range sd.Data {
		item := servicetypesv1.OperationItem{
			Name:       fmt.Sprintf("%v", row[nameIdx]),
			P50:        toFloat(row, aggIdx[0]),
			P95:        toFloat(row, aggIdx[1]),
			P99:        toFloat(row, aggIdx[2]),
			NumCalls:   toUint64(row, aggIdx[3]),
			ErrorCount: toUint64(row, aggIdx[4]),
		}
		out = append(out, item)
	}
	return out
}
