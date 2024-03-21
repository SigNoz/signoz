package signoztailsampler

import (
	"context"
	"encoding/binary"
	"errors"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/consumer/consumertest"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/atomic"
	"go.uber.org/zap"

	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler/internal/idbatcher"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler/internal/sampling"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler/internal/timeutils"
)

const (
	defaultTestDecisionWait = 30 * time.Second
)

var testPolicy = []PolicyGroupCfg{
	{
		BasePolicy:  BasePolicy{Name: "test-policy", Type: AlwaysSample, Priority: 1},
		SubPolicies: []BasePolicy{},
	},
}

func TestSequentialTraceArrival(t *testing.T) {
	traceIds, batches := generateIdsAndBatches(128)
	cfg := Config{
		DecisionWait:            defaultTestDecisionWait,
		NumTraces:               uint64(2 * len(traceIds)),
		ExpectedNewTracesPerSec: 64,
		PolicyCfgs:              []PolicyGroupCfg{},
	}
	sp, _ := newTracesProcessor(zap.NewNop(), consumertest.NewNop(), cfg)
	tsp := sp.(*tailSamplingSpanProcessor)
	tsp.tickerFrequency = 100 * time.Millisecond
	require.NoError(t, tsp.Start(context.Background(), componenttest.NewNopHost()))
	defer func() {
		require.NoError(t, tsp.Shutdown(context.Background()))
	}()

	for _, batch := range batches {
		require.NoError(t, tsp.ConsumeTraces(context.Background(), batch))
	}

	for i := range traceIds {
		d, ok := tsp.idToTrace.Load(traceIds[i])
		require.True(t, ok, "Missing expected traceId")
		v := d.(*sampling.TraceData)
		require.Equal(t, int64(i+1), v.SpanCount.Load(), "Incorrect number of spans for entry %d", i)
	}
}

func TestSequentialTraceMapSize(t *testing.T) {
	traceIds, batches := generateIdsAndBatches(210)
	const maxSize = 100
	cfg := Config{
		DecisionWait:            defaultTestDecisionWait,
		NumTraces:               uint64(maxSize),
		ExpectedNewTracesPerSec: 64,
		PolicyCfgs:              testPolicy,
	}
	sp, _ := newTracesProcessor(zap.NewNop(), consumertest.NewNop(), cfg)
	tsp := sp.(*tailSamplingSpanProcessor)
	tsp.tickerFrequency = 100 * time.Millisecond
	require.NoError(t, tsp.Start(context.Background(), componenttest.NewNopHost()))
	defer func() {
		require.NoError(t, tsp.Shutdown(context.Background()))
	}()

	for _, batch := range batches {
		require.NoError(t, tsp.ConsumeTraces(context.Background(), batch))
	}

	// On sequential insertion it is possible to know exactly which traces should be still on the map.
	for i := 0; i < len(traceIds)-maxSize; i++ {
		_, ok := tsp.idToTrace.Load(traceIds[i])
		require.False(t, ok, "Found unexpected traceId[%d] still on map (id: %v)", i, traceIds[i])
	}
}

