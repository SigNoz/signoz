package coretypes

import (
	sigsemconv "github.com/SigNoz/signoz-semantic-conventions/semconv/go"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ActionCategoryAccessControl       = ActionCategory{valuer.NewString(sigsemconv.SigNozAuditActionCategoryAccessControl)}
	ActionCategoryConfigurationChange = ActionCategory{valuer.NewString(sigsemconv.SigNozAuditActionCategoryConfigurationChanges)}
	ActionCategoryDataAccess          = ActionCategory{valuer.NewString("data_access")}
	ActionCategorySystemEvent         = ActionCategory{valuer.NewString("system_event")}
)

// ActionCategory classifies an audited action per IEC 62443.
// See https://www.iec.ch/blog/understanding-iec-62443 for the standard reference.
type ActionCategory struct{ valuer.String }

func (ActionCategory) Enum() []any {
	return []any{
		ActionCategoryAccessControl,
		ActionCategoryConfigurationChange,
		ActionCategoryDataAccess,
		ActionCategorySystemEvent,
	}
}
