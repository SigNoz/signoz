package signoztailsampler

import (
	"sort"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler/internal/sampling"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.uber.org/zap"
)

// default evaluator for policyCfg.
type defaultEvaluator struct {
	name string

	priority int

	// in case probalistic sampling to be done when filter matches
	sampler sampling.PolicyEvaluator

	// can be probabilistic, always_include, always_exclude
	samplingMethod string

	// filter operator can be "and" | "or". empty resolves to or
	filterOperator string
	filters        []sampling.PolicyEvaluator

	// the subpolicy evaluators will be processed in order of priority.
	// the sub-policies will be evaluated prior to evaluating top-level policy,
	// if any of subpolicy filters match, the sampling method associated with that
	// sub-policy will be applied. and no further processing will be performed.
	subEvaluators []sampling.PolicyEvaluator
	logger        *zap.Logger
}

func NewDefaultEvaluator(logger *zap.Logger, policyCfg BasePolicy, subpolicies []BasePolicy) sampling.PolicyEvaluator {

	// condition operator to apply on filters (AND | OR)
	filterOperator := policyCfg.PolicyFilterCfg.FilterOp

	// list of filter evaluators used to decide if this policy
	// should be applied
	filters := prepareFilterEvaluators(logger, policyCfg.PolicyFilterCfg)
	// todo(amol): need to handle situations with zero filters

	// list of sub-policies evaluators
	sort.Slice(subpolicies, func(i, j int) bool {
		return subpolicies[i].Priority < subpolicies[j].Priority
	})

	subEvaluators := make([]sampling.PolicyEvaluator, 0)
	for _, subRule := range subpolicies {
		subEvaluator := NewDefaultEvaluator(logger, subRule, nil)
		subEvaluators = append(subEvaluators, subEvaluator)
	}

	// sampling is applied only when filter conditions are met
	var sampler sampling.PolicyEvaluator
	var samplingMethod string

	// todo(amol): need to handle cases where percent is not set by
	// the user
	switch policyCfg.SamplingPercentage {
	case 0:
		samplingMethod = "exclude_all"
		sampler = sampling.NewNeverSample(logger)
	case 100:
		samplingMethod = "include_all"
		sampler = sampling.NewAlwaysSample(logger)
	default:
		samplingMethod = "probabilistic"
		sampler = sampling.NewProbabilisticSampler(logger, "", policyCfg.SamplingPercentage)
	}

	return &defaultEvaluator{
		name:           policyCfg.Name,
		sampler:        sampler,
		samplingMethod: samplingMethod,
		filterOperator: filterOperator,
		filters:        filters,
		subEvaluators:  subEvaluators,
	}
}

func prepareFilterEvaluators(logger *zap.Logger, policyFilterCfg PolicyFilterCfg) []sampling.PolicyEvaluator {
	var filterEvaluators []sampling.PolicyEvaluator
	for _, s := range policyFilterCfg.StringAttributeCfgs {
		filterEvaluators = append(filterEvaluators, sampling.NewStringAttributeFilter(logger, s.Key, s.Values, s.EnabledRegexMatching, s.CacheMaxSize, s.InvertMatch))
	}

	for _, n := range policyFilterCfg.NumericAttributeCfgs {
		filterEvaluators = append(filterEvaluators, sampling.NewNumericAttributeFilter(logger, n.Key, n.MinValue, n.MaxValue))
	}
	return filterEvaluators
}

// Evaluate executes policy filter first to determine if the policy applies to current trace data	 
// and if it succeeds, then sampling is performed based on sampling params set on the
// selected policy. This method works for both root and sub-policies.
func (de *defaultEvaluator) Evaluate(traceId pcommon.TraceID, trace *sampling.TraceData) (sampling.Decision, error) {

	// capture if any of the filter in current policy matches
	var filterMatched bool

	for _, fe := range de.filters {
		// evaluate each filter from (sub-)policy
		filterResult, err := fe.Evaluate(traceId, trace)
		if err != nil {
			return sampling.Error, nil
		}
		// since filters can also be sampling evaluators,
		// here we consider "sampled = filter matched" and
		// "no sampled == filter did not match"

		if filterResult == sampling.Sampled {
			filterMatched = true
		}

		if filterResult == sampling.NotSampled {
			if strings.ToLower(de.filterOperator) == "and" {
				// filter condition failed, return no op
				// filter operator AND indcates all the filter condition
				// must return a sample decision
				return sampling.NoResult, nil
			}
		}
	}

	if filterMatched {

		// here we evaluate sub-policies sequentially. and if any
		// of them succeed we return that as sampling decision
		for _, sp := range de.subEvaluators {
			if sp == nil {
				zap.S().Errorf("failed to evaluate subpolicy as evaluator is nil %s", de.name)
				continue
			}
			decision, err := sp.Evaluate(traceId, trace)
			if err != nil {
				// todo: consider adding health for each evaluator
				// to avoid printing log messages for each trace
				zap.S().Errorf("failed to evaluate trace:", de.name)
				continue
			}

			// check if sub-policy evaluation has a useful result else continue
			// to next
			if decision != sampling.NoResult {
				// found a result, exit
				return decision, nil
			}
		}

		// filter conditions matched, we can
		// apply sampling now
		return de.sampler.Evaluate(traceId, trace)

	}

	return sampling.NoResult, nil
}
