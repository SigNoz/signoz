package ingestionRules

import (
	"sort"
	"strings"

	"go.signoz.io/signoz/ee/query-service/model"
	"go.uber.org/zap"

	tsp "github.com/open-telemetry/opentelemetry-collector-contrib/processor/tailsamplingprocessor"
)

func preparePolicycfg(config model.SamplingConfig) tsp.PolicyCfg {
	policy := tsp.PolicyCfg{
		Root:       true,
		Name:       config.Name,
		Priority:   config.Priority,
		PolicyType: tsp.PolicyGroup,
		PolicyFilterCfg: tsp.PolicyFilterCfg{
			StringAttributeCfgs:  []tsp.StringAttributeCfg{},
			NumericAttributeCfgs: []tsp.NumericAttributeCfg{},
		},
	}

	// assign root filter operator
	if strings.ToLower(config.FilterSet.Operator) == "and" {
		policy.FilterOp = "AND"
	}
	if strings.ToLower(config.FilterSet.Operator) == "or" {
		policy.FilterOp = "OR"
	}

	// assign root filter conditions
	for _, f := range config.FilterSet.Items {

		switch v := f.Value.(type) {
		case string:
			value := f.Value.(string)
			policy.StringAttributeCfgs = append(policy.StringAttributeCfgs, tsp.StringAttributeCfg{Key: f.Key, Values: value})
		case []string:
			values := f.Value.([]string)
			policy.StringAttributeCfgs = append(policy.StringAttributeCfgs, tsp.StringAttributeCfg{Key: f.Key, Values: values})
		case int:
			value := f.Value.(int)
			policy.NumericAttributeCfgs = append(policy.NumericAttributeCfgs, tsp.NumericAttributeCfg{Key: f.Key, Values: value})
		case float64:
			value := f.Value.(float64)
			policy.NumericAttributeCfgs = append(policy.NumericAttributeCfgs, tsp.NumericAttributeCfg{Key: f.Key, Values: value})
		case float32:
			value := f.Value.(float32)
			policy.NumericAttributeCfgs = append(policy.NumericAttributeCfgs, tsp.NumericAttributeCfg{Key: f.Key, Values: value})
		}
	}

	policy.ProbabilisticCfg = tsp.ProbabilisticCfg{
		// HashSalt: //
		SamplingPercentage: config.SamplingPercent,
	}

	return policy
}

func isPolicyCfgOk(p tsp.PolicyCfg) bool {
	// todo: added more validations for policy config
	return true
}

// PrepareTailSamplingParams transforms sampling rules into tail sampler processor config
func PrepareTailSamplingParams(rules []model.IngestionRule) (*tsp.Config, error) {

	if len(rules) == 0 {
		// no rules setup, configure always sample policy
		// which allows all records to pass-through and no dropouts
		return &tsp.Config{PolicyCfgs: prepareDefaultPolicy()}, nil
	}

	// we want the order to be maintained, so a list
	var finalPolicies []tsp.PolicyCfg

	sort.Sort(model.IngestionRulesByPriority(rules))

	for _, root := range rules {
		if root.RuleType != model.IngestionRuleTypeSampling || root.Config == nil {
			continue
		}
		rootConfig := root.Config.SamplingConfig
		conditions := rootConfig.Conditions

		rootPolicy := preparePolicyCfg(rootConfig)

		if len(conditions) == 0 {
			zap.S().Warnf("found a sampling rule with no default condtion, skipping the policy", rootConfig.Name)
			continue
		}

		// build sub-policies for conditions

		// first, sort conditions to order by priority and move default to the end
		sort.Sort(model.SamplingConfigByPriority(conditions))

		for _, condition := range conditions {

			if condition.Default {
				rootPolicy.ProbabilisticCfg = tsp.ProbabilisticCfg{
					// HashSalt: //
					SamplingPercentage: condition.SamplingPercent,
				}
				continue
			}

			// prepare subpolicy for this condition
			rootPolicy.subPolicies = append(rootPolicy.subPolicies, preparePolicycfg(condition))

		} // end for loop conditions

		if isPolicyCfgOk(rootPolicy) {
			finalPolicies = append(finalPolicies, rootPolicy)
		}
	}

	zap.S().Debugf("sorted sampling policies:", finalPolicies)

	return &tsp.Config{
		PolicyCfgs: finalPolicies,
	}, nil
}
