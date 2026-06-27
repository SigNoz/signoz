package querier

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/configflagger"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// fakeQuery is a side-effect-free qbtypes.Query whose Execute sleeps for a fixed
// duration to simulate ClickHouse round-trip latency. Fingerprint returns "" so
// run() takes the no-cache path and we isolate the sub-query dispatch loop.
type fakeQuery struct {
	latency time.Duration
}

func (f fakeQuery) Fingerprint() string      { return "" }
func (f fakeQuery) Window() (uint64, uint64) { return 0, 0 }
func (f fakeQuery) Execute(_ context.Context) (*qbtypes.Result, error) {
	time.Sleep(f.latency)
	return &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{},
		Stats: qbtypes.ExecStats{},
	}, nil
}

// newBenchQuerier builds a minimal querier wired with a flagger that has
// enable_parallel_queries set to parallel. bucketCache is nil so execOne always
// hits the direct-execute branch.
func newBenchQuerier(t testing.TB, parallel bool) *querier {
	t.Helper()
	registry := flagger.MustNewRegistry()
	cfg := flagger.Config{}
	if parallel {
		cfg.Config.Boolean = map[string]bool{
			flagger.FeatureEnableParallelQueries.String(): true,
		}
	}
	fl, err := flagger.New(
		context.Background(),
		instrumentationtest.New().ToProviderSettings(),
		cfg,
		registry,
		configflagger.NewFactory(registry),
	)
	require.NoError(t, err)

	return New(
		instrumentationtest.New().ToProviderSettings(),
		nil, // telemetryStore
		nil, // metadataStore
		nil, // prometheus
		nil, // traceStmtBuilder
		nil, // logStmtBuilder
		nil, // auditStmtBuilder
		nil, // metricStmtBuilder
		nil, // meterStmtBuilder
		nil, // traceOperatorStmtBuilder
		nil, // bucketCache
		fl,  // flagger
	)
}

// benchInputs builds n fake sub-queries plus a matching request whose composite
// query names each one, so postProcessResults keeps every result (it drops any
// result not referenced by the request).
func benchInputs(n int, latency time.Duration) (map[string]qbtypes.Query, map[string]qbtypes.Step, *qbtypes.QueryRangeRequest) {
	qs := make(map[string]qbtypes.Query, n)
	steps := make(map[string]qbtypes.Step, n)
	envelopes := make([]qbtypes.QueryEnvelope, 0, n)
	for i := 0; i < n; i++ {
		name := fmt.Sprintf("Q%d", i)
		qs[name] = fakeQuery{latency: latency}
		steps[name] = qbtypes.Step{Duration: time.Minute}
		envelopes = append(envelopes, qbtypes.QueryEnvelope{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:         name,
				StepInterval: qbtypes.Step{Duration: time.Minute},
				Aggregations: []qbtypes.MetricAggregation{{
					MetricName:       "m",
					TimeAggregation:  metrictypes.TimeAggregationRate,
					SpaceAggregation: metrictypes.SpaceAggregationSum,
				}},
				Signal: telemetrytypes.SignalMetrics,
			},
		})
	}
	req := &qbtypes.QueryRangeRequest{
		Start:          uint64(time.Now().Add(-5 * time.Minute).UnixMilli()),
		End:            uint64(time.Now().UnixMilli()),
		RequestType:    qbtypes.RequestTypeTimeSeries,
		CompositeQuery: qbtypes.CompositeQuery{Queries: envelopes},
	}
	return qs, steps, req
}

func benchmarkRun(b *testing.B, parallel bool, n int, latency time.Duration) {
	q := newBenchQuerier(b, parallel)
	qs, steps, req := benchInputs(n, latency)
	orgID := valuer.GenerateUUID()

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := q.run(context.Background(), orgID, qs, req, steps, &qbtypes.QBEvent{}, nil)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// Each fake sub-query simulates a 20ms ClickHouse round trip. Serial wall-time
// grows ~linearly with the number of sub-queries; parallel should stay close to
// a single round trip (up to maxParallelQueries fan-out).
const benchLatency = 20 * time.Millisecond

func BenchmarkRunSerial4(b *testing.B)   { benchmarkRun(b, false, 4, benchLatency) }
func BenchmarkRunParallel4(b *testing.B) { benchmarkRun(b, true, 4, benchLatency) }
func BenchmarkRunSerial8(b *testing.B)   { benchmarkRun(b, false, 8, benchLatency) }
func BenchmarkRunParallel8(b *testing.B) { benchmarkRun(b, true, 8, benchLatency) }

// TestRunParallelMatchesSerial asserts the parallel path produces the same set
// of results as the serial path - the correctness gate for the concurrency.
func TestRunParallelMatchesSerial(t *testing.T) {
	qs, steps, req := benchInputs(5, time.Millisecond)
	orgID := valuer.GenerateUUID()

	serial := newBenchQuerier(t, false)
	parallel := newBenchQuerier(t, true)

	serialResp, err := serial.run(context.Background(), orgID, qs, req, steps, &qbtypes.QBEvent{}, nil)
	require.NoError(t, err)
	parallelResp, err := parallel.run(context.Background(), orgID, qs, req, steps, &qbtypes.QBEvent{}, nil)
	require.NoError(t, err)

	require.Len(t, parallelResp.Data.Results, len(serialResp.Data.Results))
	require.Len(t, parallelResp.Data.Results, len(qs))
}
