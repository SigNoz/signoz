package engine

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/prometheus/prometheus/promql"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// Preparer converts ANY Builder query (trace, log, metric, etc.) into SQLQuery.
type Preparer struct {
	telemetryStore telemetrystore.TelemetryStore
	metadataStore  telemetrytypes.MetadataStore
	promEngine     *promql.Engine
	TraceStmt      qbv5.StatementBuilder
	LogStmt        qbv5.StatementBuilder
	MetricStmt     qbv5.StatementBuilder
}

func NewPreparer(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	promEngine *promql.Engine,
	traceStmt qbv5.StatementBuilder,
	logStmt qbv5.StatementBuilder,
	metricStmt qbv5.StatementBuilder,
) *Preparer {
	return &Preparer{
		telemetryStore: telemetryStore,
		metadataStore:  metadataStore,
		promEngine:     promEngine,
		TraceStmt:      traceStmt,
		LogStmt:        logStmt,
		MetricStmt:     metricStmt,
	}
}

func (p *Preparer) PrepareBuilderQuery(ctx context.Context, spec any,
	tr qbv5.TimeRange, requestType qbv5.RequestType) (qbv5.Query, error) {

	var query qbv5.QueryBuilderQuery
	// check type of the spec and convert to qbv5.QueryBuilderQuery
	switch spec := spec.(type) {
	case qbv5.QueryBuilderQuery:
		query = spec
	case []byte:
		if err := json.Unmarshal(spec, &query); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unknown query type %T", spec)
	}

	var stmt qbv5.StatementBuilder
	switch query.Signal { // Traces, Logs, Metrics enums
	case telemetrytypes.SignalTraces:
		stmt = p.TraceStmt
	case telemetrytypes.SignalLogs:
		stmt = p.LogStmt
	case telemetrytypes.SignalMetrics:
		stmt = p.MetricStmt
	default:
		return nil, fmt.Errorf("unknown signal type %v", query.Signal)
	}

	sql, args, err := stmt.Build(ctx, uint64(tr.From), uint64(tr.To), requestType, query)
	if err != nil {
		return nil, err
	}

	fp := fingerprint(ctx, sql, args)

	return newSQLQuery(sql, args, fp, tr.From, tr.To, requestType, p.telemetryStore), nil
}

func (p *Preparer) PrepareClickhouseQuery(ctx context.Context, spec any,
	tr qbv5.TimeRange, requestType qbv5.RequestType) (qbv5.Query, error) {

	var query qbv5.ClickHouseQuery
	// check type of the spec and convert to qbv5.ClickHouseQuery
	switch spec := spec.(type) {
	case qbv5.ClickHouseQuery:
		query = spec
	case []byte:
		if err := json.Unmarshal(spec, &query); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unknown query type %T", spec)
	}

	return newSQLQuery(query.Query, nil, "", tr.From, tr.To, requestType, p.telemetryStore), nil
}

func (p *Preparer) PreparePromQuery(ctx context.Context, spec any,
	tr qbv5.TimeRange) (qbv5.Query, error) {

	var query qbv5.PromQuery
	// check type of the spec and convert to qbv5.PromQuery
	switch spec := spec.(type) {
	case qbv5.PromQuery:
		query = spec
	case []byte:
		if err := json.Unmarshal(spec, &query); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unknown query type %T", spec)
	}

	return newPromqlQuery(p.promEngine, query, tr), nil
}
