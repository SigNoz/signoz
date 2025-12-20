package authtypes

type RoleMapping struct {
	// Default role any new SSO users. Defaults to "VIEWER"
	DefaultRole string `json:"defaultRole"`
	// Map of IDP group names to SigNoz roles. Key is group name, value is SigNoz role
	GroupMappings map[string]string `json:"groupMappings"`
	// If true, use the role claim directly from IDP instead of group mappings
	UseRoleAttribute bool `json:"useRoleAttribute"`
}
