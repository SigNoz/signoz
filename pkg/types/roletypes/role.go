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
)

var (
	RoleNameRegex = regexp.MustCompile("^[a-z-]{1,50}$")
)

var (
	RoleTypeCustom  = valuer.NewString("custom")
	RoleTypeManaged = valuer.NewString("managed")
)

var (
	AnonymousUserRoleName        = "signoz-anonymous"
	AnonymousUserRoleDescription = "Role assigned to anonymous users for access to public resources."
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
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Type        string      `json:"type"`
	OrgID       valuer.UUID `json:"org_id"`
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
		Type:          role.Type,
		OrgID:         role.OrgID.StringValue(),
	}
}

func NewRoleFromStorableRole(storableRole *StorableRole) *Role {
	return &Role{
		Identifiable:  storableRole.Identifiable,
		TimeAuditable: storableRole.TimeAuditable,
		Name:          storableRole.Name,
		Description:   storableRole.Description,
		Type:          storableRole.Type,
		OrgID:         valuer.MustNewUUID(storableRole.OrgID),
	}
}

func NewRole(name, description string, roleType string, orgID valuer.UUID) *Role {
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

func NewPatchableObjects(additions []*authtypes.Object, deletions []*authtypes.Object, relation authtypes.Relation) (*PatchableObjects, error) {
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

func (role *Role) PatchMetadata(name, description *string) {
	if name != nil {
		role.Name = *name
	}
	if description != nil {
		role.Description = *description
	}
	role.UpdatedAt = time.Now()
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
