package constants

const (
	AdminGroup  = "ADMIN"
	EditorGroup = "EDITOR"
	ViewerGroup = "VIEWER"

	ReadPermission  = int(1)
	WritePermission = int(2)

	AdminAPI          = "ADMIN_API_CLASS"
	NonAdminAPI       = "NON_ADMIN_API_CLASS"
	SelfAccessibleAPI = "SELF_ACCESSIBLE_API_CLASS"
	UnprotectedAPI    = "UNPROTECTED_API_CLASS"
)
