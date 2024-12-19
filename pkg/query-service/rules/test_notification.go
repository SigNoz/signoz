package rules

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.uber.org/zap"
)

// TestNotification prepares a dummy rule for given rule parameters and
// sends a test notification. returns alert count and error (if any)
func defaultTestNotification(opts PrepareTestRuleOptions) (int, *model.ApiError) {

	ctx := context.Background()

	if opts.Rule == nil {
		return 0, model.BadRequest(fmt.Errorf("rule is required"))
	}

	parsedRule := opts.Rule
	var alertname = parsedRule.AlertName
	if alertname == "" {
		// alertname is not mandatory for testing, so picking
		// a random string here
		alertname = uuid.New().String()
	}

	// append name to indicate this is test alert
	parsedRule.AlertName = fmt.Sprintf("%s%s", alertname, TestAlertPostFix)

	var rule Rule
	var err error

	if parsedRule.RuleType == RuleTypeThreshold {

		// add special labels for test alerts
		parsedRule.Annotations[labels.AlertSummaryLabel] = fmt.Sprintf("The rule threshold is set to %.4f, and the observed metric value is {{$value}}.", *parsedRule.RuleCondition.Target)
		parsedRule.Labels[labels.RuleSourceLabel] = ""
		parsedRule.Labels[labels.AlertRuleIdLabel] = ""

		// create a threshold rule
		rule, err = NewThresholdRule(
			alertname,
			parsedRule,
			opts.FF,
			opts.Reader,
			opts.UseLogsNewSchema,
			opts.UseTraceNewSchema,
			WithSendAlways(),
			WithSendUnmatched(),
		)

		if err != nil {
			zap.L().Error("failed to prepare a new threshold rule for test", zap.String("name", rule.Name()), zap.Error(err))
			return 0, model.BadRequest(err)
		}

	} else if parsedRule.RuleType == RuleTypeProm {

		// create promql rule
		rule, err = NewPromRule(
			alertname,
			parsedRule,
			opts.Logger,
			opts.Reader,
			opts.ManagerOpts.PqlEngine,
			WithSendAlways(),
			WithSendUnmatched(),
		)

		if err != nil {
			zap.L().Error("failed to prepare a new promql rule for test", zap.String("name", rule.Name()), zap.Error(err))
			return 0, model.BadRequest(err)
		}
	} else {
		return 0, model.BadRequest(fmt.Errorf("failed to derive ruletype with given information"))
	}

	// set timestamp to current utc time
	ts := time.Now().UTC()

	count, err := rule.Eval(ctx, ts)
	if err != nil {
		zap.L().Error("evaluating rule failed", zap.String("rule", rule.Name()), zap.Error(err))
		return 0, model.InternalError(fmt.Errorf("rule evaluation failed"))
	}
	alertsFound, ok := count.(int)
	if !ok {
		return 0, model.InternalError(fmt.Errorf("something went wrong"))
	}
	rule.SendAlerts(ctx, ts, 0, time.Duration(1*time.Minute), opts.NotifyFunc)

	return alertsFound, nil
}
