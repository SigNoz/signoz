package auditortypes

import "github.com/SigNoz/signoz/pkg/valuer"

// ActionCategory classifies the audit event per IEC 62443.
type ActionCategory struct{ valuer.String }

var (
	CategoryAccessControl       = ActionCategory{valuer.NewString("access_control")}
	CategoryConfigurationChange = ActionCategory{valuer.NewString("configuration_change")}
	CategoryDataAccess          = ActionCategory{valuer.NewString("data_access")}
	CategorySystemEvent         = ActionCategory{valuer.NewString("system_event")}
)

func (ActionCategory) Enum() []any {
	return []any{
		CategoryAccessControl,
		CategoryConfigurationChange,
		CategoryDataAccess,
		CategorySystemEvent,
	}
}
