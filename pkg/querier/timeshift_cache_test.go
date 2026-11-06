package querier

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// recordingStmtBuilder records the window of every statement it builds.
type recordingStmtBuilder[T any] struct {
	mu     sync.Mutex
	builds []qbtypes.TimeRange
}

func (b *recordingStmtBuilder[T]) Build(_ context.Context, _ valuer.UUID, startMs, endMs uint64, _ qbtypes.RequestType, _ qbtypes.QueryBuilderQuery[T], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.builds = append(b.builds, qbtypes.TimeRange{From: startMs, To: endMs})
	return &qbtypes.Statement{Query: "SELECT ts, value FROM signoz_metrics"}, nil
}

func (b *recordingStmtBuilder[T]) windows() []qbtypes.TimeRange {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]qbtypes.TimeRange(nil), b.builds...)
}

func timeshiftSpec[T any](shiftSeconds int64) qbtypes.QueryBuilderQuery[T] {
	spec := qbtypes.QueryBuilderQuery[T]{
		Name:         "A",
		StepInterval: qbtypes.Step{Duration: time.Minute},
		Functions: []qbtypes.Function{{
			Name: qbtypes.FunctionNameTimeShift,
			Args: []qbtypes.FunctionArg{{Value: fmt.Sprint(shiftSeconds)}},
		}},
	}
	spec.ShiftBy = extractShiftFromBuilderQuery(spec)
	return spec
}

// The bucket cache hands back missing sub-ranges of the already shifted query
// window, so a ranged query runs the sub-range as it is. Shifting it a second
// time queries a different hour than the one the caller asked for.
func TestTimeShiftedQueryPartialCacheHitExecutesShiftedSubRange(t *testing.T) {
	ctx := context.Background()
	orgID := valuer.GenerateUUID()
	step := qbtypes.Step{Duration: time.Minute}

	providerSettings := instrumentationtest.New().ToProviderSettings()
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})
	cols := []cmock.ColumnType{{Name: "ts", Type: "DateTime"}, {Name: "value", Type: "Float64"}}
	telemetryStore.Mock().ExpectQuery("SELECT").WillReturnRows(cmock.NewRows(cols, [][]any{{time.Now(), float64(1)}}))

	stmtBuilder := &recordingStmtBuilder[qbtypes.MetricAggregation]{}
	bucketCache := NewBucketCache(providerSettings, createTestCache(t), cacheTTL, defaultFluxInterval)
	q := New(providerSettings, telemetryStore, nil, nil, nil, nil, nil, nil, stmtBuilder, nil, nil, bucketCache, flaggertest.New(t), 0, 0)

	// The shifted window sits well outside the flux interval so the cache keeps it.
	shiftedEnd := (uint64(time.Now().Add(-2*time.Hour).UnixMilli()) / 60000) * 60000
	shiftedStart := shiftedEnd - 60*60*1000
	cachedUntil := shiftedStart + 30*60*1000

	spec := timeshiftSpec[qbtypes.MetricAggregation](3600)
	spec.Signal = telemetrytypes.SignalMetrics
	spec.Aggregations = []qbtypes.MetricAggregation{{
		MetricName:       "my_metric",
		Temporality:      metrictypes.Cumulative,
		TimeAggregation:  metrictypes.TimeAggregationRate,
		SpaceAggregation: metrictypes.SpaceAggregationSum,
	}}

	// Seed the first half of the window through the same cache key the query uses.
	cachedQuery := newBuilderQuery(q.logger, telemetryStore, orgID, stmtBuilder, qbtypes.QueryTypeBuilder, spec, qbtypes.TimeRange{From: shiftedStart, To: cachedUntil}, qbtypes.RequestTypeTimeSeries, nil, builderConfig{})
	bucketCache.Put(ctx, orgID, cachedQuery, step, &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: createTestTimeSeries("A", shiftedStart, cachedUntil, uint64(step.Milliseconds())),
	})

	query := newBuilderQuery(q.logger, telemetryStore, orgID, stmtBuilder, qbtypes.QueryTypeBuilder, spec, qbtypes.TimeRange{From: shiftedStart, To: shiftedEnd}, qbtypes.RequestTypeTimeSeries, nil, builderConfig{})

	_, missing := bucketCache.GetMissRanges(ctx, orgID, query, step)
	require.Len(t, missing, 1)
	require.Equal(t, &qbtypes.TimeRange{From: cachedUntil, To: shiftedEnd}, missing[0])

	_, err := q.executeWithCache(ctx, orgID, query, step, make(chan struct{}, 1))
	require.NoError(t, err)

	assert.Equal(t, []qbtypes.TimeRange{{From: cachedUntil, To: shiftedEnd}}, stmtBuilder.windows())
}

func TestCreateRangedQueryKeepsRequestedWindow(t *testing.T) {
	orgID := valuer.GenerateUUID()
	providerSettings := instrumentationtest.New().ToProviderSettings()
	q := New(providerSettings, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, flaggertest.New(t), 0, 0)

	// The shifted window and one missing sub-range of it, as the bucket cache reports them.
	shifted := qbtypes.TimeRange{From: 6400000, To: 16400000}
	subRange := qbtypes.TimeRange{From: 11400000, To: 16400000}

	tests := []struct {
		name  string
		query qbtypes.Query
	}{
		{
			name: "trace aggregation",
			query: newBuilderQuery(q.logger, nil, orgID, nil, qbtypes.QueryTypeBuilder,
				timeshiftSpec[qbtypes.TraceAggregation](3600), shifted, qbtypes.RequestTypeTimeSeries, nil, builderConfig{}),
		},
		{
			name: "log aggregation",
			query: newBuilderQuery(q.logger, nil, orgID, nil, qbtypes.QueryTypeBuilder,
				timeshiftSpec[qbtypes.LogAggregation](3600), shifted, qbtypes.RequestTypeTimeSeries, nil, builderConfig{}),
		},
		{
			name: "metric aggregation",
			query: newBuilderQuery(q.logger, nil, orgID, nil, qbtypes.QueryTypeBuilder,
				timeshiftSpec[qbtypes.MetricAggregation](3600), shifted, qbtypes.RequestTypeTimeSeries, nil, builderConfig{}),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ranged := q.createRangedQuery(orgID, tt.query, subRange)
			require.NotNil(t, ranged)

			from, to := ranged.Window()
			assert.Equal(t, subRange.From, from)
			assert.Equal(t, subRange.To, to)
		})
	}
}
