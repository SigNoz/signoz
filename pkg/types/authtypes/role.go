package authtypes

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeRoleInvalidInput                 = errors.MustNewCode("role_invalid_input")
	ErrCodeInvalidTypeRelation              = errors.MustNewCode("role_invalid_type_relation")
	ErrCodeRoleNotFound                     = errors.MustNewCode("role_not_found")
	ErrCodeRoleAlreadyExists                = errors.MustNewCode("role_already_exists")
	ErrCodeRoleFailedTransactionsFromString = errors.MustNewCode("role_failed_transactions_from_string")
	ErrCodeRoleUnsupported                  = errors.MustNewCode("role_unsupported")
	ErrCodeRoleHasUserAssignees             = errors.MustNewCode("role_has_user_assignees")
	ErrCodeRoleHasServiceAccountAssignees   = errors.MustNewCode("role_has_service_account_assignees")
	ErrCodeRoleHasAuthDomainMappings        = errors.MustNewCode("role_has_auth_domain_mappings")
)

var (
	roleNameRegex     = regexp.MustCompile("^[a-z-]{1,50}$")
	managedRolePrefix = "signoz"
)

var (
	RoleTypeCustom  = valuer.NewString("custom")
	RoleTypeManaged = valuer.NewString("managed")
)

var (
	SigNozAnonymousRoleName        = coretypes.SigNozAnonymousRoleName
	SigNozAnonymousRoleDescription = "Role assigned to anonymous users for access to public resources."
	SigNozAdminRoleName            = coretypes.SigNozAdminRoleName
	SigNozAdminRoleDescription     = "Role assigned to users who have full administrative access to SigNoz resources."
	SigNozEditorRoleName           = coretypes.SigNozEditorRoleName
	SigNozEditorRoleDescription    = "Role assigned to users who can create, edit, and manage SigNoz resources but do not have full administrative privileges."
	SigNozViewerRoleName           = coretypes.SigNozViewerRoleName
	SigNozViewerRoleDescription    = "Role assigned to users who have read-only access to SigNoz resources."
)

var (
	ExistingRoleToSigNozManagedRoleMap = map[types.Role]string{
		types.RoleAdmin:  SigNozAdminRoleName,
		types.RoleEditor: SigNozEditorRoleName,
		types.RoleViewer: SigNozViewerRoleName,
	}

	SigNozManagedRoleToExistingLegacyRole = map[string]types.Role{
		SigNozAdminRoleName:  types.RoleAdmin,
		SigNozEditorRoleName: types.RoleEditor,
		SigNozViewerRoleName: types.RoleViewer,
	}
)

type Role struct {
	bun.BaseModel `bun:"table:role"`

	types.Identifiable
	types.TimeAuditable
	Name        string        `bun:"name,type:string" json:"name" required:"true"`
	Description string        `bun:"description,type:string"  json:"description" required:"true"`
	Type        valuer.String `bun:"type,type:string" json:"type" required:"true"`
	OrgID       valuer.UUID   `bun:"org_id,type:string" json:"orgId" required:"true"`
}

type RoleWithTransactionGroups struct {
	*Role
	TransactionGroups TransactionGroups `json:"transactionGroups" required:"true" nullable:"false"`
}

type PostableRole struct {
	Name              string            `json:"name" required:"true"`
	Description       string            `json:"description" required:"false"`
	TransactionGroups TransactionGroups `json:"transactionGroups" required:"false" nullable:"false"`
}

type UpdatableRole struct {
	Description       string            `json:"description" required:"true"`
	TransactionGroups TransactionGroups `json:"transactionGroups" required:"true" nullable:"false"`
}

func NewRole(name, description string, roleType valuer.String, orgID valuer.UUID) *Role {
	return &Role{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:        name,
		Description: description,
		Type:        roleType,
		OrgID:       orgID,
	}
}

func NewRoleWithTransactionGroups(name, description string, roleType valuer.String, orgID valuer.UUID, transactionGroups TransactionGroups) *RoleWithTransactionGroups {
	role := NewRole(name, description, roleType, orgID)

	return &RoleWithTransactionGroups{
		Role:              role,
		TransactionGroups: transactionGroups,
	}
}

func MakeRoleWithTransactionGroups(role *Role, transactionGroups TransactionGroups) *RoleWithTransactionGroups {
	return &RoleWithTransactionGroups{
		Role:              role,
		TransactionGroups: transactionGroups,
	}
}

