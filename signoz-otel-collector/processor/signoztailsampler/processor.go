// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package signoztailsampler // import "github.com/open-telemetry/opentelemetry-collector-contrib/processor/tailsamplingprocessor"

import (
	"context"
	"fmt"
	"runtime"
	"sort"
	"sync"
	"time"

	"go.opencensus.io/stats"
	"go.opencensus.io/tag"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/processor"
	"go.uber.org/atomic"
	"go.uber.org/zap"

	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler/internal/idbatcher"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler/internal/sampling"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler/internal/timeutils"
)

// policy combines a sampling policy evaluator with the destinations to be
// used for that policy.
type policy struct {
	// name used to identify this policy instance.
	name string
	// evaluator that decides if a trace is sampled or not by this policy instance.
	evaluator sampling.PolicyEvaluator
	// ctx used to carry metric tags of each policy.
	ctx context.Context
}

// tailSamplingSpanProcessor handles the incoming trace data and uses the given sampling
// policy to sample traces.
type tailSamplingSpanProcessor struct {
	ctx             context.Context
	nextConsumer    consumer.Traces
	maxNumTraces    uint64
	policies        []*policy
	logger          *zap.Logger
	idToTrace       sync.Map
	policyTicker    timeutils.TTicker
	tickerFrequency time.Duration
	decisionBatcher idbatcher.Batcher
	deleteChan      chan pcommon.TraceID
	numTracesOnMap  *atomic.Uint64
}

const (
	sourceFormat = "signoz_tail_sampling"
)

// newTracesProcessor returns a processor.TracesProcessor that will perform tail sampling according to the given
// configuration.
func newTracesProcessor(logger *zap.Logger, nextConsumer consumer.Traces, cfg Config) (processor.Traces, error) {
	if nextConsumer == nil {
		return nil, component.ErrNilNextConsumer
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config invalid: %v", err)
	}

	numDecisionBatches := uint64(cfg.DecisionWait.Seconds())

	inBatcher, err := idbatcher.New(numDecisionBatches, cfg.ExpectedNewTracesPerSec, uint64(2*runtime.NumCPU()))
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	var policies []*policy
	policyGroups := []PolicyGroupCfg{}

	copy(policyGroups, cfg.PolicyCfgs)
	// sort the policies by priority
	sort.Slice(policyGroups, func(i, j int) bool {
		return policyGroups[i].Priority < policyGroups[j].Priority
	})

	for i := range policyGroups {
		policyCfg := policyGroups[i]
		policyCtx, err := tag.New(ctx, tag.Upsert(tagPolicyKey, policyCfg.Name), tag.Upsert(tagSourceFormat, sourceFormat))
		if err != nil {
			return nil, err
		}
		eval := NewDefaultEvaluator(logger, policyCfg.BasePolicy, policyCfg.SubPolicies)
		if err != nil {
			return nil, err
		}
		p := &policy{
			name:      policyCfg.Name,
			evaluator: eval,
			ctx:       policyCtx,
		}
		policies = append(policies, p)
	}
	logger.Debug("loadded policies:", zap.Int("policy count", len(policies)))

	tsp := &tailSamplingSpanProcessor{
		ctx:             ctx,
		nextConsumer:    nextConsumer,
		maxNumTraces:    cfg.NumTraces,
		logger:          logger,
		decisionBatcher: inBatcher,
		policies:        policies,
		tickerFrequency: time.Second,
		numTracesOnMap:  atomic.NewUint64(0),
	}

	tsp.policyTicker = &timeutils.PolicyTicker{OnTickFunc: tsp.samplingPolicyOnTick}
	tsp.deleteChan = make(chan pcommon.TraceID, cfg.NumTraces)

	return tsp, nil
}

type policyMetrics struct {
	idNotFoundOnMapCount, evaluateErrorCount, decisionSampled, decisionNotSampled int64
}