func TestSamplingPolicyTypicalPath(t *testing.T) {
	const maxSize = 100
	const decisionWaitSeconds = 5
	// For this test explicitly control the timer calls and batcher, and set a mock
	// sampling policy evaluator.
	msp := new(consumertest.TracesSink)
	mpe := &mockPolicyEvaluator{}
	mtt := &manualTTicker{}
	tsp := &tailSamplingSpanProcessor{
		ctx:             context.Background(),
		nextConsumer:    msp,
		maxNumTraces:    maxSize,
		logger:          zap.NewNop(),
		decisionBatcher: newSyncIDBatcher(decisionWaitSeconds),
		policies:        []*policy{{name: "mock-policy", evaluator: mpe, ctx: context.TODO()}},
		deleteChan:      make(chan pcommon.TraceID, maxSize),
		policyTicker:    mtt,
		tickerFrequency: 100 * time.Millisecond,
		numTracesOnMap:  atomic.NewUint64(0),
	}
	require.NoError(t, tsp.Start(context.Background(), componenttest.NewNopHost()))
	defer func() {
		require.NoError(t, tsp.Shutdown(context.Background()))
	}()

	_, batches := generateIdsAndBatches(210)
	currItem := 0
	numSpansPerBatchWindow := 10
	// First evaluations shouldn't have anything to evaluate, until decision wait time passed.
	for evalNum := 0; evalNum < decisionWaitSeconds; evalNum++ {
		for ; currItem < numSpansPerBatchWindow*(evalNum+1); currItem++ {
			require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[currItem]))
			require.True(t, mtt.Started, "Time ticker was expected to have started")
		}
		tsp.samplingPolicyOnTick()
		require.False(
			t,
			msp.SpanCount() != 0 || mpe.EvaluationCount != 0,
			"policy for initial items was evaluated before decision wait period",
		)
	}

	// Now the first batch that waited the decision period.
	mpe.NextDecision = sampling.Sampled
	tsp.samplingPolicyOnTick()
	require.False(
		t,
		msp.SpanCount() == 0 || mpe.EvaluationCount == 0,
		"policy should have been evaluated totalspans == %d and evaluationcount == %d",
		msp.SpanCount(),
		mpe.EvaluationCount,
	)

	require.Equal(t, numSpansPerBatchWindow, msp.SpanCount(), "not all spans of first window were accounted for")

	// Late span of a sampled trace should be sent directly down the pipeline exporter
	require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[0]))
	expectedNumWithLateSpan := numSpansPerBatchWindow + 1
	require.Equal(t, expectedNumWithLateSpan, msp.SpanCount(), "late span was not accounted for")
}

func TestSamplingPolicySampled(t *testing.T) {
	const maxSize = 100
	const decisionWaitSeconds = 5
	// For this test explicitly control the timer calls and batcher, and set a mock
	// sampling policy evaluator.
	msp := new(consumertest.TracesSink)
	mpe := &mockPolicyEvaluator{}
	mtt := &manualTTicker{}
	tsp := &tailSamplingSpanProcessor{
		ctx:             context.Background(),
		nextConsumer:    msp,
		maxNumTraces:    maxSize,
		logger:          zap.NewNop(),
		decisionBatcher: newSyncIDBatcher(decisionWaitSeconds),
		policies:        []*policy{{name: "mock-policy", evaluator: mpe, ctx: context.TODO()}},
		deleteChan:      make(chan pcommon.TraceID, maxSize),
		policyTicker:    mtt,
		tickerFrequency: 100 * time.Millisecond,
		numTracesOnMap:  atomic.NewUint64(0),
	}
	require.NoError(t, tsp.Start(context.Background(), componenttest.NewNopHost()))
	defer func() {
		require.NoError(t, tsp.Shutdown(context.Background()))
	}()

	_, batches := generateIdsAndBatches(210)
	currItem := 0
	numSpansPerBatchWindow := 10
	// First evaluations shouldn't have anything to evaluate, until decision wait time passed.
	for evalNum := 0; evalNum < decisionWaitSeconds; evalNum++ {
		for ; currItem < numSpansPerBatchWindow*(evalNum+1); currItem++ {
			require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[currItem]))
			require.True(t, mtt.Started, "Time ticker was expected to have started")
		}
		tsp.samplingPolicyOnTick()
		require.False(
			t,
			msp.SpanCount() != 0 || mpe.EvaluationCount != 0,
			"policy for initial items was evaluated before decision wait period",
		)
	}

	// Now the first batch that waited the decision period.
	mpe.NextDecision = sampling.Sampled
	tsp.samplingPolicyOnTick()
	require.False(
		t,
		msp.SpanCount() == 0 || mpe.EvaluationCount == 0,
		"policy should have been evaluated totalspans == %d and evaluationcount == %d",
		msp.SpanCount(),
		mpe.EvaluationCount,
	)

	require.Equal(t, numSpansPerBatchWindow, msp.SpanCount(), "not all spans of first window were accounted for")

	// Late span of a sampled trace should be sent directly down the pipeline exporter
	require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[0]))
	expectedNumWithLateSpan := numSpansPerBatchWindow + 1
	require.Equal(t, expectedNumWithLateSpan, msp.SpanCount(), "late span was not accounted for")
}

