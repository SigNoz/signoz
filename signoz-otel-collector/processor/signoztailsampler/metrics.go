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
	"go.opencensus.io/stats"
	"go.opencensus.io/stats/view"
	"go.opencensus.io/tag"
	"go.opentelemetry.io/collector/config/configtelemetry"
	"go.opentelemetry.io/collector/processor/processorhelper"
)

// Variables related to metrics specific to tail sampling.
var (
	tagPolicyKey, _    = tag.NewKey("policy")
	tagSampledKey, _   = tag.NewKey("sampled")
	tagSourceFormat, _ = tag.NewKey("source_format")

	statDecisionLatencyMicroSec  = stats.Int64("sampling_decision_latency", "Latency (in microseconds) of a given sampling policy", "µs")
	statOverallDecisionLatencyUs = stats.Int64("sampling_decision_timer_latency", "Latency (in microseconds) of each run of the sampling decision timer", "µs")

	statTraceRemovalAgeSec           = stats.Int64("sampling_trace_removal_age", "Time (in seconds) from arrival of a new trace until its removal from memory", "s")
	statLateSpanArrivalAfterDecision = stats.Int64("sampling_late_span_age", "Time (in seconds) from the sampling decision was taken and the arrival of a late span", "s")

	statPolicyEvaluationErrorCount = stats.Int64("sampling_policy_evaluation_error", "Count of sampling policy evaluation errors", stats.UnitDimensionless)

	statCountTracesSampled = stats.Int64("count_traces_sampled", "Count of traces that were sampled or not", stats.UnitDimensionless)

	statDroppedTooEarlyCount    = stats.Int64("sampling_trace_dropped_too_early", "Count of traces that needed to be dropped the configured wait time", stats.UnitDimensionless)
	statNewTraceIDReceivedCount = stats.Int64("new_trace_id_received", "Counts the arrival of new traces", stats.UnitDimensionless)
	statTracesOnMemoryGauge     = stats.Int64("sampling_traces_on_memory", "Tracks the number of traces current on memory", stats.UnitDimensionless)
)

// SamplingProcessorMetricViews return the metrics views according to given telemetry level.
func SamplingProcessorMetricViews(level configtelemetry.Level) []*view.View {
	if level == configtelemetry.LevelNone {
		return nil
	}

	policyTagKeys := []tag.Key{tagPolicyKey}

	latencyDistributionAggregation := view.Distribution(1, 2, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 2000, 3000, 4000, 5000, 10000, 20000, 30000, 50000)
	ageDistributionAggregation := view.Distribution(1, 2, 5, 10, 20, 30, 40, 50, 60, 90, 120, 180, 300, 600, 1800, 3600, 7200)

	decisionLatencyView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statDecisionLatencyMicroSec.Name()),
		Measure:     statDecisionLatencyMicroSec,
		Description: statDecisionLatencyMicroSec.Description(),
		TagKeys:     policyTagKeys,
		Aggregation: latencyDistributionAggregation,
	}
	overallDecisionLatencyView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statOverallDecisionLatencyUs.Name()),
		Measure:     statOverallDecisionLatencyUs,
		Description: statOverallDecisionLatencyUs.Description(),
		Aggregation: latencyDistributionAggregation,
	}

	traceRemovalAgeView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statTraceRemovalAgeSec.Name()),
		Measure:     statTraceRemovalAgeSec,
		Description: statTraceRemovalAgeSec.Description(),
		Aggregation: ageDistributionAggregation,
	}
	lateSpanArrivalView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statLateSpanArrivalAfterDecision.Name()),
		Measure:     statLateSpanArrivalAfterDecision,
		Description: statLateSpanArrivalAfterDecision.Description(),
		Aggregation: ageDistributionAggregation,
	}

	countPolicyEvaluationErrorView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statPolicyEvaluationErrorCount.Name()),
		Measure:     statPolicyEvaluationErrorCount,
		Description: statPolicyEvaluationErrorCount.Description(),
		Aggregation: view.Sum(),
	}

	sampledTagKeys := []tag.Key{tagPolicyKey, tagSampledKey}
	countTracesSampledView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statCountTracesSampled.Name()),
		Measure:     statCountTracesSampled,
		Description: statCountTracesSampled.Description(),
		TagKeys:     sampledTagKeys,
		Aggregation: view.Sum(),
	}

	countTraceDroppedTooEarlyView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statDroppedTooEarlyCount.Name()),
		Measure:     statDroppedTooEarlyCount,
		Description: statDroppedTooEarlyCount.Description(),
		Aggregation: view.Sum(),
	}
	countTraceIDArrivalView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statNewTraceIDReceivedCount.Name()),
		Measure:     statNewTraceIDReceivedCount,
		Description: statNewTraceIDReceivedCount.Description(),
		Aggregation: view.Sum(),
	}
	trackTracesOnMemorylView := &view.View{
		Name:        processorhelper.BuildCustomMetricName(typeStr, statTracesOnMemoryGauge.Name()),
		Measure:     statTracesOnMemoryGauge,
		Description: statTracesOnMemoryGauge.Description(),
		Aggregation: view.LastValue(),
	}

	return []*view.View{
		decisionLatencyView,
		overallDecisionLatencyView,

		traceRemovalAgeView,
		lateSpanArrivalView,

		countPolicyEvaluationErrorView,

		countTracesSampledView,

		countTraceDroppedTooEarlyView,
		countTraceIDArrivalView,
		trackTracesOnMemorylView,
	}
}
