package coretypes

var (
	ManagedRoles = []string{
		SigNozAdminRoleName,
		SigNozEditorRoleName,
		SigNozViewerRoleName,
		SigNozAnonymousRoleName,
	}
)

const (
	SigNozAdminRoleName     string = "signoz-admin"
	SigNozEditorRoleName    string = "signoz-editor"
	SigNozViewerRoleName    string = "signoz-viewer"
	SigNozAnonymousRoleName string = "signoz-anonymous"
)
