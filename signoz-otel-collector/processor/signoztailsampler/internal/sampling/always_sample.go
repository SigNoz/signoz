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
	"go.uber.org/zap"
)

type alwaysSample struct {
	logger *zap.Logger
}

var _ PolicyEvaluator = (*alwaysSample)(nil)

// NewAlwaysSample creates a policy evaluator the samples all traces.
func NewAlwaysSample(logger *zap.Logger) PolicyEvaluator {
	return &alwaysSample{
		logger: logger,
	}
}

// Evaluate looks at the trace data and returns a corresponding SamplingDecision.
func (as *alwaysSample) Evaluate(pcommon.TraceID, *TraceData) (Decision, error) {
	as.logger.Debug("Evaluating spans in always-sample filter")
	return Sampled, nil
}
