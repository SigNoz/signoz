package auditortypes

import "github.com/SigNoz/signoz/pkg/valuer"

// ActionCategory classifies the audit event per IEC 62443.
// See https://www.iec.ch/blog/understanding-iec-62443 for the standard reference.
type ActionCategory struct{ valuer.String }

var (
	ActionCategoryAccessControl       = ActionCategory{valuer.NewString("access_control")}
	ActionCategoryConfigurationChange = ActionCategory{valuer.NewString("configuration_change")}
	ActionCategoryDataAccess          = ActionCategory{valuer.NewString("data_access")}
	ActionCategorySystemEvent         = ActionCategory{valuer.NewString("system_event")}
)

func (ActionCategory) Enum() []any {
	return []any{
		ActionCategoryAccessControl,
		ActionCategoryConfigurationChange,
		ActionCategoryDataAccess,
		ActionCategorySystemEvent,
	}
}