// in case of multiple policies, we exit when the first one evals to Sampled
func TestSamplingMultiplePolicies(t *testing.T) {
	const maxSize = 100
	const decisionWaitSeconds = 5
	// For this test explicitly control the timer calls and batcher, and set a mock
	// sampling policy evaluator.
	msp := new(consumertest.TracesSink)
	mpe1 := &mockPolicyEvaluator{}
	mpe2 := &mockPolicyEvaluator{}
	mtt := &manualTTicker{}
	tsp := &tailSamplingSpanProcessor{
		ctx:             context.Background(),
		nextConsumer:    msp,
		maxNumTraces:    maxSize,
		logger:          zap.NewNop(),
		decisionBatcher: newSyncIDBatcher(decisionWaitSeconds),
		policies: []*policy{
			{
				name: "policy-1", evaluator: mpe1, ctx: context.TODO(),
			},
			{
				name: "policy-2", evaluator: mpe2, ctx: context.TODO(),
			}},
		deleteChan:      make(chan pcommon.TraceID, maxSize),
		policyTicker:    mtt,
		tickerFrequency: 100 * time.Millisecond,
		numTracesOnMap:  atomic.NewUint64(0),
	}
	require.NoError(t, tsp.Start(context.Background(), componenttest.NewNopHost()))
	defer func() {
		require.NoError(t, tsp.Shutdown(context.Background()))
	}()

	_, batches := generateIdsAndBatches(210)
	currItem := 0
	numSpansPerBatchWindow := 10
	// First evaluations shouldn't have anything to evaluate, until decision wait time passed.
	for evalNum := 0; evalNum < decisionWaitSeconds; evalNum++ {
		for ; currItem < numSpansPerBatchWindow*(evalNum+1); currItem++ {
			require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[currItem]))
			require.True(t, mtt.Started, "Time ticker was expected to have started")
		}
		tsp.samplingPolicyOnTick()
		require.False(
			t,
			msp.SpanCount() != 0 || mpe1.EvaluationCount+mpe2.EvaluationCount != 0,
			"policy for initial items was evaluated before decision wait period",
		)
	}

	// Both policies will decide to sample
	mpe1.NextDecision = sampling.Sampled
	mpe2.NextDecision = sampling.Sampled
	tsp.samplingPolicyOnTick()
	require.False(
		t,
		msp.SpanCount() == 0 || mpe1.EvaluationCount+mpe2.EvaluationCount == 0,
		"policy should have been evaluated totalspans == %d and evaluationcount(1) == %d and evaluationcount(2) == %d",
		msp.SpanCount(),
		mpe1.EvaluationCount,
		mpe2.EvaluationCount,
	)

	require.Equal(t, numSpansPerBatchWindow, msp.SpanCount(), "nextConsumer should've been called with exactly 1 batch of spans")

	// Late span of a sampled trace should be sent directly down the pipeline exporter
	require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[0]))
	expectedNumWithLateSpan := numSpansPerBatchWindow + 1
	require.Equal(t, expectedNumWithLateSpan, msp.SpanCount(), "late span was not accounted for")
}

func TestSamplingPolicyDecisionNotSampled(t *testing.T) {
	const maxSize = 100
	const decisionWaitSeconds = 5
	// For this test explicitly control the timer calls and batcher, and set a mock
	// sampling policy evaluator.
	msp := new(consumertest.TracesSink)
	mpe := &mockPolicyEvaluator{}
	mtt := &manualTTicker{}
	tsp := &tailSamplingSpanProcessor{
		ctx:             context.Background(),
		nextConsumer:    msp,
		maxNumTraces:    maxSize,
		logger:          zap.NewNop(),
		decisionBatcher: newSyncIDBatcher(decisionWaitSeconds),
		policies:        []*policy{{name: "mock-policy", evaluator: mpe, ctx: context.TODO()}},
		deleteChan:      make(chan pcommon.TraceID, maxSize),
		policyTicker:    mtt,
		tickerFrequency: 100 * time.Millisecond,
		numTracesOnMap:  atomic.NewUint64(0),
	}
	require.NoError(t, tsp.Start(context.Background(), componenttest.NewNopHost()))
	defer func() {
		require.NoError(t, tsp.Shutdown(context.Background()))
	}()

	_, batches := generateIdsAndBatches(210)
	currItem := 0
	numSpansPerBatchWindow := 10
	// First evaluations shouldn't have anything to evaluate, until decision wait time passed.
	for evalNum := 0; evalNum < decisionWaitSeconds; evalNum++ {
		for ; currItem < numSpansPerBatchWindow*(evalNum+1); currItem++ {
			require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[currItem]))
			require.True(t, mtt.Started, "Time ticker was expected to have started")
		}
		tsp.samplingPolicyOnTick()
		require.False(
			t,
			msp.SpanCount() != 0 || mpe.EvaluationCount != 0,
			"policy for initial items was evaluated before decision wait period",
		)
	}

	// Now the first batch that waited the decision period.
	mpe.NextDecision = sampling.NotSampled
	tsp.samplingPolicyOnTick()
	require.EqualValues(t, 0, msp.SpanCount(), "exporter should have received zero spans")
	require.EqualValues(t, 4, mpe.EvaluationCount, "policy should have been evaluated 4 times")

	// Late span of a non-sampled trace should be ignored
	require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[0]))
	require.Equal(t, 0, msp.SpanCount())

	// check that by default all spans are sampled unless a filter blocks them
	// this behaviour is different than otel-contrib/tail sampler which blocks
	// all spans by default.
	mpe.NextDecision = sampling.Unspecified
	mpe.NextError = errors.New("mock policy error")
	tsp.samplingPolicyOnTick()
	require.EqualValues(t, 11, msp.SpanCount(), "exporter should have received zero spans")
	require.EqualValues(t, 6, mpe.EvaluationCount, "policy should have been evaluated 6 times")

	// Late span of a non-sampled trace should be ignored
	require.NoError(t, tsp.ConsumeTraces(context.Background(), batches[0]))
	require.Equal(t, 11, msp.SpanCount())
}

