package audittypes

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
//	NewEventName("dashboard", ActionCreate)  → "dashboard.created"
//	NewEventName("dashboard", ActionUpdate)  → "dashboard.updated"
//	NewEventName("user.role", ActionUpdate)  → "user.role.updated"
func NewEventName(resourceKind string, action Action) EventName {
	return EventName{s: resourceKind + "." + action.PastTense()}
}

// String returns the string representation of the event name.
func (e EventName) String() string {
	return e.s
}
