package audittypes

import (
	"github.com/SigNoz/signoz-semantic-conventions/gen/go/sigsemconv"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/collector/pdata/plog"
)

// Outcome represents the result of an audited operation.
type Outcome struct {
	valuer.String
	severity     plog.SeverityNumber
	severityText string
}

var (
	OutcomeSuccess = Outcome{valuer.NewString(sigsemconv.SigNozAuditOutcomeSuccess.Value.AsString()), plog.SeverityNumberInfo, "INFO"}
	OutcomeFailure = Outcome{valuer.NewString(sigsemconv.SigNozAuditOutcomeFailure.Value.AsString()), plog.SeverityNumberError, "ERROR"}
)

func (Outcome) Enum() []any {
	return []any{
		OutcomeSuccess,
		OutcomeFailure,
	}
}

// Severity returns the plog severity number for this outcome.
func (o Outcome) Severity() plog.SeverityNumber {
	return o.severity
}

// SeverityText returns the severity text for this outcome.
func (o Outcome) SeverityText() string {
	return o.severityText
}
