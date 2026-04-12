package aio11ypricingruletypes

import "github.com/SigNoz/signoz/pkg/errors"

var (
	ErrCodePricingRuleNotFound      = errors.MustNewCode("pricing_rule_not_found")
	ErrCodePricingRuleAlreadyExists = errors.MustNewCode("pricing_rule_already_exists")
	ErrCodePricingRuleInvalidInput  = errors.MustNewCode("pricing_rule_invalid_input")
)
