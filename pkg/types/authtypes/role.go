package authtypes

import (
	"context"
	"encoding/json"
	"regexp"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	"github.com/uptrace/bun"
)

var (
	ErrCodeRoleInvalidInput                 = errors.MustNewCode("role_invalid_input")
	ErrCodeRoleEmptyPatch                   = errors.MustNewCode("role_empty_patch")
	ErrCodeInvalidTypeRelation              = errors.MustNewCode("role_invalid_type_relation")
	ErrCodeRoleNotFound                     = errors.MustNewCode("role_not_found")
	ErrCodeRoleFailedTransactionsFromString = errors.MustNewCode("role_failed_transactions_from_string")
	ErrCodeRoleUnsupported                  = errors.MustNewCode("role_unsupported")
	ErrCodeRoleHasUserAssignees             = errors.MustNewCode("role_has_user_assignees")
	ErrCodeRoleHasServiceAccountAssignees   = errors.MustNewCode("role_has_service_account_assignees")
)

var (
	roleNameRegex = regexp.MustCompile("^[a-z-]{1,50}$")
)

var (
	RoleTypeCustom  = valuer.NewString("custom")
	RoleTypeManaged = valuer.NewString("managed")
)

var (
	SigNozAnonymousRoleName        = "signoz-anonymous"
	SigNozAnonymousRoleDescription = "Role assigned to anonymous users for access to public resources."
	SigNozAdminRoleName            = "signoz-admin"
	SigNozAdminRoleDescription     = "Role assigned to users who have full administrative access to SigNoz resources."
	SigNozEditorRoleName           = "signoz-editor"
	SigNozEditorRoleDescription    = "Role assigned to users who can create, edit, and manage SigNoz resources but do not have full administrative privileges."
	SigNozViewerRoleName           = "signoz-viewer"
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

var (
	TypeableResourcesRoles = MustNewTypeableMetaResources(MustNewName("roles"))
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

type PostableRole struct {
	Name        string `json:"name" required:"true"`
	Description string `json:"description"`
}

type PatchableRole struct {
	Description string `json:"description" required:"true"`
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

func NewManagedRoles(orgID valuer.UUID) []*Role {
	return []*Role{
		NewRole(SigNozAdminRoleName, SigNozAdminRoleDescription, RoleTypeManaged, orgID),
		NewRole(SigNozEditorRoleName, SigNozEditorRoleDescription, RoleTypeManaged, orgID),
		NewRole(SigNozViewerRoleName, SigNozViewerRoleDescription, RoleTypeManaged, orgID),
		NewRole(SigNozAnonymousRoleName, SigNozAnonymousRoleDescription, RoleTypeManaged, orgID),
	}

}

func (role *Role) PatchMetadata(description string) error {
	err := role.ErrIfManaged()
	if err != nil {
		return err
	}

	role.Description = description
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
	type shadowPostableRole struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	var shadowRole shadowPostableRole
	if err := json.Unmarshal(data, &shadowRole); err != nil {
		return err
	}

	if shadowRole.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "name is missing from the request")
	}

	if match := roleNameRegex.MatchString(shadowRole.Name); !match {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "name must conform to the regex: %s", roleNameRegex.String())
	}

	role.Name = shadowRole.Name
	role.Description = shadowRole.Description

	return nil
}

func (role *PatchableRole) UnmarshalJSON(data []byte) error {
	type shadowPatchableRole struct {
		Description string `json:"description"`
	}

	var shadowRole shadowPatchableRole
	if err := json.Unmarshal(data, &shadowRole); err != nil {
		return err
	}

	if shadowRole.Description == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleEmptyPatch, "empty role patch request received, description must be present")
	}

	role.Description = shadowRole.Description

	return nil
}

func GetAdditionTuples(name string, orgID valuer.UUID, relation Relation, additions []*Object) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, object := range additions {
		typeable := MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			MustNewSubject(
				TypeableRole,
				name,
				orgID,
				&RelationAssignee,
			),
			relation,
			[]Selector{object.Selector},
			orgID,
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)
	}

	return tuples, nil
}

func GetDeletionTuples(name string, orgID valuer.UUID, relation Relation, deletions []*Object) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, object := range deletions {
		typeable := MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			MustNewSubject(
				TypeableRole,
				name,
				orgID,
				&RelationAssignee,
			),
			relation,
			[]Selector{object.Selector},
			orgID,
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)
	}

	return tuples, nil
}

func MustGetSigNozManagedRoleFromExistingRole(role types.Role) string {
	managedRole, ok := ExistingRoleToSigNozManagedRoleMap[role]
	if !ok {
		panic(errors.Newf(errors.TypeInternal, errors.CodeInternal, "invalid role: %s", role.String()))
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
