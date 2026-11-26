package querier

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type queryMatcherAny struct{}

func (m *queryMatcherAny) Match(string, string) error { return nil }

// mockMetricStmtBuilder implements qbtypes.StatementBuilder[qbtypes.MetricAggregation]
// and returns a fixed query string so the mock ClickHouse can match it.
type mockMetricStmtBuilder struct{}

func (m *mockMetricStmtBuilder) Build(_ context.Context, _ valuer.UUID, _, _ uint64, _ qbtypes.RequestType, _ qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	return &qbtypes.Statement{
		Query: "SELECT ts, value FROM signoz_metrics",
		Args:  nil,
	}, nil
}

func TestQueryRange_MetricTypeMissing(t *testing.T) {
	// When a metric has UnspecifiedType and is not found in the metadata store,
	// the querier should return an empty result with a warning instead of an error.
	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()

	q := New(
		providerSettings,
		nil, // telemetryStore
		metadataStore,
		nil,                // prometheus
		nil,                // traceStmtBuilder
		nil,                // aiTraceStmtBuilder
		nil,                // logStmtBuilder
		nil,                // auditStmtBuilder
		nil,                // metricStmtBuilder
		nil,                // meterStmtBuilder
		nil,                // traceOperatorStmtBuilder
		nil,                // bucketCache
		flaggertest.New(t), // flagger
		0,                  // logTraceIDWindowPadding
		0,                  // maxConcurrentQueries
	)

	req := &qbtypes.QueryRangeRequest{
		Start:       uint64(time.Now().Add(-5 * time.Minute).UnixMilli()),
		End:         uint64(time.Now().UnixMilli()),
		RequestType: qbtypes.RequestTypeTimeSeries,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{{
				Type: qbtypes.QueryTypeBuilder,
				Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Name:         "A",
					StepInterval: qbtypes.Step{Duration: time.Minute},
					Aggregations: []qbtypes.MetricAggregation{
						{
							MetricName:       "unknown_metric",
							Temporality:      metrictypes.Cumulative,
							TimeAggregation:  metrictypes.TimeAggregationRate,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						},
					},
					Signal: telemetrytypes.SignalMetrics,
				},
			}},
		},
	}

	resp, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), req)
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.NotNil(t, resp.Warning)

	require.Len(t, resp.Warning.Warnings, 1)
	assert.Contains(t, resp.Warning.Warnings[0].Message, "unknown_metric")
	assert.Contains(t, resp.Warning.Warnings[0].Message, "has never been received")
}

func TestQueryRange_MetricTypeFromStore(t *testing.T) {
	// When a metric has UnspecifiedType but the metadata store returns a valid type,
	// the metric should not be treated as missing.
	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()
	metadataStore.TypeMap["my_metric"] = metrictypes.SumType
	metadataStore.TemporalityMap["my_metric"] = metrictypes.Cumulative

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	cols := []cmock.ColumnType{
		{Name: "ts", Type: "DateTime"},
		{Name: "value", Type: "Float64"},
	}
	rows := cmock.NewRows(cols, [][]any{
		{time.Now(), float64(42)},
	})
	telemetryStore.Mock().
		ExpectQuery("SELECT any").
		WillReturnRows(rows)

	q := New(
		providerSettings,
		telemetryStore,
		metadataStore,
		nil, // prometheus
		nil, // traceStmtBuilder
		nil, // aiTraceStmtBuilder
		nil, // logStmtBuilder
		nil, // auditStmtBuilder
		&mockMetricStmtBuilder{},
		nil,                // meterStmtBuilder
		nil,                // traceOperatorStmtBuilder
		nil,                // bucketCache
		flaggertest.New(t), // flagger
		0,                  // logTraceIDWindowPadding
		0,                  // maxConcurrentQueries
	)

	req := &qbtypes.QueryRangeRequest{
		Start:       uint64(time.Now().Add(-5 * time.Minute).UnixMilli()),
		End:         uint64(time.Now().UnixMilli()),
		RequestType: qbtypes.RequestTypeTimeSeries,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{{
				Type: qbtypes.QueryTypeBuilder,
				Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Name:         "A",
					StepInterval: qbtypes.Step{Duration: time.Minute},
					Aggregations: []qbtypes.MetricAggregation{
						{
							MetricName:       "my_metric",
							TimeAggregation:  metrictypes.TimeAggregationRate,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						},
					},
					Signal: telemetrytypes.SignalMetrics,
				},
			}},
		},
	}

	resp, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), req)
	require.NoError(t, err)
	require.NotNil(t, resp)
}

type mockTraceStmtBuilder struct{}

func (m *mockTraceStmtBuilder) Build(_ context.Context, _ valuer.UUID, _, _ uint64, _ qbtypes.RequestType, _ qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	return &qbtypes.Statement{
		Query: "SELECT ts, value FROM signoz_traces",
		Args:  nil,
	}, nil
}

