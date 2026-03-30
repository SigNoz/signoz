package auditortypes

// EventName derives the audit event name from a resource name and action.
// Format: {resource_name}.{pastTense(action)}
//
// Examples:
//
//	EventName("dashboard", ActionCreate)  → "dashboard.created"
//	EventName("session", ActionLogin)     → "session.login"
//	EventName("user.role", ActionUpdate)  → "user.role.updated" (sub-resource)
func EventName(resourceName string, action Action) string {
	return resourceName + "." + action.PastTense()
}