func (tsp *tailSamplingSpanProcessor) samplingPolicyOnTick() {
	metrics := policyMetrics{}

	startTime := time.Now()
	batch, _ := tsp.decisionBatcher.CloseCurrentAndTakeFirstBatch()
	batchLen := len(batch)
	tsp.logger.Debug("Sampling Policy Evaluation ticked")
	for _, id := range batch {
		d, ok := tsp.idToTrace.Load(id)
		if !ok {
			metrics.idNotFoundOnMapCount++
			continue
		}
		trace := d.(*sampling.TraceData)
		trace.DecisionTime = time.Now()

		decision, policy := tsp.makeDecision(id, trace, &metrics)

		// Sampled or not, remove the batches
		trace.Lock()
		allSpans := ptrace.NewTraces()
		trace.FinalDecision = decision
		trace.ReceivedBatches.CopyTo(allSpans)
		trace.Unlock()

		if decision == sampling.Sampled {
			_ = tsp.nextConsumer.ConsumeTraces(policy.ctx, allSpans)
		}
	}

	stats.Record(tsp.ctx,
		statOverallDecisionLatencyUs.M(int64(time.Since(startTime)/time.Microsecond)),
		statDroppedTooEarlyCount.M(metrics.idNotFoundOnMapCount),
		statPolicyEvaluationErrorCount.M(metrics.evaluateErrorCount),
		statTracesOnMemoryGauge.M(int64(tsp.numTracesOnMap.Load())))

	tsp.logger.Debug("Sampling policy evaluation completed",
		zap.Int("batch.len", batchLen),
		zap.Int64("sampled", metrics.decisionSampled),
		zap.Int64("notSampled", metrics.decisionNotSampled),
		zap.Int64("droppedPriorToEvaluation", metrics.idNotFoundOnMapCount),
		zap.Int64("policyEvaluationErrors", metrics.evaluateErrorCount),
	)
}

func (tsp *tailSamplingSpanProcessor) makeDecision(id pcommon.TraceID, trace *sampling.TraceData, metrics *policyMetrics) (d sampling.Decision, p *policy) {

	finalDecision := sampling.NoResult
	var matchingPolicy *policy

	// Check all policies before making a final decision
	for i, p := range tsp.policies {
		policyEvaluateStartTime := time.Now()
		decision, err := p.evaluator.Evaluate(id, trace)
		stats.Record(
			p.ctx,
			statDecisionLatencyMicroSec.M(int64(time.Since(policyEvaluateStartTime)/time.Microsecond)))

		trace.Decisions[i] = decision

		if err != nil {
			metrics.evaluateErrorCount++
			tsp.logger.Debug("Sampling policy error", zap.Error(err))
		}

		if decision == sampling.Sampled || decision == sampling.NotSampled {
			finalDecision = decision
			matchingPolicy = p
			break
		}
	}

	// check if none of the policies matched
	if finalDecision == sampling.NoResult {
		// we default to always sample when no policies match
		finalDecision = sampling.Sampled

		// this assignment is for reporting purpose only,
		// no evaluation occurs after this point
		matchingPolicy = &policy{
			name:      string(AlwaysSample),
			evaluator: sampling.NewAlwaysSample(tsp.logger),
			ctx:       tsp.ctx,
		}
	}

	// always sample by default, hence no-result means sampled
	switch finalDecision {
	case sampling.Sampled:

		_ = stats.RecordWithTags(
			matchingPolicy.ctx,
			[]tag.Mutator{tag.Upsert(tagSampledKey, "true")},
			statCountTracesSampled.M(int64(1)),
		)
		metrics.decisionSampled++

	case sampling.NotSampled:
		_ = stats.RecordWithTags(
			matchingPolicy.ctx,
			[]tag.Mutator{tag.Upsert(tagSampledKey, "false")},
			statCountTracesSampled.M(int64(1)),
		)
		metrics.decisionNotSampled++
	}

	return finalDecision, matchingPolicy
}

// ConsumeTraces is required by the processor.Traces interface.
func (tsp *tailSamplingSpanProcessor) ConsumeTraces(ctx context.Context, td ptrace.Traces) error {
	resourceSpans := td.ResourceSpans()
	for i := 0; i < resourceSpans.Len(); i++ {
		tsp.processTraces(resourceSpans.At(i))
	}
	return nil
}

func (tsp *tailSamplingSpanProcessor) groupSpansByTraceKey(resourceSpans ptrace.ResourceSpans) map[pcommon.TraceID][]*ptrace.Span {
	idToSpans := make(map[pcommon.TraceID][]*ptrace.Span)
	ilss := resourceSpans.ScopeSpans()
	for j := 0; j < ilss.Len(); j++ {
		spans := ilss.At(j).Spans()
		spansLen := spans.Len()
		for k := 0; k < spansLen; k++ {
			span := spans.At(k)
			key := span.TraceID()
			idToSpans[key] = append(idToSpans[key], &span)
		}
	}
	return idToSpans
}

