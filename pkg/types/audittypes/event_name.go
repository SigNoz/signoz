package audittypes

import (
	"github.com/SigNoz/signoz-semantic-conventions/gen/go/sigsemconv"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

var eventNames = map[coretypes.Verb]EventName{
	coretypes.VerbCreate: {s: sigsemconv.SigNozAuditCreateEventName},
	coretypes.VerbUpdate: {s: sigsemconv.SigNozAuditUpdateEventName},
	coretypes.VerbDelete: {s: sigsemconv.SigNozAuditDeleteEventName},
	coretypes.VerbAttach: {s: sigsemconv.SigNozAuditAttachEventName},
	coretypes.VerbDetach: {s: sigsemconv.SigNozAuditDetachEventName},
}

// EventName is a typed wrapper for audit event names, ensuring not every
// string qualifies as an event name.
type EventName struct {
	s string
}

// NewEventName returns the audit event name of an action, signoz.audit.{action}.
// It is zero for an action that is not audited; see IsAudited.
func NewEventName(action coretypes.Verb) EventName {
	return eventNames[action]
}

// IsAudited reports whether an action records an audit event.
func IsAudited(action coretypes.Verb) bool {
	_, ok := eventNames[action]
	return ok
}

// String returns the string representation of the event name.
func (e EventName) String() string {
	return e.s
}
