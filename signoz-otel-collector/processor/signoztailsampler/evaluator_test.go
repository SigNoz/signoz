package signoztailsampler

import (
	"encoding/binary"
	"testing"
	"time"

	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler/internal/sampling"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/atomic"
	"go.uber.org/zap"
)

func TestDefaultEvaluator(t *testing.T) {
	cfg := PolicyGroupCfg{
		BasePolicy: BasePolicy{Name: "security",
			ProbabilisticCfg: ProbabilisticCfg{
				SamplingPercentage: 100,
			},
			PolicyFilterCfg: PolicyFilterCfg{
				StringAttributeCfgs: []StringAttributeCfg{
					{
						Key:    "source",
						Values: []string{"audit"},
					},
				},
			},
		},
	}

	e := NewDefaultEvaluator(zap.NewNop(), cfg.BasePolicy, cfg.SubPolicies)
	traceIds, traces := generateTraceForTestEval(1, "source", "audit")

	eval := func(id pcommon.TraceID, td ptrace.Traces) (sampling.Decision, error) {
		// store initiat decision for each policy
		initialDecisions := make([]sampling.Decision, 1)
		// there is only one policy, so set initiatDecisions
		// for this policy to pending
		initialDecisions[0] = sampling.Pending

		traceData := &sampling.TraceData{
			Decisions:       initialDecisions,
			ArrivalTime:     time.Now(),
			SpanCount:       atomic.NewInt64(1),
			ReceivedBatches: td,
		}

		return e.Evaluate(id, traceData)
	}

	decision, err := eval(traceIds[0], traces[0])

	require.NoError(t, err, "failed to evalute trace for policy")
	require.Equal(t, sampling.Sampled, decision, "expected to sample a valid trace as per policy")

	traceIds1, traces1 := generateTraceForTestEval(1, "source", "none")
	decision1, err1 := eval(traceIds1[0], traces1[0])

	require.NoError(t, err1, "failed to evalute trace for policy")
	require.Equal(t, sampling.NoResult, decision1, "expected to not sampled decision for trace as per policy")
}

func TestProbablisticCfg(t *testing.T) {
	cfg := PolicyGroupCfg{
		BasePolicy: BasePolicy{
			Name: "security",
			ProbabilisticCfg: ProbabilisticCfg{
				SamplingPercentage: 100,
			},
			PolicyFilterCfg: PolicyFilterCfg{
				StringAttributeCfgs: []StringAttributeCfg{
					{
						Key:    "source",
						Values: []string{"audit"},
					},
				},
			},
		},
	}

	e := NewDefaultEvaluator(zap.NewNop(), cfg.BasePolicy, nil)
	traceIds, traces := generateTraceForTestEval(1, "source", "audit")

	eval := func(e sampling.PolicyEvaluator, id pcommon.TraceID, td ptrace.Traces) (sampling.Decision, error) {
		// store initiat decision for each policy
		initialDecisions := make([]sampling.Decision, 1)
		// there is only one policy, so set initiatDecisions
		// for this policy to pending
		initialDecisions[0] = sampling.Pending

		traceData := &sampling.TraceData{
			Decisions:       initialDecisions,
			ArrivalTime:     time.Now(),
			SpanCount:       atomic.NewInt64(1),
			ReceivedBatches: td,
		}

		return e.Evaluate(id, traceData)
	}

	decision, err := eval(e, traceIds[0], traces[0])

	require.NoError(t, err, "failed to evalute trace for policy")
	require.Equal(t, sampling.Sampled, decision, "expected to sample a valid trace as per policy")

	cfg.SamplingPercentage = 0
	zeroSamplingEvaluator := NewDefaultEvaluator(zap.NewNop(), cfg.BasePolicy, cfg.SubPolicies)
	decision1, err1 := eval(zeroSamplingEvaluator, traceIds[0], traces[0])

	require.NoError(t, err1, "failed to evaluate trace for policy with zero sampling")
	require.Equal(t, sampling.NotSampled, decision1, "expected to not sampled as sampling percent is zero")

	cfg.SamplingPercentage = 99
	evaluator99 := NewDefaultEvaluator(zap.NewNop(), cfg.BasePolicy, cfg.SubPolicies)
	decision99, err99 := eval(evaluator99, traceIds[0], traces[0])

	require.NoError(t, err99, "failed to evaluate trace for policy with 99 percent sampling")
	require.Equal(t, sampling.Sampled, decision99, "expected to sampled as sampling percent is 99, re-run the test to try again")
}

func TestSubPolicyGroupCfg(t *testing.T) {
	// this policy will omit all records with source audit (as sampling percent is 0 for root)
	// except those filtered by sub-policy (which has sampling percent 100)

	cfg := PolicyGroupCfg{
		BasePolicy: BasePolicy{
			Name: "security",
			ProbabilisticCfg: ProbabilisticCfg{
				SamplingPercentage: 0,
			},
			PolicyFilterCfg: PolicyFilterCfg{
				StringAttributeCfgs: []StringAttributeCfg{
					{
						Key:    "source",
						Values: []string{"audit"},
					},
				},
			}},
		SubPolicies: []BasePolicy{
			{
				Name: "sub-policy",
				ProbabilisticCfg: ProbabilisticCfg{
					SamplingPercentage: 100,
				},
				PolicyFilterCfg: PolicyFilterCfg{
					StringAttributeCfgs: []StringAttributeCfg{
						{
							Key:    "threat",
							Values: []string{"true"},
						},
					},
				},
			},
		},
	}

	e := NewDefaultEvaluator(zap.NewNop(), cfg.BasePolicy, cfg.SubPolicies)
	decision, err := e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"source", "threat"}, []string{"audit", "true"}))

	assert.Nil(t, err, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.Sampled, decision, "expected sampling decision as sub-policy matches")

	failCase, err1 := e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"source", "threat"}, []string{"audit", "false"}))

	assert.Nil(t, err1, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.NotSampled, failCase, "expected NotSampled decision as sub-policy does not match and root has sampling percent 0")

}

