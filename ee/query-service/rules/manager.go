package rules

import (
	"context"
	"fmt"

	"time"

	"log/slog"

	"github.com/google/uuid"

	"github.com/SigNoz/signoz/pkg/errors"
	baserules "github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func PrepareTaskFunc(opts baserules.PrepareTaskOptions) (baserules.Task, error) {

	rules := make([]baserules.Rule, 0)
	var task baserules.Task

	ruleID := baserules.RuleIDFromTaskName(opts.TaskName)
	evaluation, err := opts.Rule.Evaluation.GetEvaluation()
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "evaluation is invalid: %v", err)
	}

	if opts.Rule.RuleType == ruletypes.RuleTypeThreshold {
		// create a threshold rule
		tr, err := baserules.NewThresholdRule(
			ruleID,
			opts.OrgID,
			opts.Rule,
			opts.Querier,
			opts.Logger,
			baserules.WithEvalDelay(opts.ManagerOpts.EvalDelay),
			baserules.WithSQLStore(opts.SQLStore),
			baserules.WithQueryParser(opts.ManagerOpts.QueryParser),
			baserules.WithMetadataStore(opts.ManagerOpts.MetadataStore),
			baserules.WithRuleStateHistoryModule(opts.ManagerOpts.RuleStateHistoryModule),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, tr)

		// create ch rule task for evaluation
		task = newTask(baserules.TaskTypeCh, opts.TaskName, evaluation.GetFrequency().Duration(), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else if opts.Rule.RuleType == ruletypes.RuleTypeProm {

		// create promql rule
		pr, err := baserules.NewPromRule(
			ruleID,
			opts.OrgID,
			opts.Rule,
			opts.Logger,
			opts.ManagerOpts.Prometheus,
			baserules.WithSQLStore(opts.SQLStore),
			baserules.WithQueryParser(opts.ManagerOpts.QueryParser),
			baserules.WithMetadataStore(opts.ManagerOpts.MetadataStore),
			baserules.WithRuleStateHistoryModule(opts.ManagerOpts.RuleStateHistoryModule),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, pr)

		// create promql rule task for evaluation
		task = newTask(baserules.TaskTypeProm, opts.TaskName, evaluation.GetFrequency().Duration(), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else if opts.Rule.RuleType == ruletypes.RuleTypeAnomaly {
		// create anomaly rule
		ar, err := NewAnomalyRule(
			ruleID,
			opts.OrgID,
			opts.Rule,
			opts.Querier,
			opts.Logger,
			baserules.WithEvalDelay(opts.ManagerOpts.EvalDelay),
			baserules.WithSQLStore(opts.SQLStore),
			baserules.WithQueryParser(opts.ManagerOpts.QueryParser),
			baserules.WithMetadataStore(opts.ManagerOpts.MetadataStore),
			baserules.WithRuleStateHistoryModule(opts.ManagerOpts.RuleStateHistoryModule),
		)
		if err != nil {
			return task, err
		}

		rules = append(rules, ar)

		// create anomaly rule task for evaluation
		task = newTask(baserules.TaskTypeCh, opts.TaskName, evaluation.GetFrequency().Duration(), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported rule type %s. Supported types: %s, %s", opts.Rule.RuleType, ruletypes.RuleTypeProm, ruletypes.RuleTypeThreshold)
	}

	return task, nil
}

// TestNotification prepares a dummy rule for given rule parameters and
// sends a test notification. returns alert count and error (if any)
func TestNotification(opts baserules.PrepareTestRuleOptions) (int, error) {

	ctx := context.Background()

	if opts.Rule == nil {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "rule is required")
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
		parsedRule.Labels[ruletypes.RuleSourceLabel] = ""
		parsedRule.Labels[ruletypes.AlertRuleIDLabel] = ""

		// create a threshold rule
		rule, err = baserules.NewThresholdRule(
			alertname,
			opts.OrgID,
			parsedRule,
			opts.Querier,
			opts.Logger,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
			baserules.WithSQLStore(opts.SQLStore),
			baserules.WithQueryParser(opts.ManagerOpts.QueryParser),
			baserules.WithMetadataStore(opts.ManagerOpts.MetadataStore),
		)

		if err != nil {
			slog.Error("failed to prepare a new threshold rule for test", "name", alertname, errors.Attr(err))
			return 0, err
		}

	} else if parsedRule.RuleType == ruletypes.RuleTypeProm {

		// create promql rule
		rule, err = baserules.NewPromRule(
			alertname,
			opts.OrgID,
			parsedRule,
			opts.Logger,
			opts.ManagerOpts.Prometheus,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
			baserules.WithSQLStore(opts.SQLStore),
			baserules.WithQueryParser(opts.ManagerOpts.QueryParser),
			baserules.WithMetadataStore(opts.ManagerOpts.MetadataStore),
		)

		if err != nil {
			slog.Error("failed to prepare a new promql rule for test", "name", alertname, errors.Attr(err))
			return 0, err
		}
	} else if parsedRule.RuleType == ruletypes.RuleTypeAnomaly {
		// create anomaly rule
		rule, err = NewAnomalyRule(
			alertname,
			opts.OrgID,
			parsedRule,
			opts.Querier,
			opts.Logger,
			baserules.WithSendAlways(),
			baserules.WithSendUnmatched(),
			baserules.WithSQLStore(opts.SQLStore),
			baserules.WithQueryParser(opts.ManagerOpts.QueryParser),
			baserules.WithMetadataStore(opts.ManagerOpts.MetadataStore),
		)
		if err != nil {
			slog.Error("failed to prepare a new anomaly rule for test", "name", alertname, errors.Attr(err))
			return 0, err
		}
	} else {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to derive ruletype with given information")
	}

	// set timestamp to current utc time
	ts := time.Now().UTC()

	alertsFound, err := rule.Eval(ctx, ts)
	if err != nil {
		slog.Error("evaluating rule failed", "rule", rule.Name(), errors.Attr(err))
		return 0, err
	}
	rule.SendAlerts(ctx, ts, 0, time.Minute, opts.NotifyFunc)

	return alertsFound, nil
}

// newTask returns an appropriate group for the rule type
func newTask(taskType baserules.TaskType, name string, frequency time.Duration, rules []baserules.Rule, opts *baserules.ManagerOptions, notify baserules.NotifyFunc, maintenanceStore ruletypes.MaintenanceStore, orgID valuer.UUID) baserules.Task {
	if taskType == baserules.TaskTypeCh {
		return baserules.NewRuleTask(name, "", frequency, rules, opts, notify, maintenanceStore, orgID)
	}
	return baserules.NewPromRuleTask(name, "", frequency, rules, opts, notify, maintenanceStore, orgID)
}
