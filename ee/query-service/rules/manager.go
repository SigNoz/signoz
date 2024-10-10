package rules

import (
	"fmt"
	"time"

	baserules "go.signoz.io/signoz/pkg/query-service/rules"
)

func PrepareTaskFunc(opts baserules.PrepareTaskOptions) (baserules.Task, error) {

	rules := make([]baserules.Rule, 0)
	var task baserules.Task

	ruleId := baserules.RuleIdFromTaskName(opts.TaskName)
	if opts.Rule.RuleType == baserules.RuleTypeThreshold {
		// create a threshold rule
		tr, err := baserules.NewThresholdRule(
			ruleId,
			opts.Rule,
			opts.FF,
			opts.Reader,
			opts.UseLogsNewSchema,
			baserules.WithEvalDelay(opts.ManagerOpts.EvalDelay),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, tr)

		// create ch rule task for evalution
		task = newTask(baserules.TaskTypeCh, opts.TaskName, time.Duration(opts.Rule.Frequency), rules, opts.ManagerOpts, opts.NotifyFunc, opts.RuleDB)

	} else if opts.Rule.RuleType == baserules.RuleTypeProm {

		// create promql rule
		pr, err := baserules.NewPromRule(
			ruleId,
			opts.Rule,
			opts.Logger,
			opts.Reader,
			opts.ManagerOpts.PqlEngine,
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, pr)

		// create promql rule task for evalution
		task = newTask(baserules.TaskTypeProm, opts.TaskName, time.Duration(opts.Rule.Frequency), rules, opts.ManagerOpts, opts.NotifyFunc, opts.RuleDB)

	} else if opts.Rule.RuleType == baserules.RuleTypeAnomaly {
		// create anomaly rule
		ar, err := NewAnomalyRule(
			ruleId,
			opts.Rule,
			opts.FF,
			opts.Reader,
			opts.Cache,
			baserules.WithEvalDelay(opts.ManagerOpts.EvalDelay),
		)
		if err != nil {
			return task, err
		}

		rules = append(rules, ar)

		// create anomaly rule task for evalution
		task = newTask(baserules.TaskTypeCh, opts.TaskName, time.Duration(opts.Rule.Frequency), rules, opts.ManagerOpts, opts.NotifyFunc, opts.RuleDB)

	} else {
		return nil, fmt.Errorf("unsupported rule type %s. Supported types: %s, %s", opts.Rule.RuleType, baserules.RuleTypeProm, baserules.RuleTypeThreshold)
	}

	return task, nil
}

// newTask returns an appropriate group for
// rule type
func newTask(taskType baserules.TaskType, name string, frequency time.Duration, rules []baserules.Rule, opts *baserules.ManagerOptions, notify baserules.NotifyFunc, ruleDB baserules.RuleDB) baserules.Task {
	if taskType == baserules.TaskTypeCh {
		return baserules.NewRuleTask(name, "", frequency, rules, opts, notify, ruleDB)
	}
	return baserules.NewPromRuleTask(name, "", frequency, rules, opts, notify, ruleDB)
}
