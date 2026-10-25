package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type RuleType struct {
	valuer.UnsetOrNonEmptyString
}

var (
	RuleTypeThreshold = RuleType{valuer.MustNewUnsetOrNonEmptyString("threshold_rule")}
	RuleTypeProm      = RuleType{valuer.MustNewUnsetOrNonEmptyString("promql_rule")}
	RuleTypeAnomaly   = RuleType{valuer.MustNewUnsetOrNonEmptyString("anomaly_rule")}
)

func (RuleType) Enum() []any {
	return []any{
		RuleTypeThreshold,
		RuleTypeProm,
		RuleTypeAnomaly,
	}
}

func (r RuleType) Validate() error {
	switch r {
	case
		RuleTypeThreshold,
		RuleTypeProm,
		RuleTypeAnomaly:
		return nil
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "ruleType: unsupported value %q; must be one of threshold_rule, promql_rule, anomaly_rule", r.StringValue())
	}
}
