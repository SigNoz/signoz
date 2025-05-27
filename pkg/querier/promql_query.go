package querier

import (
	"context"

	"github.com/SigNoz/signoz/pkg/prometheus"
	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type promqlQuery struct {
	promEngine  prometheus.Prometheus
	query       qbv5.PromQuery
	tr          qbv5.TimeRange
	requestType qbv5.RequestType
}

var _ qbv5.Query = (*promqlQuery)(nil)

func newPromqlQuery(
	promEngine prometheus.Prometheus,
	query qbv5.PromQuery,
	tr qbv5.TimeRange,
	requestType qbv5.RequestType,
) *promqlQuery {
	return &promqlQuery{promEngine, query, tr, requestType}
}

func (q *promqlQuery) Fingerprint() string {
	// TODO: Implement this
	return ""
}

func (q *promqlQuery) Window() (uint64, uint64) {
	return q.tr.From, q.tr.To
}

func (q *promqlQuery) Execute(ctx context.Context) (*qbv5.Result, error) {
	// TODO: Implement this
	//nolint:nilnil
	return nil, nil
}
