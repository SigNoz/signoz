package coretypes

import (
	"github.com/SigNoz/signoz-semantic-conventions/gen/go/sigsemconv"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ActionCategoryAccessControl       = ActionCategory{valuer.NewString(sigsemconv.SigNozAuditActionCategoryAccessControl.Value.AsString())}
	ActionCategoryConfigurationChange = ActionCategory{valuer.NewString(sigsemconv.SigNozAuditActionCategoryConfigurationChanges.Value.AsString())}
	ActionCategoryDataAccess          = ActionCategory{valuer.NewString(sigsemconv.SigNozAuditActionCategoryDataAccess.Value.AsString())}
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
