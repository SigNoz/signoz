package sampling

import (
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.uber.org/zap"
)

type neverSample struct {
	logger *zap.Logger
}

var _ PolicyEvaluator = (*neverSample)(nil)

// NewNeverSample creates a policy evaluator the samples all traces.
func NewNeverSample(logger *zap.Logger) PolicyEvaluator {
	return &neverSample{
		logger: logger,
	}
}

// Evaluate looks at the trace data and returns a corresponding SamplingDecision.
func (aus *neverSample) Evaluate(pcommon.TraceID, *TraceData) (Decision, error) {
	aus.logger.Debug("Evaluating spans in never-sample filter")
	return NotSampled, nil
}