func (tsp *tailSamplingSpanProcessor) processTraces(resourceSpans ptrace.ResourceSpans) {

	// Group spans per their traceId to minimize contention on idToTrace
	idToSpans := tsp.groupSpansByTraceKey(resourceSpans)

	var newTraceIDs int64
	for id, spans := range idToSpans {
		lenSpans := int64(len(spans))
		lenPolicies := len(tsp.policies)
		initialDecisions := make([]sampling.Decision, lenPolicies)
		for i := 0; i < lenPolicies; i++ {
			initialDecisions[i] = sampling.Pending
		}
		d, loaded := tsp.idToTrace.Load(id)
		if !loaded {
			d, loaded = tsp.idToTrace.LoadOrStore(id, &sampling.TraceData{
				Decisions:       initialDecisions,
				ArrivalTime:     time.Now(),
				SpanCount:       atomic.NewInt64(lenSpans),
				ReceivedBatches: ptrace.NewTraces(),
			})
		}
		actualData := d.(*sampling.TraceData)
		if loaded {
			actualData.SpanCount.Add(lenSpans)
		} else {
			newTraceIDs++
			tsp.decisionBatcher.AddToCurrentBatch(id)
			tsp.numTracesOnMap.Add(1)
			postDeletion := false
			currTime := time.Now()
			for !postDeletion {
				select {
				case tsp.deleteChan <- id:
					postDeletion = true
				default:
					traceKeyToDrop := <-tsp.deleteChan
					tsp.dropTrace(traceKeyToDrop, currTime)
				}
			}
		}

		// The only thing we really care about here is the final decision.
		actualData.Lock()
		finalDecision := actualData.FinalDecision

		if finalDecision == sampling.Unspecified {
			// If the final decision hasn't been made, add the new spans under the lock.
			appendToTraces(actualData.ReceivedBatches, resourceSpans, spans)
			actualData.Unlock()
		} else {
			actualData.Unlock()

			switch finalDecision {
			case sampling.Sampled:
				// Forward the spans to the policy destinations
				traceTd := ptrace.NewTraces()
				appendToTraces(traceTd, resourceSpans, spans)
				if err := tsp.nextConsumer.ConsumeTraces(tsp.ctx, traceTd); err != nil {
					tsp.logger.Warn(
						"Error sending late arrived spans to destination",
						zap.Error(err))
				}
			case sampling.NotSampled:
				stats.Record(tsp.ctx, statLateSpanArrivalAfterDecision.M(int64(time.Since(actualData.DecisionTime)/time.Second)))
			default:
				tsp.logger.Warn("Encountered unexpected sampling decision",
					zap.Int("decision", int(finalDecision)))
			}
		}
	}
	stats.Record(tsp.ctx, statNewTraceIDReceivedCount.M(newTraceIDs))
}

func (tsp *tailSamplingSpanProcessor) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{MutatesData: false}
}

// Start is invoked during service startup.
func (tsp *tailSamplingSpanProcessor) Start(context.Context, component.Host) error {
	tsp.policyTicker.Start(tsp.tickerFrequency)
	return nil
}

// Shutdown is invoked during service shutdown.
func (tsp *tailSamplingSpanProcessor) Shutdown(context.Context) error {
	tsp.decisionBatcher.Stop()
	tsp.policyTicker.Stop()
	return nil
}

func (tsp *tailSamplingSpanProcessor) dropTrace(traceID pcommon.TraceID, deletionTime time.Time) {
	var trace *sampling.TraceData
	if d, ok := tsp.idToTrace.Load(traceID); ok {
		trace = d.(*sampling.TraceData)
		tsp.idToTrace.Delete(traceID)
		// Subtract one from numTracesOnMap per https://godoc.org/sync/atomic#AddUint64
		tsp.numTracesOnMap.Add(^uint64(0))
	}
	if trace == nil {
		tsp.logger.Error("Attempt to delete traceID not on table")
		return
	}

	stats.Record(tsp.ctx, statTraceRemovalAgeSec.M(int64(deletionTime.Sub(trace.ArrivalTime)/time.Second)))
}

func appendToTraces(dest ptrace.Traces, rss ptrace.ResourceSpans, spans []*ptrace.Span) {
	rs := dest.ResourceSpans().AppendEmpty()
	rss.Resource().CopyTo(rs.Resource())
	ils := rs.ScopeSpans().AppendEmpty()
	for _, span := range spans {
		sp := ils.Spans().AppendEmpty()
		span.CopyTo(sp)
	}
}
