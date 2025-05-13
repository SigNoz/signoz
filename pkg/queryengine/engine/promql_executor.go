package engine

import (
	"context"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/prometheus/prometheus/promql"
)

type promqlQuery struct {
	promEngine *promql.Engine
	query      qbv5.PromQuery
	tr         qbv5.TimeRange
}

func newPromqlQuery(promEngine *promql.Engine, query qbv5.PromQuery, tr qbv5.TimeRange) *promqlQuery {
	return &promqlQuery{promEngine, query, tr}
}

func (q *promqlQuery) Fingerprint() string {
	return ""
}

func (q *promqlQuery) Window() (uint64, uint64) {
	return q.tr.From, q.tr.To
}

func (q *promqlQuery) Execute(ctx context.Context) (qbv5.Result, error) {
	return qbv5.Result{}, nil
}
