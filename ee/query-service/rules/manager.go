package rules

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	baserules "go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.uber.org/zap"
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
			opts.UseTraceNewSchema,
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

// TestNotification prepares a dummy rule for given rule parameters and
// sends a test notification. returns alert count and error (if any)
func TestNotification(opts baserules.PrepareTestRuleOptions) (int, *basemodel.ApiError) {

	ctx := context.Background()

	if opts.Rule == nil {
		return 0, basemodel.BadRequest(fmt.Errorf("rule is required"))
	}

	parsedRule := opts.Rule
	var alertname = parsedRule.AlertName
	if alertname == "" {
		// alertname is not mandatory for testing, so picking
		// a random string here
		alertname = uuid.New().String()
	}

	// append name to indicate this is test alert
	parsedRule.AlertName = fmt.Sprintf("%s%s", alertname, baserules.TestAlertPostFix)

	var rule baserules.Rule
	var err error

	if parsedRule.RuleType == baserules.RuleTypeThreshold {

		// add special labels for test alerts
		parsedRule.Annotations[labels.AlertSummaryLabel] = fmt.Sprintf("The rule threshold is set to %.4f, and the observed metric value is {{$value}}.", *parsedRule.RuleCondition.Target)
		parsedRule.Labels[labels.RuleSourceLabel] = ""
		parsedRule.Labels[labels.AlertRuleIdLabel] = ""

		// create a threshold rule
		rule, err = baserules.NewThresholdRule(
			alertname,
			parsedRule,
			opts.FF,
			opts.Reader,
			opts.UseLogsNewSchema,
			opts.UseTraceNewSchema,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
		)

		if err != nil {
			zap.L().Error("failed to prepare a new threshold rule for test", zap.String("name", rule.Name()), zap.Error(err))
			return 0, basemodel.BadRequest(err)
		}

	} else if parsedRule.RuleType == baserules.RuleTypeProm {

		// create promql rule
		rule, err = baserules.NewPromRule(
			alertname,
			parsedRule,
			opts.Logger,
			opts.Reader,
			opts.ManagerOpts.PqlEngine,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
		)

		if err != nil {
			zap.L().Error("failed to prepare a new promql rule for test", zap.String("name", rule.Name()), zap.Error(err))
			return 0, basemodel.BadRequest(err)
		}
	} else if parsedRule.RuleType == baserules.RuleTypeAnomaly {
		// create anomaly rule
		rule, err = NewAnomalyRule(
			alertname,
			parsedRule,
			opts.FF,
			opts.Reader,
			opts.Cache,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
		)
		if err != nil {
			zap.L().Error("failed to prepare a new anomaly rule for test", zap.String("name", rule.Name()), zap.Error(err))
			return 0, basemodel.BadRequest(err)
		}
	} else {
		return 0, basemodel.BadRequest(fmt.Errorf("failed to derive ruletype with given information"))
	}

	// set timestamp to current utc time
	ts := time.Now().UTC()

	count, err := rule.Eval(ctx, ts)
	if err != nil {
		zap.L().Error("evaluating rule failed", zap.String("rule", rule.Name()), zap.Error(err))
		return 0, basemodel.InternalError(fmt.Errorf("rule evaluation failed"))
	}
	alertsFound, ok := count.(int)
	if !ok {
		return 0, basemodel.InternalError(fmt.Errorf("something went wrong"))
	}
	rule.SendAlerts(ctx, ts, 0, time.Duration(1*time.Minute), opts.NotifyFunc)

	return alertsFound, nil
}

// newTask returns an appropriate group for
// rule type
func newTask(taskType baserules.TaskType, name string, frequency time.Duration, rules []baserules.Rule, opts *baserules.ManagerOptions, notify baserules.NotifyFunc, ruleDB baserules.RuleDB) baserules.Task {
	if taskType == baserules.TaskTypeCh {
		return baserules.NewRuleTask(name, "", frequency, rules, opts, notify, ruleDB)
	}
	return baserules.NewPromRuleTask(name, "", frequency, rules, opts, notify, ruleDB)
}
