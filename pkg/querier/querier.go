package querier

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type querier struct {
	telemetryStore    telemetrystore.TelemetryStore
	metadataStore     telemetrytypes.MetadataStore
	promEngine        prometheus.Prometheus
	traceStmtBuilder  qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	logStmtBuilder    qbtypes.StatementBuilder[qbtypes.LogAggregation]
	metricStmtBuilder qbtypes.StatementBuilder[qbtypes.MetricAggregation]
}

func NewQuerier(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	promEngine prometheus.Prometheus,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	logStmtBuilder qbtypes.StatementBuilder[qbtypes.LogAggregation],
	metricStmtBuilder qbtypes.StatementBuilder[qbtypes.MetricAggregation],
) *querier {
	return &querier{
		telemetryStore:    telemetryStore,
		metadataStore:     metadataStore,
		promEngine:        promEngine,
		traceStmtBuilder:  traceStmtBuilder,
		logStmtBuilder:    logStmtBuilder,
		metricStmtBuilder: metricStmtBuilder,
	}
}

func (q *querier) QueryRange(ctx context.Context, orgID string, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {

	queries := make(map[string]qbtypes.Query)

	for _, query := range req.CompositeQuery.Queries {
		switch query.Type {
		case qbtypes.QueryTypePromQL:
			promQuery, ok := query.Spec.(qbtypes.PromQuery)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query spec %T", query.Spec)
			}
			promqlQuery := newPromqlQuery(q.promEngine, promQuery, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
			queries[query.Name] = promqlQuery
		case qbtypes.QueryTypeClickHouseSQL:
			chQuery, ok := query.Spec.(qbtypes.ClickHouseQuery)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid clickhouse query spec %T", query.Spec)
			}
			chSQLQuery := newchSQLQuery(q.telemetryStore, chQuery, nil, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
			queries[query.Name] = chSQLQuery
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				bq := newBuilderQuery(q.telemetryStore, q.traceStmtBuilder, spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				queries[query.Name] = bq

			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				bq := newBuilderQuery(q.telemetryStore, q.logStmtBuilder, spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				queries[query.Name] = bq

			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				bq := newBuilderQuery(q.telemetryStore, q.metricStmtBuilder, spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				queries[query.Name] = bq
			default:
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported builder spec type %T", query.Spec)
			}
		}
	}
	return q.run(ctx, orgID, queries, req.RequestType)
}

func (q *querier) run(ctx context.Context, _ string, qs map[string]qbtypes.Query, kind qbtypes.RequestType) (*qbtypes.QueryRangeResponse, error) {
	results := make([]*qbtypes.Result, 0, len(qs))
	for _, query := range qs {
		// TODO: run in controlled batches
		result, err := query.Execute(ctx)
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return &qbtypes.QueryRangeResponse{
		Type: kind,
		Data: results,
	}, nil
}
