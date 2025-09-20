package roletypes

import (
	"encoding/json"
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
	DisplayName  string `bun:"display_name,type:string"`
	Description  string `bun:"description,type:string"`
	Transactions string `bun:"transactions,type:string"`
	OrgID        string `bun:"org_id,type:string"`
}

type Role struct {
	types.Identifiable
	types.TimeAuditable
	DisplayName  string         `json:"displayName"`
	Description  string         `json:"description"`
	Transactions []*Transaction `json:"transactions"`
	OrgID        valuer.UUID    `json:"org_id"`
}

type Transaction struct {
	Resource  Resource
	Relation  authtypes.Relation
	Selectors []authtypes.Selector
}

type Resource struct {
	Name authtypes.Name
	Type authtypes.Type
}

type (
	PostableRole = Role
	GettableRole = Role
)

type UpdatableRole struct {
	DisplayName  string         `json:"displayName"`
	Description  string         `json:"description"`
	Transactions []*Transaction `json:"transactions"`
}

func newTransactionsFromString(s string) ([]*Transaction, error) {
	transactions := make([]*Transaction, 0)

	err := json.Unmarshal([]byte(s), &transactions)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInvalidInput, ErrCodeRoleFailedTransactionsFromString, "failed to unmarshal transactions from string")
	}

	return transactions, nil
}

func NewStorableRoleFromRole(role *Role) (*StorableRole, error) {
	transactions, err := json.Marshal(role.Transactions)
	if err != nil {
		return nil, err
	}

	return &StorableRole{
		Identifiable:  role.Identifiable,
		TimeAuditable: role.TimeAuditable,
		DisplayName:   role.DisplayName,
		Description:   role.Description,
		Transactions:  string(transactions),
		OrgID:         role.OrgID.StringValue(),
	}, nil
}

func NewRoleFromStorableRole(storableRole *StorableRole) (*Role, error) {
	transactions, err := newTransactionsFromString(storableRole.Transactions)
	if err != nil {
		return nil, err
	}
	orgID, err := valuer.NewUUID(storableRole.OrgID)
	if err != nil {
		return nil, err
	}

	return &Role{
		Identifiable:  storableRole.Identifiable,
		TimeAuditable: storableRole.TimeAuditable,
		DisplayName:   storableRole.DisplayName,
		Description:   storableRole.Description,
		Transactions:  transactions,
		OrgID:         orgID,
	}, nil
}

func (role *Role) GetTuplesFromTransactions() ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, transaction := range role.Transactions {
		typeable, err := authtypes.NewTypeableFromType(transaction.Resource.Type, transaction.Resource.Name)
		if err != nil {
			return nil, err
		}

		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeRole,
				role.ID.String(),
				authtypes.RelationAssignee,
			),
			transaction.Relation,
			transaction.Selectors,
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)
	}

	return tuples, nil
}

func (updatableRole *UpdatableRole) GetTuplesFromTransactions(id valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, transaction := range updatableRole.Transactions {
		typeable, err := authtypes.NewTypeableFromType(transaction.Resource.Type, transaction.Resource.Name)
		if err != nil {
			return nil, err
		}

		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeRole,
				id.StringValue(),
				authtypes.RelationAssignee,
			),
			transaction.Relation,
			transaction.Selectors,
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)
	}

	return tuples, nil
}

func (role *Role) GetDifference(updatableRole *UpdatableRole) ([]*openfgav1.TupleKey, []*openfgav1.TupleKeyWithoutCondition, error) {
	existingTuples, err := role.GetTuplesFromTransactions()
	if err != nil {
		return nil, nil, err
	}

	updatedTuples, err := updatableRole.GetTuplesFromTransactions(role.ID)
	if err != nil {
		return nil, nil, err
	}

	additions := make([]*openfgav1.TupleKey, 0)
	deletions := make([]*openfgav1.TupleKeyWithoutCondition, 0)

	existingTuplesMap := make(map[string]*openfgav1.TupleKey)
	for _, tuple := range existingTuples {
		existingTuplesMap[tuple.String()] = tuple
	}

	updatedTuplesMap := make(map[string]*openfgav1.TupleKey)
	for _, tuple := range updatedTuples {
		updatedTuplesMap[tuple.String()] = tuple
		if _, exists := existingTuplesMap[tuple.String()]; !exists {
			additions = append(additions, tuple)
		}
	}

	for _, tuple := range existingTuples {
		if _, exists := updatedTuplesMap[tuple.String()]; !exists {
			deletions = append(deletions, &openfgav1.TupleKeyWithoutCondition{
				User:     tuple.User,
				Relation: tuple.Relation,
				Object:   tuple.Object,
			})
		}
	}

	return additions, deletions, nil
}

func (role *Role) Update(updatedRole *UpdatableRole) {
	role.DisplayName = updatedRole.DisplayName
	role.Description = updatedRole.Description
	role.Transactions = updatedRole.Transactions
	role.UpdatedAt = time.Now()
}
