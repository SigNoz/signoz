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
