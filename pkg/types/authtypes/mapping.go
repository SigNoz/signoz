package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/types"
)

type AttributeMapping struct {
	// Key which contains the email in the claim/token/attributes map. Defaults to "email"
	Email string `json:"email"`

	// Key which contains the name in the claim/token/attributes map. Defaults to "name"
	Name string `json:"name"`

	// Key which contains the groups in the claim/token/attributes map. Defaults to "groups"
	Groups string `json:"groups"`

	// Key which contains the role in the claim/token/attributes map. Defaults to "role"
	Role string `json:"role"`
}

func (attr *AttributeMapping) UnmarshalJSON(data []byte) error {
	type Alias AttributeMapping

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Email == "" {
		temp.Email = "email"
	}

	if temp.Name == "" {
		temp.Name = "name"
	}

	if temp.Groups == "" {
		temp.Groups = "groups"
	}

	if temp.Role == "" {
		temp.Role = "role"
	}

	*attr = AttributeMapping(temp)
	return nil
}

type RoleMapping struct {
	// Default role assigned to new SSO users when no group mapping applies.
	DefaultRole string `json:"defaultRole"`

	// Map of IDP group name to SigNoz role name.
	GroupMappings map[string]string `json:"groupMappings"`

	// If true, use the role claim directly from IDP instead of group mappings.
	UseRoleAttribute bool `json:"useRoleAttribute"`
}

func (roleMapping *RoleMapping) UnmarshalJSON(data []byte) error {
	type alias RoleMapping

	var temp alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	temp.DefaultRole = normalizeRoleName(temp.DefaultRole)
	for group, role := range temp.GroupMappings {
		temp.GroupMappings[group] = normalizeRoleName(role)
	}

	*roleMapping = RoleMapping(temp)
	return nil
}

func (roleMapping *RoleMapping) NewRolesFromCallbackIdentity(callbackIdentity *CallbackIdentity) []string {
	if roleMapping == nil {
		return []string{SigNozViewerRoleName}
	}

	if roleMapping.UseRoleAttribute && callbackIdentity.Role != "" {
		return []string{normalizeRoleName(callbackIdentity.Role)}
	}

	if len(roleMapping.GroupMappings) > 0 && len(callbackIdentity.Groups) > 0 {
		roleNames := make([]string, 0)
		seen := make(map[string]struct{})
		for _, group := range callbackIdentity.Groups {
			roleName, exists := roleMapping.GroupMappings[group]
			if !exists {
				continue
			}
			if _, duplicate := seen[roleName]; duplicate {
				continue
			}
			seen[roleName] = struct{}{}
			roleNames = append(roleNames, roleName)
		}
		if len(roleNames) > 0 {
			return roleNames
		}
	}

	if roleMapping.DefaultRole != "" {
		return []string{roleMapping.DefaultRole}
	}

	return []string{SigNozViewerRoleName}
}

func (roleMapping *RoleMapping) RoleNames() []string {
	if roleMapping == nil {
		return nil
	}

	seen := make(map[string]struct{})
	roleNames := make([]string, 0, len(roleMapping.GroupMappings)+1)

	if roleMapping.DefaultRole != "" {
		seen[roleMapping.DefaultRole] = struct{}{}
		roleNames = append(roleNames, roleMapping.DefaultRole)
	}

	for _, roleName := range roleMapping.GroupMappings {
		if roleName == "" {
			continue
		}
		if _, duplicate := seen[roleName]; duplicate {
			continue
		}
		seen[roleName] = struct{}{}
		roleNames = append(roleNames, roleName)
	}

	return roleNames
}

func normalizeRoleName(role string) string {
	if legacyRole, err := types.NewRole(role); err == nil {
		if managedRole, ok := ExistingRoleToSigNozManagedRoleMap[legacyRole]; ok {
			return managedRole
		}
	}

	return role
}