func TestMultipleBatchesAreCombinedIntoOne(t *testing.T) {
	const maxSize = 100
	const decisionWaitSeconds = 1
	// For this test explicitly control the timer calls and batcher, and set a mock
	// sampling policy evaluator.
	msp := new(consumertest.TracesSink)
	mpe := &mockPolicyEvaluator{}
	mtt := &manualTTicker{}
	tsp := &tailSamplingSpanProcessor{
		ctx:             context.Background(),
		nextConsumer:    msp,
		maxNumTraces:    maxSize,
		logger:          zap.NewNop(),
		decisionBatcher: newSyncIDBatcher(decisionWaitSeconds),
		policies:        []*policy{{name: "mock-policy", evaluator: mpe, ctx: context.TODO()}},
		deleteChan:      make(chan pcommon.TraceID, maxSize),
		policyTicker:    mtt,
		tickerFrequency: 100 * time.Millisecond,
		numTracesOnMap:  atomic.NewUint64(0),
	}
	require.NoError(t, tsp.Start(context.Background(), componenttest.NewNopHost()))
	defer func() {
		require.NoError(t, tsp.Shutdown(context.Background()))
	}()

	mpe.NextDecision = sampling.Sampled

	traceIds, batches := generateIdsAndBatches(3)
	for _, batch := range batches {
		require.NoError(t, tsp.ConsumeTraces(context.Background(), batch))
	}

	tsp.samplingPolicyOnTick()
	tsp.samplingPolicyOnTick()

	require.EqualValues(t, 3, len(msp.AllTraces()), "There should be three batches, one for each trace")

	expectedSpanIds := make(map[int][]pcommon.SpanID)
	expectedSpanIds[0] = []pcommon.SpanID{
		uInt64ToSpanID(uint64(1)),
	}
	expectedSpanIds[1] = []pcommon.SpanID{
		uInt64ToSpanID(uint64(2)),
		uInt64ToSpanID(uint64(3)),
	}
	expectedSpanIds[2] = []pcommon.SpanID{
		uInt64ToSpanID(uint64(4)),
		uInt64ToSpanID(uint64(5)),
		uInt64ToSpanID(uint64(6)),
	}

	receivedTraces := msp.AllTraces()
	for i, traceID := range traceIds {
		trace := findTrace(t, receivedTraces, traceID)
		require.EqualValues(t, i+1, trace.SpanCount(), "The trace should have all of its spans in a single batch")

		expected := expectedSpanIds[i]
		got := collectSpanIds(trace)

		// might have received out of order, sort for comparison
		sort.Slice(got, func(i, j int) bool {
			bytesA := got[i]
			a := binary.BigEndian.Uint64(bytesA[:])
			bytesB := got[j]
			b := binary.BigEndian.Uint64(bytesB[:])
			return a < b
		})

		require.EqualValues(t, expected, got)
	}
}

