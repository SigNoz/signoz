package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type RuleType struct {
	valuer.String
}

var (
	RuleTypeThreshold = RuleType{valuer.NewString("threshold_rule")}
	RuleTypeProm      = RuleType{valuer.NewString("promql_rule")}
	RuleTypeAnomaly   = RuleType{valuer.NewString("anomaly_rule")}
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
