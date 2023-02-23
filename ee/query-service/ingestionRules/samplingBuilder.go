package ingestionRules

import (
	"sort"
	"strings"
	"time"

	"go.signoz.io/signoz/ee/query-service/model"
	"go.uber.org/zap"

	tsp "go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/tailsampler"
)

func preparePolicycfg(config model.SamplingConfig) tsp.PolicyCfg {
	policy := tsp.PolicyCfg{
		Root:     true,
		Name:     config.Name,
		Priority: config.Priority,
		Type:     "policy_group",
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

		switch f.Value.(type) {
		case string:
			value := f.Value.(string)
			policy.StringAttributeCfgs = append(policy.StringAttributeCfgs, tsp.StringAttributeCfg{Key: f.Key, Values: []string{value}})
		case []string:
			values := f.Value.([]string)
			policy.StringAttributeCfgs = append(policy.StringAttributeCfgs, tsp.StringAttributeCfg{Key: f.Key, Values: values})
		case int, int32, int64:
			value := f.Value.(int)
			policy.NumericAttributeCfgs = append(policy.NumericAttributeCfgs, tsp.NumericAttributeCfg{Key: f.Key, MinValue: int64(value), MaxValue: int64(value)})
		case float64:
			// improvement: currrently only int64 is supported by tail based sampler, add float64 support
			value := f.Value.(float64)
			policy.NumericAttributeCfgs = append(policy.NumericAttributeCfgs, tsp.NumericAttributeCfg{Key: f.Key, MinValue: int64(value), MaxValue: int64(value)})
		case float32:
			// improvement: currrently only int64 is supported by tail based sampler, add float32 support
			value := f.Value.(float32)
			policy.NumericAttributeCfgs = append(policy.NumericAttributeCfgs, tsp.NumericAttributeCfg{Key: f.Key, MinValue: int64(value), MaxValue: int64(value)})
		}
	}

	policy.ProbabilisticCfg = tsp.ProbabilisticCfg{
		// HashSalt: //
		SamplingPercentage: float64(config.SamplingPercent),
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
		return &tsp.Config{}, nil
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

		rootPolicy := preparePolicycfg(rootConfig)

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
					SamplingPercentage: float64(condition.SamplingPercent),
				}
				continue
			}

			// prepare subpolicy for this condition
			rootPolicy.SubPolicies = append(rootPolicy.SubPolicies, preparePolicycfg(condition))

		} // end for loop conditions

		if isPolicyCfgOk(rootPolicy) {
			finalPolicies = append(finalPolicies, rootPolicy)
		}
	}

	zap.S().Debugf("sorted sampling policies:", finalPolicies)

	return &tsp.Config{
		DecisionWait: 30 * time.Second,
		NumTraces:    50000,
		PolicyCfgs:   finalPolicies,
	}, nil
}
