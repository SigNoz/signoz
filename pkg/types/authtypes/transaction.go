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
	if err := coretypes.ErrIfVerbNotValidForType(relation.Verb, object.Resource.Type); err != nil {
		return nil, err
	}

	return &Transaction{ID: valuer.GenerateUUID(), Relation: relation, Object: object}, nil
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

func (transaction *Transaction) TransactionKey() string {
	return transaction.Relation.StringValue() + ":" + transaction.Object.Resource.Type.StringValue() + ":" + transaction.Object.Resource.Kind.String()
}