func collectSpanIds(trace ptrace.Traces) []pcommon.SpanID {
	var spanIDs []pcommon.SpanID

	for i := 0; i < trace.ResourceSpans().Len(); i++ {
		ilss := trace.ResourceSpans().At(i).ScopeSpans()

		for j := 0; j < ilss.Len(); j++ {
			ils := ilss.At(j)

			for k := 0; k < ils.Spans().Len(); k++ {
				span := ils.Spans().At(k)
				spanIDs = append(spanIDs, span.SpanID())
			}
		}
	}

	return spanIDs
}

func findTrace(t *testing.T, a []ptrace.Traces, traceID pcommon.TraceID) ptrace.Traces {
	for _, batch := range a {
		id := batch.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).TraceID()
		if traceID == id {
			return batch
		}
	}
	t.Fatalf("Trace was not received. TraceId %s", traceID)
	return ptrace.Traces{}
}

func generateIdsAndBatches(numIds int) ([]pcommon.TraceID, []ptrace.Traces) {
	traceIds := make([]pcommon.TraceID, numIds)
	spanID := 0
	var tds []ptrace.Traces
	for i := 0; i < numIds; i++ {
		traceID := [16]byte{}
		binary.BigEndian.PutUint64(traceID[:8], 1)
		binary.BigEndian.PutUint64(traceID[8:], uint64(i+1))
		traceIds[i] = pcommon.TraceID(traceID)
		// Send each span in a separate batch
		for j := 0; j <= i; j++ {
			td := simpleTraces()
			span := td.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0)
			span.SetTraceID(traceIds[i])

			spanID++
			span.SetSpanID(uInt64ToSpanID(uint64(spanID)))
			tds = append(tds, td)
		}
	}

	return traceIds, tds
}

// uInt64ToSpanID converts the uint64 representation of a SpanID to pcommon.SpanID.
func uInt64ToSpanID(id uint64) pcommon.SpanID {
	spanID := [8]byte{}
	binary.BigEndian.PutUint64(spanID[:], id)
	return pcommon.SpanID(spanID)
}

type mockPolicyEvaluator struct {
	NextDecision    sampling.Decision
	NextError       error
	EvaluationCount int
}

var _ sampling.PolicyEvaluator = (*mockPolicyEvaluator)(nil)

func (m *mockPolicyEvaluator) Evaluate(pcommon.TraceID, *sampling.TraceData) (sampling.Decision, error) {
	m.EvaluationCount++
	return m.NextDecision, m.NextError
}

type manualTTicker struct {
	Started bool
}

var _ timeutils.TTicker = (*manualTTicker)(nil)

func (t *manualTTicker) Start(time.Duration) {
	t.Started = true
}

func (t *manualTTicker) OnTick() {
}

func (t *manualTTicker) Stop() {
}

type syncIDBatcher struct {
	sync.Mutex
	openBatch idbatcher.Batch
	batchPipe chan idbatcher.Batch
}

var _ idbatcher.Batcher = (*syncIDBatcher)(nil)

func newSyncIDBatcher(numBatches uint64) idbatcher.Batcher {
	batches := make(chan idbatcher.Batch, numBatches)
	for i := uint64(0); i < numBatches; i++ {
		batches <- nil
	}
	return &syncIDBatcher{
		batchPipe: batches,
	}
}

func (s *syncIDBatcher) AddToCurrentBatch(id pcommon.TraceID) {
	s.Lock()
	s.openBatch = append(s.openBatch, id)
	s.Unlock()
}

func (s *syncIDBatcher) CloseCurrentAndTakeFirstBatch() (idbatcher.Batch, bool) {
	s.Lock()
	defer s.Unlock()
	firstBatch := <-s.batchPipe
	s.batchPipe <- s.openBatch
	s.openBatch = nil
	return firstBatch, true
}

func (s *syncIDBatcher) Stop() {
}

func simpleTraces() ptrace.Traces {
	return simpleTracesWithID(pcommon.TraceID([16]byte{1, 2, 3, 4}))
}

func simpleTracesWithID(traceID pcommon.TraceID) ptrace.Traces {
	traces := ptrace.NewTraces()
	traces.ResourceSpans().AppendEmpty().ScopeSpans().AppendEmpty().Spans().AppendEmpty().SetTraceID(traceID)
	return traces
}
