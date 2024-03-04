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
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.uber.org/zap"
)

type rateLimiting struct {
	currentSecond        int64
	spansInCurrentSecond int64
	spansPerSecond       int64
	logger               *zap.Logger
}

var _ PolicyEvaluator = (*rateLimiting)(nil)

// NewRateLimiting creates a policy evaluator the samples all traces.
func NewRateLimiting(logger *zap.Logger, spansPerSecond int64) PolicyEvaluator {
	return &rateLimiting{
		spansPerSecond: spansPerSecond,
		logger:         logger,
	}
}

// Evaluate looks at the trace data and returns a corresponding SamplingDecision.
func (r *rateLimiting) Evaluate(_ pcommon.TraceID, trace *TraceData) (Decision, error) {
	r.logger.Debug("Evaluating spans in rate-limiting filter")
	currSecond := time.Now().Unix()
	if r.currentSecond != currSecond {
		r.currentSecond = currSecond
		r.spansInCurrentSecond = 0
	}

	spansInSecondIfSampled := r.spansInCurrentSecond + trace.SpanCount.Load()
	if spansInSecondIfSampled < r.spansPerSecond {
		r.spansInCurrentSecond = spansInSecondIfSampled
		return Sampled, nil
	}

	return NotSampled, nil
}
