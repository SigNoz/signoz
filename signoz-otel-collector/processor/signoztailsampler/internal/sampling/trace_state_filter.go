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

package sampling // import "github.com/SigNoz/signoz-otel-collector/processor/internal/sampling"

import (
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	tracesdk "go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

type traceStateFilter struct {
	key     string
	logger  *zap.Logger
	matcher func(string) bool
}

var _ PolicyEvaluator = (*traceStateFilter)(nil)

// NewTraceStateFilter creates a policy evaluator that samples all traces with
// the given value by the specific key in the trace_state.
func NewTraceStateFilter(logger *zap.Logger, key string, values []string) PolicyEvaluator {
	// initialize the exact value map
	valuesMap := make(map[string]struct{})
	for _, value := range values {
		// the key-value pair("=" will take one character) in trace_state can't exceed 256 characters
		if value != "" && len(key)+len(value) < 256 {
			valuesMap[value] = struct{}{}
		}
	}
	return &traceStateFilter{
		key:    key,
		logger: logger,
		matcher: func(toMatch string) bool {
			_, matched := valuesMap[toMatch]
			return matched
		},
	}
}

// Evaluate looks at the trace data and returns a corresponding SamplingDecision.
func (tsf *traceStateFilter) Evaluate(_ pcommon.TraceID, trace *TraceData) (Decision, error) {
	trace.Lock()
	batches := trace.ReceivedBatches
	trace.Unlock()

	return hasSpanWithCondition(batches, func(span ptrace.Span) bool {
		traceState, err := tracesdk.ParseTraceState(span.TraceState().AsRaw())
		if err != nil {
			return false
		}
		if ok := tsf.matcher(traceState.Get(tsf.key)); ok {
			return true
		}
		return false
	}), nil
}
