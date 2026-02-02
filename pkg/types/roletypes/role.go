package roletypes

import (
	"encoding/json"
	"regexp"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
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
)

var (
	RoleNameRegex = regexp.MustCompile("^[a-z-]{1,50}$")
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
)

var (
	TypeableResourcesRoles = authtypes.MustNewTypeableMetaResources(authtypes.MustNewName("roles"))
)

type StorableRole struct {
	bun.BaseModel `bun:"table:role"`

	types.Identifiable
	types.TimeAuditable
	Name        string `bun:"name,type:string"`
	Description string `bun:"description,type:string"`
	Type        string `bun:"type,type:string"`
	OrgID       string `bun:"org_id,type:string"`
}

type Role struct {
	types.Identifiable
	types.TimeAuditable
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Type        valuer.String `json:"type"`
	OrgID       valuer.UUID   `json:"orgId"`
}

type PostableRole struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type PatchableRole struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

type PatchableObjects struct {
	Additions []*authtypes.Object `json:"additions"`
	Deletions []*authtypes.Object `json:"deletions"`
}

func NewStorableRoleFromRole(role *Role) *StorableRole {
	return &StorableRole{
		Identifiable:  role.Identifiable,
		TimeAuditable: role.TimeAuditable,
		Name:          role.Name,
		Description:   role.Description,
		Type:          role.Type.String(),
		OrgID:         role.OrgID.StringValue(),
	}
}

func NewRoleFromStorableRole(storableRole *StorableRole) *Role {
	return &Role{
		Identifiable:  storableRole.Identifiable,
		TimeAuditable: storableRole.TimeAuditable,
		Name:          storableRole.Name,
		Description:   storableRole.Description,
		Type:          valuer.NewString(storableRole.Type),
		OrgID:         valuer.MustNewUUID(storableRole.OrgID),
	}
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

func (role *Role) PatchMetadata(name, description *string) error {
	err := role.CanEditDelete()
	if err != nil {
		return err
	}

	if name != nil {
		role.Name = *name
	}
	if description != nil {
		role.Description = *description
	}
	role.UpdatedAt = time.Now()
	return nil
}

func (role *Role) NewPatchableObjects(additions []*authtypes.Object, deletions []*authtypes.Object, relation authtypes.Relation) (*PatchableObjects, error) {
	err := role.CanEditDelete()
	if err != nil {
		return nil, err
	}

	if len(additions) == 0 && len(deletions) == 0 {
		return nil, errors.New(errors.TypeInvalidInput, ErrCodeRoleEmptyPatch, "empty object patch request received, at least one of additions or deletions must be present")
	}

	for _, object := range additions {
		if !slices.Contains(authtypes.TypeableRelations[object.Resource.Type], relation) {
			return nil, errors.Newf(errors.TypeInvalidInput, authtypes.ErrCodeAuthZInvalidRelation, "relation %s is invalid for type %s", relation.StringValue(), object.Resource.Type.StringValue())
		}
	}

	for _, object := range deletions {
		if !slices.Contains(authtypes.TypeableRelations[object.Resource.Type], relation) {
			return nil, errors.Newf(errors.TypeInvalidInput, authtypes.ErrCodeAuthZInvalidRelation, "relation %s is invalid for type %s", relation.StringValue(), object.Resource.Type.StringValue())
		}
	}

	return &PatchableObjects{Additions: additions, Deletions: deletions}, nil
}

func (role *Role) CanEditDelete() error {
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

	if match := RoleNameRegex.MatchString(shadowRole.Name); !match {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "name must conform to the regex: %s", RoleNameRegex.String())
	}

	role.Name = shadowRole.Name
	role.Description = shadowRole.Description

	return nil
}

func (role *PatchableRole) UnmarshalJSON(data []byte) error {
	type shadowPatchableRole struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}

	var shadowRole shadowPatchableRole
	if err := json.Unmarshal(data, &shadowRole); err != nil {
		return err
	}

	if shadowRole.Name == nil && shadowRole.Description == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleEmptyPatch, "empty role patch request received, at least one of name or description must be present")
	}

	if shadowRole.Name != nil {
		if match := RoleNameRegex.MatchString(*shadowRole.Name); !match {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "name must conform to the regex: %s", RoleNameRegex.String())
		}
	}

	role.Name = shadowRole.Name
	role.Description = shadowRole.Description

	return nil
}

func GetAdditionTuples(id valuer.UUID, orgID valuer.UUID, relation authtypes.Relation, additions []*authtypes.Object) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, object := range additions {
		typeable := authtypes.MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeableRole,
				id.String(),
				orgID,
				&authtypes.RelationAssignee,
			),
			relation,
			[]authtypes.Selector{object.Selector},
			orgID,
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)
	}

	return tuples, nil
}

func GetDeletionTuples(id valuer.UUID, orgID valuer.UUID, relation authtypes.Relation, deletions []*authtypes.Object) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, object := range deletions {
		typeable := authtypes.MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeableRole,
				id.String(),
				orgID,
				&authtypes.RelationAssignee,
			),
			relation,
			[]authtypes.Selector{object.Selector},
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
