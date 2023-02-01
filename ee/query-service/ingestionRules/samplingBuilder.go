package ingestionRules

import (
	"fmt"
	"sort"

	"go.signoz.io/signoz/ee/query-service/model"
	"go.uber.org/zap"

	tsp "github.com/open-telemetry/opentelemetry-collector-contrib/processor/tailsamplingprocessor"
)

// PrepareTailSamplingParams transforms sampling rules into tail sampler processor config
func PrepareTailSamplingParams(rules []model.IngestionRule) (*tsp.Config, error) {

	if len(rules) == 0 {
		// no rules setup, configure always sample policy
		// which allows all records to pass-through and no dropouts
		return &tsp.Config{PolicyCfgs: prepareDefaultPolicy()}, nil
	}

	// keep root level policies  [condition.ID] = policy cnfg
	// this will be useful in debugging. we can not use this for final
	// config construction as we need sorting of policies the order of priority
	policies := make(map[string][]tsp.PolicyCfg, 0)

	// we want the order to be maintained, so a list
	var finalPolicy []tsp.PolicyCfg

	sort.Sort(model.IngestionRulesByPriority(rules))

	for _, root := range rules {
		if root.RuleType != model.IngestionRuleTypeSampling || root.Config == nil {
			continue
		}
		rootConfig := root.Config.SamplingConfig
		conditions := rootConfig.Conditions

		if len(rootConfig.FilterSet.Items) != 1 {
			// we do not support, roots with more than on one condition
			continue
		}

		// root would only support on filter item. here we only
		// construct root policy but it will be added to the final config
		// only if a default condition exists. this is because root policy
		// does not sampling method or percent
		rootFilter := rootConfig.FilterSet.Items[0]
		rootFilterVals := rootFilter.Value.([]string)
		rootPolicy := prepareStringPolicy(fmt.Sprintf("root-%s", root.Id), rootFilter.Key, rootFilterVals)

		if len(conditions) == 0 {
			zap.S().Warnf("found a sampling rule with empty condtion, skipping the condition", rootConfig.Name)
			continue
		}

		// sort conditions to order by priority and move default to the end
		sort.Sort(model.SamplingConfigByPriority(conditions))

		for _, condition := range conditions {
			if condition.Default {
				// default will usually have the last priority, it is else case
				defaultPolicies := []tsp.PolicyCfg{}

				// use root policy for default condition
				defaultPolicies = append(defaultPolicies, rootPolicy)

				defaultPolicies = append(defaultPolicies, prepareProbabilistic(condition.ID, condition.SamplingPercent))
				policies[condition.ID] = defaultPolicies

				finalPolicy = append(finalPolicy, defaultPolicies...)

			} else {

				// list of policy for each filter item in a condition
				// e.g. conditions may have multiple filters like
				// service = 'ABC' AND host = 'server-1'
				// currently, support only AND conditions

				filterSetPolicies := make([]tsp.PolicyCfg, len(condition.FilterSet.Items))

				if len(condition.FilterSet.Items) != 0 {

					// make policy for each filter in the condition
					for i, filter := range condition.FilterSet.Items {
						vals := filter.Value.([]string)
						filterPolicy := prepareStringPolicy(fmt.Sprintf("filter-%s-%d", condition.ID, i), filter.Key, vals)

						filterSetPolicies = append(filterSetPolicies, filterPolicy)
					}

					conditionPolicy := []tsp.PolicyCfg{}

					// use root policy for default condition
					conditionPolicy = append(conditionPolicy, rootPolicy)

					conditionPolicy = append(conditionPolicy, filterSetPolicies...)

					if condition.SamplingMethod == model.SamplingMethodProbabilistic {
						conditionPolicy = append(conditionPolicy, prepareProbabilistic(fmt.Sprintf("filter-%s-percent", condition.ID), condition.SamplingPercent))
					}

					policies[condition.ID] = conditionPolicy
					finalPolicy = append(finalPolicy, conditionPolicy...)
				}
			} // end if condition.Default
		} // end for loop conditions
	}

	zap.S().Debugf("generated sampling policies:", policies)
	zap.S().Debugf("sorted sampling policies:", finalPolicy)

	return &tsp.Config{
		PolicyCfgs: finalPolicy,
	}, nil
}

func prepareProbabilistic(id string, percent int) tsp.PolicyCfg {

	return tsp.PolicyCfg{
		SharedPolicyCfg: tsp.SharedPolicyCfg{
			Name: id,
			Type: tsp.Probabilistic,
			ProbabilisticCfg: tsp.ProbabilisticCfg{
				SamplingPercentage: float64(percent),
			},
		},
	}
}

func prepareDefaultPolicy() []tsp.PolicyCfg {
	return []tsp.PolicyCfg{
		tsp.PolicyCfg{
			SharedPolicyCfg: tsp.SharedPolicyCfg{
				Name: "default",
				Type: tsp.AlwaysSample,
			},
		},
	}
}

func prepareAndPolicy(id string, subPolicies []tsp.PolicyCfg) tsp.PolicyCfg {
	var andSubPolicies []tsp.AndSubPolicyCfg
	for _, sp := range subPolicies {
		andSubPolicies = append(andSubPolicies, tsp.AndSubPolicyCfg{
			SharedPolicyCfg: sp.SharedPolicyCfg,
		})
	}

	return tsp.PolicyCfg{
		SharedPolicyCfg: tsp.SharedPolicyCfg{
			Name: id,
			Type: tsp.And,
		},
		AndCfg: tsp.AndCfg{SubPolicyCfg: andSubPolicies},
	}
}

func prepareStringPolicy(id string, key string, vals []string) tsp.PolicyCfg {
	return tsp.PolicyCfg{
		SharedPolicyCfg: tsp.SharedPolicyCfg{
			Name: id,
			Type: tsp.StringAttribute,
			StringAttributeCfg: tsp.StringAttributeCfg{
				Key:    key,
				Values: vals,
				// todo
				// EnabledRegexMatching: use key.Ope for this
				// InvertMatch: use key.Op for this
			},
		},
	}
}
