package audittypes

import "github.com/SigNoz/signoz/pkg/types/coretypes"

// EventName is a typed wrapper for audit event names, ensuring not every
// string qualifies as an event name.
type EventName struct {
	s string
}

// NewEventName derives the audit event name from a resource kind and action.
// Format: {resource_kind}.{pastTense(action)}
//
// Examples:
//
//	NewEventName("dashboard", coretypes.VerbCreate)  → "dashboard.created"
//	NewEventName("dashboard", coretypes.VerbUpdate)  → "dashboard.updated"
func NewEventName(resourceKind coretypes.Kind, action coretypes.Verb) EventName {
	return EventName{s: resourceKind.String() + "." + action.PastTense()}
}

// String returns the string representation of the event name.
func (e EventName) String() string {
	return e.s
}