func TestQueryRange_MetricRecentStepPartial(t *testing.T) {
	nowMinute := time.Now().UTC().Truncate(time.Minute)
	olderStep := nowMinute.Add(-3 * time.Minute)
	newestStep := nowMinute

	start := uint64(nowMinute.Add(-5 * time.Minute).UnixMilli())
	end := uint64(nowMinute.Add(time.Minute).UnixMilli())

	cols := []cmock.ColumnType{
		{Name: "ts", Type: "DateTime"},
		{Name: "value", Type: "Float64"},
	}

	t.Run("MetricQueryMarksRecentStepPartial", func(t *testing.T) {
		providerSettings := instrumentationtest.New().ToProviderSettings()
		metadataStore := telemetrytypestest.NewMockMetadataStore()
		metadataStore.TypeMap["signoz_calls_total"] = metrictypes.SumType
		metadataStore.TemporalityMap["signoz_calls_total"] = metrictypes.Cumulative

		telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})
		rows := cmock.NewRows(cols, [][]any{
			{olderStep, float64(4.05)},
			{newestStep, float64(0.13)},
		})
		telemetryStore.Mock().ExpectQuery("SELECT any").WillReturnRows(rows)

		q := New(
			providerSettings,
			telemetryStore,
			metadataStore,
			nil,
			nil,
			nil,
			nil,
			nil,
			&mockMetricStmtBuilder{},
			nil,
			nil,
			nil,
			flaggertest.New(t),
			0,
			0,
		)

		req := &qbtypes.QueryRangeRequest{
			Start:       start,
			End:         end,
			RequestType: qbtypes.RequestTypeTimeSeries,
			CompositeQuery: qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:         "A",
						Signal:       telemetrytypes.SignalMetrics,
						StepInterval: qbtypes.Step{Duration: time.Minute},
						Aggregations: []qbtypes.MetricAggregation{{
							MetricName:       "signoz_calls_total",
							TimeAggregation:  metrictypes.TimeAggregationRate,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						}},
					},
				}},
			},
		}

		resp, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), req)
		require.NoError(t, err)
		require.Len(t, resp.Data.Results, 1)

		tsData, ok := resp.Data.Results[0].(*qbtypes.TimeSeriesData)
		require.True(t, ok)
		require.Len(t, tsData.Aggregations, 1)
		require.Len(t, tsData.Aggregations[0].Series, 1)
		values := tsData.Aggregations[0].Series[0].Values
		require.Len(t, values, 2)
		assert.False(t, values[0].Partial)
		assert.True(t, values[1].Partial)
	})

	t.Run("TraceQueryLeavesAlignedRecentStepComplete", func(t *testing.T) {
		providerSettings := instrumentationtest.New().ToProviderSettings()
		telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})
		rows := cmock.NewRows(cols, [][]any{
			{olderStep, float64(4)},
			{newestStep, float64(5)},
		})
		telemetryStore.Mock().ExpectQuery("SELECT any").WillReturnRows(rows)

		q := New(
			providerSettings,
			telemetryStore,
			nil,
			nil,
			&mockTraceStmtBuilder{},
			nil,
			nil,
			nil,
			nil,
			nil,
			nil,
			nil,
			flaggertest.New(t),
			0,
			0,
		)

		req := &qbtypes.QueryRangeRequest{
			Start:       start,
			End:         end,
			RequestType: qbtypes.RequestTypeTimeSeries,
			CompositeQuery: qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Name:         "A",
						Signal:       telemetrytypes.SignalTraces,
						StepInterval: qbtypes.Step{Duration: time.Minute},
						Aggregations: []qbtypes.TraceAggregation{{
							Expression: "count()",
						}},
					},
				}},
			},
		}

		resp, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), req)
		require.NoError(t, err)
		require.Len(t, resp.Data.Results, 1)

		tsData, ok := resp.Data.Results[0].(*qbtypes.TimeSeriesData)
		require.True(t, ok)
		require.Len(t, tsData.Aggregations, 1)
		require.Len(t, tsData.Aggregations[0].Series, 1)
		values := tsData.Aggregations[0].Series[0].Values
		require.Len(t, values, 2)
		assert.False(t, values[0].Partial)
		assert.False(t, values[1].Partial)
	})
}

type fakeQuery struct {
	execute func(ctx context.Context) (*qbtypes.Result, error)
}

func (f *fakeQuery) Fingerprint() string                                  { return "" }
func (f *fakeQuery) Window() (uint64, uint64)                             { return 0, 0 }
func (f *fakeQuery) Execute(ctx context.Context) (*qbtypes.Result, error) { return f.execute(ctx) }

