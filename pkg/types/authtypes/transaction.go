package authtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Transaction struct {
	ID       valuer.UUID `json:"-"`
	Relation Relation    `json:"relation" required:"true"`
	Object   Object      `json:"object" required:"true"`
}

type GettableTransaction struct {
	Relation   Relation `json:"relation" required:"true"`
	Object     Object   `json:"object" required:"true"`
	Authorized bool     `json:"authorized" required:"true"`
}

func NewTransaction(relation Relation, object Object) (*Transaction, error) {
	if !slices.Contains(TypeableRelations[object.Resource.Type], relation) {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidRelation, "invalid relation %s for type %s", relation.StringValue(), object.Resource.Type.StringValue())
	}

	return &Transaction{ID: valuer.GenerateUUID(), Relation: relation, Object: object}, nil
}

func NewGettableTransaction(transactions []*Transaction, results map[string]*TupleKeyAuthorization) []*GettableTransaction {
	gettableTransactions := make([]*GettableTransaction, len(transactions))
	for i, txn := range transactions {
		result := results[txn.ID.StringValue()]
		gettableTransactions[i] = &GettableTransaction{
			Relation:   txn.Relation,
			Object:     txn.Object,
			Authorized: result.Authorized,
		}
	}

	return gettableTransactions
}

func (transaction *Transaction) UnmarshalJSON(data []byte) error {
	var shadow = struct {
		Relation Relation
		Object   Object
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