func TestSubPolicyGroupCfgStringFilters(t *testing.T) {
	// this policy will omit all records with source audit (as sampling percent is 0 for root)
	// except those filtered by sub-policy (which has sampling percent 100)

	cfg := PolicyGroupCfg{
		BasePolicy: BasePolicy{
			Name: "security",
			ProbabilisticCfg: ProbabilisticCfg{
				SamplingPercentage: 0,
			},
			PolicyFilterCfg: PolicyFilterCfg{
				StringAttributeCfgs: []StringAttributeCfg{
					{
						Key:    "source",
						Values: []string{"audit"},
					},
				},
			},
		},
		SubPolicies: []BasePolicy{
			{
				Name: "sub-policy",
				ProbabilisticCfg: ProbabilisticCfg{
					SamplingPercentage: 100,
				},
				PolicyFilterCfg: PolicyFilterCfg{
					FilterOp: "and",
					StringAttributeCfgs: []StringAttributeCfg{
						{
							Key:    "threat",
							Values: []string{"true"},
						},
						{
							Key:    "website",
							Values: []string{"true"},
						},
					},
				},
			},
		},
	}

	e := NewDefaultEvaluator(zap.NewNop(), cfg.BasePolicy, cfg.SubPolicies)
	decision, err := e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"source", "threat", "website"}, []string{"audit", "true", "true"}))

	assert.Nil(t, err, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.Sampled, decision, "expected sampling decision as sub-policy matches")

	missingAttrs, err := e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"source", "threat"}, []string{"audit", "true"}))

	assert.Nil(t, err, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.NotSampled, missingAttrs, "expected NotSampled decision")

	failCase, err := e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"source", "threat"}, []string{"audit", "false"}))

	assert.Nil(t, err, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.NotSampled, failCase, "expected NotSampled decision as sub-policy does not match and root has sampling percent 0")

}

func TestRootPolicyNotMatch(t *testing.T) {
	// this policy will omit all records with source audit (as sampling percent is 0 for root)
	// except those filtered by sub-policy (which has sampling percent 100)

	cfg := PolicyGroupCfg{
		BasePolicy: BasePolicy{Name: "security",
			ProbabilisticCfg: ProbabilisticCfg{
				SamplingPercentage: 100,
			},
			PolicyFilterCfg: PolicyFilterCfg{
				StringAttributeCfgs: []StringAttributeCfg{
					{
						Key:    "source",
						Values: []string{"audit"},
					},
				},
			}},
		SubPolicies: []BasePolicy{
			{
				Name: "sub-policy",
				ProbabilisticCfg: ProbabilisticCfg{
					SamplingPercentage: 100,
				},
				PolicyFilterCfg: PolicyFilterCfg{
					StringAttributeCfgs: []StringAttributeCfg{
						{
							Key:    "threat",
							Values: []string{"true"},
						},
						{
							Key:    "website",
							Values: []string{"true"},
						},
					},
				},
			},
		},
	}

	e := NewDefaultEvaluator(zap.NewNop(), cfg.BasePolicy, nil)

	decision, err := e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"threat", "website"}, []string{"true", "true"}))

	assert.Nil(t, err, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.NoResult, decision, "expected no result - sub-policy match to fail as root policy failed")

	decision, err = e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"source", "threat", "website"}, []string{"unknown", "true", "true"}))

	assert.Nil(t, err, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.NoResult, decision, "expected no result - sub-policy match to fail as root policy attrib does not match")

	decision, err = e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"source", "threat", "website"}, []string{"audit", "true", "true"}))

	assert.Nil(t, err, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.Sampled, decision, "expected sampled decision as subpolicy and root policy filter match")

	decision, err = e.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
		16}), newTraceStringAttrs(nil, []string{"source", "threat"}, []string{"audit", "false"}))

	assert.Nil(t, err, "expected evaluation to complete successfully")
	assert.Equal(t, sampling.Sampled, decision, "expected sampled decision as root policy filters matches event if subpolicy doesnt")

}

func newTraceStringAttrs(nodeAttrs map[string]interface{}, spanAttrKey []string, spanAttrValue []string) *sampling.TraceData {
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	//nolint:errcheck
	rs.Resource().Attributes().FromRaw(nodeAttrs)
	ils := rs.ScopeSpans().AppendEmpty()
	span := ils.Spans().AppendEmpty()
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
	for i, _ := range spanAttrKey {
		span.Attributes().PutStr(spanAttrKey[i], spanAttrValue[i])
	}

	return &sampling.TraceData{
		ReceivedBatches: traces,
	}
}
func generateTraceForTestEval(numIds int, key string, value string) ([]pcommon.TraceID, []ptrace.Traces) {
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
			span.Attributes().PutStr(key, value)
			spanID++
			span.SetSpanID(uInt64ToSpanID(uint64(spanID)))
			tds = append(tds, td)
		}
	}

	return traceIds, tds
}
