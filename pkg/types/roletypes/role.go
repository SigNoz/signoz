package roletypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	"github.com/uptrace/bun"
)

var (
	ErrCodeRoleFailedTransactionsFromString = errors.MustNewCode("role_failed_transactions_from_string")
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
	types.Identifiable
	types.TimeAuditable
	DisplayName  string                  `json:"displayName"`
	Description  string                  `json:"description"`
	Transactions []authtypes.Transaction `json:"transactions"`
	OrgID        valuer.UUID             `json:"org_id"`
}

type (
	ListableRoles = []Role
	GettableRole  = Role
)

type PatchableRoleMetadata struct {
	DisplayName *string `json:"displayName"`
	Description *string `json:"description"`
}

type PatchableRelationObjects struct {
	Additions []authtypes.Object `json:"additions"`
	Deletions []authtypes.Object `json:"deletions"`
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

func NewStorableRoleFromPostableRole(role *PostableRole) (*StorableRole, error) {
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

func NewPostableRole(displayName, description string, orgID valuer.UUID, transactions []authtypes.Transaction) (*PostableRole, error) {
	currentTime := time.Now()

	return &PostableRole{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: currentTime,
			UpdatedAt: currentTime,
		},
		DisplayName:  displayName,
		Description:  description,
		OrgID:        orgID,
		Transactions: transactions,
	}, nil
}

func (role *Role) PatchMetadata(patchableRoleMetadata *PatchableRoleMetadata) {
	if patchableRoleMetadata.DisplayName != nil {
		role.DisplayName = *patchableRoleMetadata.DisplayName
	}
	if patchableRoleMetadata.Description != nil {
		role.Description = *patchableRoleMetadata.Description
	}
	role.UpdatedAt = time.Now()
}

func (patch *PatchableRelationObjects) GetInsertionTuples(id valuer.UUID, relation authtypes.Relation) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, object := range patch.Additions {
		typeable := authtypes.MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeRole,
				id.String(),
				authtypes.RelationAssignee,
			),
			relation,
			[]authtypes.Selector{object.Selector},
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)
	}

	return tuples, nil
}

func (patch *PatchableRelationObjects) GetDeletionTuples(id valuer.UUID, relation authtypes.Relation) ([]*openfgav1.TupleKeyWithoutCondition, error) {
	tuples := make([]*openfgav1.TupleKeyWithoutCondition, 0)

	for _, object := range patch.Deletions {
		typeable := authtypes.MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeRole,
				id.String(),
				authtypes.RelationAssignee,
			),
			relation,
			[]authtypes.Selector{object.Selector},
		)
		if err != nil {
			return nil, err
		}

		deletionTuples := make([]*openfgav1.TupleKeyWithoutCondition, len(transactionTuples))
		for idx, tuple := range transactionTuples {
			deletionTuples[idx] = &openfgav1.TupleKeyWithoutCondition{
				User:     tuple.User,
				Relation: tuple.Relation,
				Object:   tuple.Object,
			}
		}

		tuples = append(tuples, deletionTuples...)
	}

	return tuples, nil
}

func (role *PostableRole) GetTuplesFromTransactions() ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, transaction := range role.Transactions {
		typeable := authtypes.MustNewTypeableFromType(transaction.Object.Resource.Type, transaction.Object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeRole,
				role.ID.String(),
				authtypes.RelationAssignee,
			),
			transaction.Relation,
			[]authtypes.Selector{transaction.Object.Selector},
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)

	}

	return tuples, nil
}
