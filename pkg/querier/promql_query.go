package querier

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/prometheus/prometheus/promql"
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

	start := int64(querybuilder.ToNanoSecs(q.tr.From))
	end := int64(querybuilder.ToNanoSecs(q.tr.To))

	qry, err := q.promEngine.Engine().NewRangeQuery(
		ctx,
		q.promEngine.Storage(),
		nil,
		q.query.Query,
		time.Unix(0, start),
		time.Unix(0, end),
		q.query.Step.Duration,
	)

	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query %q", q.query.Query)
	}

	res := qry.Exec(ctx)
	if res.Err != nil {
		var eqc promql.ErrQueryCanceled
		var eqt promql.ErrQueryTimeout
		var es promql.ErrStorage
		switch {
		case errors.As(res.Err, &eqc):
			return nil, errors.Newf(errors.TypeCanceled, errors.CodeCanceled, "query canceled")
		case errors.As(res.Err, &eqt):
			return nil, errors.Newf(errors.TypeTimeout, errors.CodeTimeout, "query timeout")
		case errors.As(res.Err, &es):
			return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "query execution error: %v", res.Err)
		}

		if errors.Is(res.Err, context.Canceled) {
			return nil, errors.Newf(errors.TypeCanceled, errors.CodeCanceled, "query canceled")
		}

		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "query execution error: %v", res.Err)
	}

	defer qry.Close()

	matrix, promErr := res.Matrix()
	if promErr != nil {
		return nil, errors.WrapInternalf(promErr, errors.CodeInternal, "error getting matrix from promql query %q", q.query.Query)
	}

	var series []*qbv5.TimeSeries
	for _, v := range matrix {
		var s qbv5.TimeSeries
		lbls := make([]*qbv5.Label, 0, len(v.Metric))
		for name, value := range v.Metric.Copy().Map() {
			lbls = append(lbls, &qbv5.Label{
				Key:   telemetrytypes.TelemetryFieldKey{Name: name},
				Value: value,
			})
		}

		s.Labels = lbls

		for idx := range v.Floats {
			p := v.Floats[idx]
			s.Values = append(s.Values, &qbv5.TimeSeriesValue{
				Timestamp: p.T,
				Value:     p.F,
			})
		}
		series = append(series, &s)
	}

	warnings, _ := res.Warnings.AsStrings(q.query.Query, 10, 0)

	return &qbv5.Result{
		Type: q.requestType,
		Value: []*qbv5.TimeSeriesData{
			{
				QueryName: q.query.Name,
				Aggregations: []*qbv5.AggregationBucket{
					{
						Series: series,
					},
				},
			},
		},
		Warnings: warnings,
		// TODO: map promql stats?
	}, nil
}
