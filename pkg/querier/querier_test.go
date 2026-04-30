package querier

import (
	"context"
	"testing"
	"time"

	cmock "github.com/srikanthccv/ClickHouse-go-mock"

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

func (m *mockMetricStmtBuilder) Build(_ context.Context, _, _ uint64, _ qbtypes.RequestType, _ qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	return &qbtypes.Statement{
		Query: "SELECT ts, value FROM signoz_metrics",
		Args:  nil,
	}, nil
}

func TestQueryRange_MetricTypeMissing(t *testing.T) {
	// When a metric has UnspecifiedType and is not found in the metadata store,
	// the querier should return a not-found error, even if the request provides a temporality
	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()

	q := New(
		providerSettings,
		nil, // telemetryStore
		metadataStore,
		nil, // prometheus
		nil, // traceStmtBuilder
		nil, // logStmtBuilder
		nil, // auditStmtBuilder
		nil, // metricStmtBuilder
		nil, // meterStmtBuilder
		nil, // traceOperatorStmtBuilder
		nil, // bucketCache
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

	_, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), req)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "could not find the metric unknown_metric")
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
		nil,                      // prometheus
		nil,                      // traceStmtBuilder
		nil,                      // logStmtBuilder
		nil,                      // auditStmtBuilder
		&mockMetricStmtBuilder{}, // metricStmtBuilder
		nil,                      // meterStmtBuilder
		nil,                      // traceOperatorStmtBuilder
		nil,                      // bucketCache
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
