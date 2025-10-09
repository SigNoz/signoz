package roletypes

import (
	"encoding/json"
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
	TypeableResourcesRoles = authtypes.MustNewTypeableResources(authtypes.MustNewName("roles"))
)

type StorableRole struct {
	bun.BaseModel `bun:"table:role"`

	types.Identifiable
	types.TimeAuditable
	DisplayName string `bun:"display_name,type:string"`
	Description string `bun:"description,type:string"`
	OrgID       string `bun:"org_id,type:string"`
}

type Role struct {
	types.Identifiable
	types.TimeAuditable
	DisplayName string      `json:"displayName"`
	Description string      `json:"description"`
	OrgID       valuer.UUID `json:"org_id"`
}

type PostableRole struct {
	DisplayName string `json:"displayName"`
	Description string `json:"description"`
}

type PatchableRole struct {
	DisplayName *string `json:"displayName"`
	Description *string `json:"description"`
}

type PatchableObjects struct {
	Additions []*authtypes.Object `json:"additions"`
	Deletions []*authtypes.Object `json:"deletions"`
}

func NewStorableRoleFromRole(role *Role) (*StorableRole, error) {
	return &StorableRole{
		Identifiable:  role.Identifiable,
		TimeAuditable: role.TimeAuditable,
		DisplayName:   role.DisplayName,
		Description:   role.Description,
		OrgID:         role.OrgID.StringValue(),
	}, nil
}

func NewRoleFromStorableRole(storableRole *StorableRole) (*Role, error) {
	orgID, err := valuer.NewUUID(storableRole.OrgID)
	if err != nil {
		return nil, err
	}

	return &Role{
		Identifiable:  storableRole.Identifiable,
		TimeAuditable: storableRole.TimeAuditable,
		DisplayName:   storableRole.DisplayName,
		Description:   storableRole.Description,
		OrgID:         orgID,
	}, nil
}

func NewRole(displayName, description string, orgID valuer.UUID) *Role {
	return &Role{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		DisplayName: displayName,
		Description: description,
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

func (role *Role) PatchMetadata(displayName, description *string) {
	if displayName != nil {
		role.DisplayName = *displayName
	}
	if description != nil {
		role.Description = *description
	}
	role.UpdatedAt = time.Now()
}

func (role *PostableRole) UnmarshalJSON(data []byte) error {
	type shadowPostableRole struct {
		DisplayName string `json:"displayName"`
		Description string `json:"description"`
	}

	var shadowRole shadowPostableRole
	if err := json.Unmarshal(data, &shadowRole); err != nil {
		return err
	}

	if shadowRole.DisplayName == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "displayName is missing from the request")
	}

	role.DisplayName = shadowRole.DisplayName
	role.Description = shadowRole.Description

	return nil
}

func (role *PatchableRole) UnmarshalJSON(data []byte) error {
	type shadowPatchableRole struct {
		DisplayName *string `json:"displayName"`
		Description *string `json:"description"`
	}

	var shadowRole shadowPatchableRole
	if err := json.Unmarshal(data, &shadowRole); err != nil {
		return err
	}

	if shadowRole.DisplayName == nil && shadowRole.Description == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleEmptyPatch, "empty role patch request received, at least one of displayName or description must be present")
	}

	if *shadowRole.DisplayName == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "cannot set empty displayName for the role")
	}

	role.DisplayName = shadowRole.DisplayName
	role.Description = shadowRole.Description

	return nil
}

func GetAdditionTuples(id valuer.UUID, orgID valuer.UUID, relation authtypes.Relation, additions []*authtypes.Object) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, object := range additions {
		typeable := authtypes.MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeRole,
				id.String(),
				authtypes.RelationAssignee,
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
				authtypes.TypeRole,
				id.String(),
				authtypes.RelationAssignee,
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