func NewManagedRoles(orgID valuer.UUID) []*Role {
	return []*Role{
		NewRole(SigNozAdminRoleName, SigNozAdminRoleDescription, RoleTypeManaged, orgID),
		NewRole(SigNozEditorRoleName, SigNozEditorRoleDescription, RoleTypeManaged, orgID),
		NewRole(SigNozViewerRoleName, SigNozViewerRoleDescription, RoleTypeManaged, orgID),
		NewRole(SigNozAnonymousRoleName, SigNozAnonymousRoleDescription, RoleTypeManaged, orgID),
	}

}

func NewStatsFromRoles(roles []*Role) map[string]any {
	stats := make(map[string]any)
	for _, role := range roles {
		key := "role." + role.Type.StringValue() + ".count"
		if value, ok := stats[key]; ok {
			stats[key] = value.(int64) + 1
		} else {
			stats[key] = int64(1)
		}
	}
	stats["role.count"] = int64(len(roles))
	return stats
}

func (role *RoleWithTransactionGroups) Update(description string, transactionGroups TransactionGroups) error {
	err := role.ErrIfManaged()
	if err != nil {
		return err
	}

	role.Description = description
	role.TransactionGroups = transactionGroups
	role.UpdatedAt = time.Now()
	return nil
}

func (role *Role) ErrIfManaged() error {
	if role.Type == RoleTypeManaged {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "cannot edit/delete managed role: %s", role.Name)
	}

	return nil
}

func (role *PostableRole) UnmarshalJSON(data []byte) error {
	shadow := struct {
		Name              string           `json:"name"`
		Description       string           `json:"description"`
		TransactionGroups *json.RawMessage `json:"transactionGroups"`
	}{}

	if err := json.Unmarshal(data, &shadow); err != nil {
		return err
	}

	if shadow.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "name is missing from the request")
	}

	if match := roleNameRegex.MatchString(shadow.Name); !match {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "name must contain only lowercase letters (a-z) and hyphens (-), and be at most 50 characters long.")
	}

	if strings.HasPrefix(shadow.Name, managedRolePrefix) {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "role name cannot start with %q as it is reserved for SigNoz managed roles.", managedRolePrefix)
	}

	var transactionGroups TransactionGroups
	if shadow.TransactionGroups != nil {
		var err error
		transactionGroups, err = NewTransactionGroups(*shadow.TransactionGroups)
		if err != nil {
			return err
		}
	}

	role.Name = shadow.Name
	role.Description = shadow.Description
	role.TransactionGroups = transactionGroups
	return nil
}

func (role *UpdatableRole) UnmarshalJSON(data []byte) error {
	shadow := struct {
		Description       *string          `json:"description"`
		TransactionGroups *json.RawMessage `json:"transactionGroups"`
	}{}

	if err := json.Unmarshal(data, &shadow); err != nil {
		return err
	}

	if shadow.Description == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "description is required").WithAdditional("send an empty string to clear the description")
	}

	if shadow.TransactionGroups == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "transactionGroups is required").WithAdditional("send an empty array to clear the role's transaction groups")
	}

	transactionGroups, err := NewTransactionGroups(*shadow.TransactionGroups)
	if err != nil {
		return err
	}

	role.Description = *shadow.Description
	role.TransactionGroups = transactionGroups
	return nil
}

func MustGetSigNozManagedRoleFromExistingRole(role types.Role) string {
	managedRole, ok := ExistingRoleToSigNozManagedRoleMap[role]
	if !ok {
		panic(errors.Newf(errors.TypeInternal, errors.CodeInternal, "invalid role: %s", role.String()))
	}

	return managedRole
}

func NormalizeRoleName(role string) string {
	legacyRole, err := types.NewRole(strings.ToUpper(role))
	if err != nil {
		return role
	}

	managedRole, ok := ExistingRoleToSigNozManagedRoleMap[legacyRole]
	if !ok {
		return role
	}

	return managedRole
}

type RoleStore interface {
	Create(context.Context, *Role) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*Role, error)
	GetByOrgIDAndName(context.Context, valuer.UUID, string) (*Role, error)
	List(context.Context, valuer.UUID) ([]*Role, error)
	ListByOrgIDAndNames(context.Context, valuer.UUID, []string) ([]*Role, error)
	ListByOrgIDAndIDs(context.Context, valuer.UUID, []valuer.UUID) ([]*Role, error)
	Update(context.Context, valuer.UUID, *Role) error
	Delete(context.Context, valuer.UUID, valuer.UUID) error
	RunInTx(context.Context, func(ctx context.Context) error) error
}