func chQueryEnvelopes(names []string) []qbtypes.QueryEnvelope {
	envelopes := make([]qbtypes.QueryEnvelope, 0, len(names))
	for _, name := range names {
		envelopes = append(envelopes, qbtypes.QueryEnvelope{
			Type: qbtypes.QueryTypeClickHouseSQL,
			Spec: qbtypes.ClickHouseQuery{Name: name},
		})
	}
	return envelopes
}

func TestRunExecutesQueriesConcurrently(t *testing.T) {
	names := []string{"A", "B", "C", "D", "E"}
	numQueries := len(names)

	q := &querier{
		logger:               instrumentationtest.New().Logger(),
		fl:                   flaggertest.New(t),
		maxConcurrentQueries: numQueries,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var started atomic.Int32
	allStarted := make(chan struct{})

	qs := make(map[string]qbtypes.Query, numQueries)
	for _, name := range names {
		qs[name] = &fakeQuery{execute: func(ctx context.Context) (*qbtypes.Result, error) {
			if int(started.Add(1)) == numQueries {
				close(allStarted)
			}
			select {
			case <-allStarted:
			case <-ctx.Done():
				return nil, ctx.Err()
			}
			return &qbtypes.Result{
				Type:  qbtypes.RequestTypeScalar,
				Value: &qbtypes.ScalarData{QueryName: name},
				Stats: qbtypes.ExecStats{RowsScanned: 1, BytesScanned: 2, DurationMS: 3},
			}, nil
		}}
	}

	req := &qbtypes.QueryRangeRequest{
		RequestType:    qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{Queries: chQueryEnvelopes(names)},
	}
	resp, err := q.run(ctx, valuer.GenerateUUID(), qs, req, nil, &qbtypes.QBEvent{}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Len(t, resp.Data.Results, numQueries)
	assert.Equal(t, uint64(numQueries), resp.Meta.RowsScanned)
	assert.Equal(t, uint64(2*numQueries), resp.Meta.BytesScanned)
	assert.Equal(t, uint64(3*numQueries), resp.Meta.DurationMS)
}

func TestRunRespectsMaxConcurrentQueries(t *testing.T) {
	const limit = 2
	names := []string{"A", "B", "C", "D", "E", "F", "G", "H"}

	q := &querier{
		logger:               instrumentationtest.New().Logger(),
		fl:                   flaggertest.New(t),
		maxConcurrentQueries: limit,
	}

	var running, maxRunning atomic.Int32
	qs := make(map[string]qbtypes.Query, len(names))
	for _, name := range names {
		qs[name] = &fakeQuery{execute: func(ctx context.Context) (*qbtypes.Result, error) {
			cur := running.Add(1)
			defer running.Add(-1)
			for {
				m := maxRunning.Load()
				if cur <= m || maxRunning.CompareAndSwap(m, cur) {
					break
				}
			}
			time.Sleep(20 * time.Millisecond)
			return &qbtypes.Result{
				Type:  qbtypes.RequestTypeScalar,
				Value: &qbtypes.ScalarData{QueryName: name},
			}, nil
		}}
	}

	req := &qbtypes.QueryRangeRequest{
		RequestType:    qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{Queries: chQueryEnvelopes(names)},
	}
	resp, err := q.run(context.Background(), valuer.GenerateUUID(), qs, req, nil, &qbtypes.QBEvent{}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Len(t, resp.Data.Results, len(names))
	assert.LessOrEqual(t, maxRunning.Load(), int32(limit), "running queries must not exceed maxConcurrentQueries")
}

func TestRunQueryErrorCancelsSiblings(t *testing.T) {
	q := &querier{
		logger:               instrumentationtest.New().Logger(),
		fl:                   flaggertest.New(t),
		maxConcurrentQueries: 4,
	}

	bStarted := make(chan struct{})
	var bCanceled atomic.Bool

	qs := map[string]qbtypes.Query{
		// fails once B is running.
		"A": &fakeQuery{execute: func(ctx context.Context) (*qbtypes.Result, error) {
			select {
			case <-bStarted:
			case <-ctx.Done():
			}
			return nil, errors.NewInternalf(errors.CodeInternal, "query A failed")
		}},
		// blocks until its context is canceled by A's failure.
		"B": &fakeQuery{execute: func(ctx context.Context) (*qbtypes.Result, error) {
			close(bStarted)
			select {
			case <-ctx.Done():
				bCanceled.Store(true)
				return nil, ctx.Err()
			case <-time.After(10 * time.Second):
				return nil, errors.NewInternalf(errors.CodeInternal, "query B was never canceled")
			}
		}},
	}

	req := &qbtypes.QueryRangeRequest{
		RequestType:    qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{Queries: chQueryEnvelopes([]string{"A", "B"})},
	}
	_, err := q.run(context.Background(), valuer.GenerateUUID(), qs, req, nil, &qbtypes.QBEvent{}, nil)
	require.ErrorContains(t, err, "query A failed")
	assert.True(t, bCanceled.Load(), "query B should be canceled once query A fails")
}
