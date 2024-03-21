// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package sampling // import "github.com/SigNoz/signoz-otel-collector/processor/internal/sampling"

import (
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.uber.org/zap"
)

type And struct {
	// the subpolicy evaluators
	subpolicies []PolicyEvaluator
	logger      *zap.Logger
}

func NewAnd(
	logger *zap.Logger,
	subpolicies []PolicyEvaluator,
) PolicyEvaluator {

	return &And{
		subpolicies: subpolicies,
		logger:      logger,
	}
}

// Evaluate looks at the trace data and returns a corresponding SamplingDecision.
func (c *And) Evaluate(traceID pcommon.TraceID, trace *TraceData) (Decision, error) {
	// The policy iterates over all sub-policies and returns Sampled if all sub-policies returned a Sampled Decision.
	// If any subpolicy returns NotSampled, it returns NotSampled Decision.
	for _, sub := range c.subpolicies {
		decision, err := sub.Evaluate(traceID, trace)
		if err != nil {
			return Unspecified, err
		}
		if decision == NotSampled || decision == InvertNotSampled {
			return NotSampled, nil
		}

	}
	return Sampled, nil
}

// OnDroppedSpans is called when the trace needs to be dropped, due to memory
// pressure, before the decision_wait time has been reached.
func (c *And) OnDroppedSpans(pcommon.TraceID, *TraceData) (Decision, error) {
	return Sampled, nil
}
