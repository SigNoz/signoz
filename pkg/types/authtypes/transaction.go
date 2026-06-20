package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Transaction struct {
	ID       valuer.UUID      `json:"-"`
	Relation Relation         `json:"relation" required:"true"`
	Object   coretypes.Object `json:"object" required:"true"`
}

type TransactionGroup struct {
	Relation    Relation              `json:"relation" required:"true"`
	ObjectGroup coretypes.ObjectGroup `json:"objectGroup" required:"true"`
}

type TransactionGroups []*TransactionGroup

type GettableTransaction struct {
	Relation   Relation         `json:"relation" required:"true"`
	Object     coretypes.Object `json:"object" required:"true"`
	Authorized bool             `json:"authorized" required:"true"`
}

type TransactionWithAuthorization struct {
	Transaction *Transaction
	Authorized  bool
}

func NewTransaction(relation Relation, object coretypes.Object) (*Transaction, error) {
	if err := coretypes.ErrIfVerbNotValidForResource(relation.Verb, object.Resource); err != nil {
		return nil, err
	}

	return &Transaction{ID: valuer.GenerateUUID(), Relation: relation, Object: object}, nil
}

func NewTransactionGroup(relation Relation, objectGroup coretypes.ObjectGroup) (*TransactionGroup, error) {
	if err := coretypes.ErrIfVerbNotValidForResource(relation.Verb, objectGroup.Resource); err != nil {
		return nil, err
	}

	if _, err := coretypes.NewObjectsFromObjectGroup(objectGroup); err != nil {
		return nil, err
	}

	return &TransactionGroup{Relation: relation, ObjectGroup: objectGroup}, nil
}

func NewGettableTransaction(results []*TransactionWithAuthorization) []*GettableTransaction {
	gettableTransactions := make([]*GettableTransaction, len(results))
	for i, result := range results {
		gettableTransactions[i] = &GettableTransaction{
			Relation:   result.Transaction.Relation,
			Object:     result.Transaction.Object,
			Authorized: result.Authorized,
		}
	}

	return gettableTransactions
}

func (groups TransactionGroups) Diff(desired TransactionGroups) (additions, deletions TransactionGroups) {
	return desired.subtract(groups), groups.subtract(desired)
}

func (transaction *Transaction) UnmarshalJSON(data []byte) error {
	var shadow = struct {
		Relation Relation
		Object   coretypes.Object
	}{}

	err := json.Unmarshal(data, &shadow)
	if err != nil {
		return err
	}

	txn, err := NewTransaction(shadow.Relation, shadow.Object)
	if err != nil {
		return err
	}

	*transaction = *txn
	return nil
}

func (transactionGroup *TransactionGroup) UnmarshalJSON(data []byte) error {
	var shadow = struct {
		Relation    Relation
		ObjectGroup coretypes.ObjectGroup
	}{}

	err := json.Unmarshal(data, &shadow)
	if err != nil {
		return err
	}

	group, err := NewTransactionGroup(shadow.Relation, shadow.ObjectGroup)
	if err != nil {
		return err
	}

	*transactionGroup = *group
	return nil
}

func (transaction *Transaction) TransactionKey() string {
	return transaction.Relation.StringValue() + ":" + transaction.Object.Resource.Type.StringValue() + ":" + transaction.Object.Resource.Kind.String()
}

func (groups TransactionGroups) subtract(other TransactionGroups) TransactionGroups {
	otherSelectors := other.selectorSet()

	order := make([]string, 0)
	grouped := make(map[string]*TransactionGroup)
	for _, group := range groups {
		for _, selector := range group.ObjectGroup.Selectors {
			if _, ok := otherSelectors[group.selectorKey(selector)]; ok {
				continue
			}

			groupKey := group.Relation.StringValue() + "|" + group.ObjectGroup.Resource.String()
			out, ok := grouped[groupKey]
			if !ok {
				out = &TransactionGroup{Relation: group.Relation, ObjectGroup: coretypes.ObjectGroup{Resource: group.ObjectGroup.Resource, Selectors: make([]coretypes.Selector, 0)}}
				grouped[groupKey] = out
				order = append(order, groupKey)
			}
			out.ObjectGroup.Selectors = append(out.ObjectGroup.Selectors, selector)
		}
	}

	result := make(TransactionGroups, 0, len(order))
	for _, key := range order {
		result = append(result, grouped[key])
	}

	return result
}

func (groups TransactionGroups) selectorSet() map[string]struct{} {
	set := make(map[string]struct{})
	for _, group := range groups {
		for _, selector := range group.ObjectGroup.Selectors {
			set[group.selectorKey(selector)] = struct{}{}
		}
	}

	return set
}

func (group *TransactionGroup) selectorKey(selector coretypes.Selector) string {
	return group.Relation.StringValue() + "|" + group.ObjectGroup.Resource.String() + "|" + selector.String()
}
