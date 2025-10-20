package rules

import (
	"context"
	"fmt"

	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	baserules "github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func PrepareTaskFunc(opts baserules.PrepareTaskOptions) (baserules.Task, error) {

	rules := make([]baserules.Rule, 0)
	var task baserules.Task

	ruleId := baserules.RuleIdFromTaskName(opts.TaskName)
	evaluation, err := opts.Rule.Evaluation.GetEvaluation()
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "evaluation is invalid: %v", err)
	}
	if opts.Rule.RuleType == ruletypes.RuleTypeThreshold {
		// create a threshold rule
		tr, err := baserules.NewThresholdRule(
			ruleId,
			opts.OrgID,
			opts.Rule,
			opts.Reader,
			opts.Querier,
			opts.SLogger,
			baserules.WithEvalDelay(opts.ManagerOpts.EvalDelay),
			baserules.WithSQLStore(opts.SQLStore),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, tr)

		// create ch rule task for evalution
		task = newTask(baserules.TaskTypeCh, opts.TaskName, time.Duration(evaluation.GetFrequency()), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else if opts.Rule.RuleType == ruletypes.RuleTypeProm {

		// create promql rule
		pr, err := baserules.NewPromRule(
			ruleId,
			opts.OrgID,
			opts.Rule,
			opts.SLogger,
			opts.Reader,
			opts.ManagerOpts.Prometheus,
			baserules.WithSQLStore(opts.SQLStore),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, pr)

		// create promql rule task for evalution
		task = newTask(baserules.TaskTypeProm, opts.TaskName, time.Duration(evaluation.GetFrequency()), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else if opts.Rule.RuleType == ruletypes.RuleTypeAnomaly {
		// create anomaly rule
		ar, err := NewAnomalyRule(
			ruleId,
			opts.OrgID,
			opts.Rule,
			opts.Reader,
			opts.Querier,
			opts.SLogger,
			opts.Cache,
			baserules.WithEvalDelay(opts.ManagerOpts.EvalDelay),
			baserules.WithSQLStore(opts.SQLStore),
		)
		if err != nil {
			return task, err
		}

		rules = append(rules, ar)

		// create anomaly rule task for evalution
		task = newTask(baserules.TaskTypeCh, opts.TaskName, time.Duration(evaluation.GetFrequency()), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else {
		return nil, fmt.Errorf("unsupported rule type %s. Supported types: %s, %s", opts.Rule.RuleType, ruletypes.RuleTypeProm, ruletypes.RuleTypeThreshold)
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
	parsedRule.AlertName = fmt.Sprintf("%s%s", alertname, ruletypes.TestAlertPostFix)

	var rule baserules.Rule
	var err error

	if parsedRule.RuleType == ruletypes.RuleTypeThreshold {

		// add special labels for test alerts
		parsedRule.Labels[labels.RuleSourceLabel] = ""
		parsedRule.Labels[labels.AlertRuleIdLabel] = ""

		// create a threshold rule
		rule, err = baserules.NewThresholdRule(
			alertname,
			opts.OrgID,
			parsedRule,
			opts.Reader,
			opts.Querier,
			opts.SLogger,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
			baserules.WithSQLStore(opts.SQLStore),
		)

		if err != nil {
			zap.L().Error("failed to prepare a new threshold rule for test", zap.String("name", alertname), zap.Error(err))
			return 0, basemodel.BadRequest(err)
		}

	} else if parsedRule.RuleType == ruletypes.RuleTypeProm {

		// create promql rule
		rule, err = baserules.NewPromRule(
			alertname,
			opts.OrgID,
			parsedRule,
			opts.SLogger,
			opts.Reader,
			opts.ManagerOpts.Prometheus,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
			baserules.WithSQLStore(opts.SQLStore),
		)

		if err != nil {
			zap.L().Error("failed to prepare a new promql rule for test", zap.String("name", alertname), zap.Error(err))
			return 0, basemodel.BadRequest(err)
		}
	} else if parsedRule.RuleType == ruletypes.RuleTypeAnomaly {
		// create anomaly rule
		rule, err = NewAnomalyRule(
			alertname,
			opts.OrgID,
			parsedRule,
			opts.Reader,
			opts.Querier,
			opts.SLogger,
			opts.Cache,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
			baserules.WithSQLStore(opts.SQLStore),
		)
		if err != nil {
			zap.L().Error("failed to prepare a new anomaly rule for test", zap.String("name", alertname), zap.Error(err))
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
func newTask(taskType baserules.TaskType, name string, frequency time.Duration, rules []baserules.Rule, opts *baserules.ManagerOptions, notify baserules.NotifyFunc, maintenanceStore ruletypes.MaintenanceStore, orgID valuer.UUID) baserules.Task {
	if taskType == baserules.TaskTypeCh {
		return baserules.NewRuleTask(name, "", frequency, rules, opts, notify, maintenanceStore, orgID)
	}
	return baserules.NewPromRuleTask(name, "", frequency, rules, opts, notify, maintenanceStore, orgID)
}
