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
	"errors"
	"fmt"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/zap"
)

type statusCodeFilter struct {
	logger      *zap.Logger
	statusCodes []ptrace.StatusCode
}

var _ PolicyEvaluator = (*statusCodeFilter)(nil)

// NewStatusCodeFilter creates a policy evaluator that samples all traces with
// a given status code.
func NewStatusCodeFilter(logger *zap.Logger, statusCodeString []string) (PolicyEvaluator, error) {
	if len(statusCodeString) == 0 {
		return nil, errors.New("expected at least one status code to filter on")
	}

	statusCodes := make([]ptrace.StatusCode, len(statusCodeString))

	for i := range statusCodeString {
		switch statusCodeString[i] {
		case "OK":
			statusCodes[i] = ptrace.StatusCodeOk
		case "ERROR":
			statusCodes[i] = ptrace.StatusCodeError
		case "UNSET":
			statusCodes[i] = ptrace.StatusCodeUnset
		default:
			return nil, fmt.Errorf("unknown status code %q, supported: OK, ERROR, UNSET", statusCodeString[i])
		}
	}

	return &statusCodeFilter{
		logger:      logger,
		statusCodes: statusCodes,
	}, nil
}

// Evaluate looks at the trace data and returns a corresponding SamplingDecision.
func (r *statusCodeFilter) Evaluate(_ pcommon.TraceID, trace *TraceData) (Decision, error) {
	r.logger.Debug("Evaluating spans in status code filter")

	trace.Lock()
	batches := trace.ReceivedBatches
	trace.Unlock()

	return hasSpanWithCondition(batches, func(span ptrace.Span) bool {
		for _, statusCode := range r.statusCodes {
			if span.Status().Code() == statusCode {
				return true
			}
		}
		return false
	}), nil
}
