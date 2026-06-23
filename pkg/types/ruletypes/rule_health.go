package ruletypes

import "github.com/SigNoz/signoz/pkg/valuer"

type RuleHealth struct {
	valuer.String
}

var (
	HealthUnknown = RuleHealth{valuer.NewString("unknown")}
	HealthGood    = RuleHealth{valuer.NewString("ok")}
	HealthBad     = RuleHealth{valuer.NewString("err")}
)
