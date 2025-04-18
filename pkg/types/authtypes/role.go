package authtypes

// Do not take inspiration from this. This is a hack to avoid using valuer.String and use upper case strings.
type Role = string

const (
	RoleAdmin  Role = "ADMIN"
	RoleEditor Role = "EDITOR"
	RoleViewer Role = "VIEWER"
)
