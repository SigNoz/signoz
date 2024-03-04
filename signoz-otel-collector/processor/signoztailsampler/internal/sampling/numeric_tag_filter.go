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
	"go.uber.org/zap"
)

type numericAttributeFilter struct {
	key                string
	minValue, maxValue int64
	logger             *zap.Logger
}

var _ PolicyEvaluator = (*numericAttributeFilter)(nil)

// NewNumericAttributeFilter creates a policy evaluator that samples all traces with
// the given attribute in the given numeric range.
func NewNumericAttributeFilter(logger *zap.Logger, key string, minValue, maxValue int64) PolicyEvaluator {
	return &numericAttributeFilter{
		key:      key,
		minValue: minValue,
		maxValue: maxValue,
		logger:   logger,
	}
}

// Evaluate looks at the trace data and returns a corresponding SamplingDecision.
func (naf *numericAttributeFilter) Evaluate(_ pcommon.TraceID, trace *TraceData) (Decision, error) {
	trace.Lock()
	batches := trace.ReceivedBatches
	trace.Unlock()

	return hasSpanWithCondition(batches, func(span ptrace.Span) bool {
		if v, ok := span.Attributes().Get(naf.key); ok {
			value := v.Int()
			if value >= naf.minValue && value <= naf.maxValue {
				return true
			}
		}
		return false
	}), nil
}
