package authtypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
)

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
