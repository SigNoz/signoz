package auditortypes

import "github.com/SigNoz/signoz/pkg/valuer"

// Outcome represents the result of an audited operation.
type Outcome struct{ valuer.String }

var (
	OutcomeSuccess = Outcome{valuer.NewString("success")}
	OutcomeFailure = Outcome{valuer.NewString("failure")}
)

func (Outcome) Enum() []any {
	return []any{
		OutcomeSuccess,
		OutcomeFailure,
	}
}
