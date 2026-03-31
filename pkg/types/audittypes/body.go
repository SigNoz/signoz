package audittypes

import "fmt"

// BuildBody returns a human-readable audit log body string.
// Success: "{email} ({id}) {pastTense} {resource} {resourceID}"
// Failure: "{email} ({id}) failed to {action} {resource} {resourceID}: {errorType} ({errorCode})"
func BuildBody(event AuditEvent) string {
	if event.Outcome == OutcomeSuccess {
		return fmt.Sprintf("%s (%s) %s %s %s", event.PrincipalEmail, event.PrincipalID, event.Action.PastTense(), event.ResourceName, event.ResourceID)
	}

	return fmt.Sprintf("%s (%s) failed to %s %s %s: %s (%s)", event.PrincipalEmail, event.PrincipalID, event.Action.StringValue(), event.ResourceName, event.ResourceID, event.ErrorType, event.ErrorCode)
}
