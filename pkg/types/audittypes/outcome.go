package audittypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	otellog "go.opentelemetry.io/otel/log"
)

// Outcome represents the result of an audited operation.
type Outcome struct {
	valuer.String
	severity     otellog.Severity
	severityText string
}

var (
	OutcomeSuccess = Outcome{valuer.NewString("success"), otellog.SeverityInfo, "INFO"}
	OutcomeFailure = Outcome{valuer.NewString("failure"), otellog.SeverityError, "ERROR"}
)

func (Outcome) Enum() []any {
	return []any{
		OutcomeSuccess,
		OutcomeFailure,
	}
}

// Severity returns the OTel log severity for this outcome.
func (o Outcome) Severity() otellog.Severity {
	return o.severity
}

// SeverityText returns the OTel severity text for this outcome.
func (o Outcome) SeverityText() string {
	return o.severityText
}
