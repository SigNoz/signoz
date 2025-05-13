package queryengine

import (
	"context"

	"github.com/SigNoz/signoz/pkg/queryengine/engine"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/prometheus/prometheus/promql"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type querier struct {
	telemetryStore telemetrystore.TelemetryStore
	metadataStore  telemetrytypes.MetadataStore
	promEngine     *promql.Engine
	traceStmt      qbv5.StatementBuilder
	logStmt        qbv5.StatementBuilder
	metricStmt     qbv5.StatementBuilder
	preparer       *engine.Preparer
}

func NewQuerier(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	promEngine *promql.Engine,
	traceStmt qbv5.StatementBuilder,
	logStmt qbv5.StatementBuilder,
	metricStmt qbv5.StatementBuilder,
) *querier {
	return &querier{
		telemetryStore: telemetryStore,
		metadataStore:  metadataStore,
		promEngine:     promEngine,
		traceStmt:      traceStmt,
		logStmt:        logStmt,
		metricStmt:     metricStmt,
		preparer:       engine.NewPreparer(telemetryStore, metadataStore, promEngine, traceStmt, logStmt, metricStmt),
	}
}

func (q *querier) QueryRange(ctx context.Context, orgID string, req *qbv5.QueryRangeRequest) (qbv5.QueryRangeResponse, error) {

	var qs []qbv5.Query

	for _, q_ := range req.CompositeQuery.Queries {
		switch q_.Type {
		case qbv5.QueryTypePromQL:
			q, err := q.preparer.PreparePromQuery(ctx, q_.Spec, qbv5.TimeRange{req.Start, req.End})
			if err != nil {
				return qbv5.QueryRangeResponse{}, err
			}
			qs = append(qs, q)
		case qbv5.QueryTypeClickHouseSQL:
			q, err := q.preparer.PrepareClickhouseQuery(ctx, q_.Spec, qbv5.TimeRange{req.Start, req.End}, req.RequestType)
			if err != nil {
				return qbv5.QueryRangeResponse{}, err
			}
			qs = append(qs, q)
		case qbv5.QueryTypeBuilder:
			q, err := q.preparer.PrepareBuilderQuery(ctx, q_.Spec, qbv5.TimeRange{req.Start, req.End}, req.RequestType)
			if err != nil {
				return qbv5.QueryRangeResponse{}, err
			}
			qs = append(qs, q)
		}
	}

	return qbv5.QueryRangeResponse{}, nil
}

func (q *querier) run(ctx context.Context, orgID string, qs []qbv5.Query) ([]qbv5.Result, error) {
	for _, query := range qs {
		query.Execute(ctx)
	}
	return nil, nil
}
