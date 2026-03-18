package authtypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
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
	// Default role any new SSO users. Defaults to "VIEWER"
	DefaultRole string `json:"defaultRole"`
	// Map of IDP group names to SigNoz roles. Key is group name, value is SigNoz role
	GroupMappings map[string]string `json:"groupMappings"`
	// If true, use the role claim directly from IDP instead of group mappings
	UseRoleAttribute bool `json:"useRoleAttribute"`
}

func (typ *RoleMapping) UnmarshalJSON(data []byte) error {
	type Alias RoleMapping

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.DefaultRole != "" {
		if _, err := types.NewRole(strings.ToUpper(temp.DefaultRole)); err != nil {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid default role %s", temp.DefaultRole)
		}
	}

	for group, role := range temp.GroupMappings {
		if _, err := types.NewRole(strings.ToUpper(role)); err != nil {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid role %s for group %s", role, group)
		}
	}

	*typ = RoleMapping(temp)
	return nil
}

func (roleMapping *RoleMapping) ManagedRolesFromCallbackIdentity(callbackIdentity *CallbackIdentity) []string {
	if roleMapping == nil {
		return []string{SigNozViewerRoleName}
	}

	if roleMapping.UseRoleAttribute && callbackIdentity.Role != "" {
		if managedRole := resolveToManagedRole(callbackIdentity.Role); managedRole != "" {
			return []string{managedRole}
		}
	}

	if len(roleMapping.GroupMappings) > 0 && len(callbackIdentity.Groups) > 0 {
		seen := make(map[string]struct{})
		var roles []string
		for _, group := range callbackIdentity.Groups {
			if mappedRole, exists := roleMapping.GroupMappings[group]; exists {
				managedRole := resolveToManagedRole(mappedRole)
				if managedRole != "" {
					if _, ok := seen[managedRole]; !ok {
						seen[managedRole] = struct{}{}
						roles = append(roles, managedRole)
					}
				}
			}
		}
		if len(roles) > 0 {
			return roles
		}
	}

	if roleMapping.DefaultRole != "" {
		if managedRole := resolveToManagedRole(roleMapping.DefaultRole); managedRole != "" {
			return []string{managedRole}
		}
	}

	return []string{SigNozViewerRoleName}
}

// for backward compatibility in API responses
func HighestLegacyRoleFromManagedRoles(managedRoles []string) types.Role {
	highest := types.RoleViewer
	for _, name := range managedRoles {
		for legacyRole, managedName := range ExistingRoleToSigNozManagedRoleMap {
			if managedName == name && compareRoles(legacyRole, highest) > 0 {
				highest = legacyRole
			}
		}
	}
	return highest
}

func compareRoles(a, b types.Role) int {
	order := map[types.Role]int{
		types.RoleViewer: 0,
		types.RoleEditor: 1,
		types.RoleAdmin:  2,
	}
	return order[a] - order[b]
}

func resolveToManagedRole(role string) string {
	// backward compatible legacy role (ADMIN -> signoz-admin) useful in case of SSO
	if legacyRole, err := types.NewRole(strings.ToUpper(role)); err == nil {
		return MustGetSigNozManagedRoleFromExistingRole(legacyRole)
	}

	return role
}
