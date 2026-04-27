package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeAuthZInvalidRelation = errors.MustNewCode("authz_invalid_relation")
	ErrCodeInvalidPatchObject   = errors.MustNewCode("authz_invalid_patch_objects")
)

type Transaction struct {
	ID       valuer.UUID    `json:"-"`
	Relation coretypes.Verb `json:"relation" required:"true"`
	Object   Object         `json:"object" required:"true"`
}

type GettableTransaction struct {
	Relation   coretypes.Verb `json:"relation" required:"true"`
	Object     Object         `json:"object" required:"true"`
	Authorized bool           `json:"authorized" required:"true"`
}

type TransactionWithAuthorization struct {
	Transaction *Transaction
	Authorized  bool
}

func NewTransaction(relation coretypes.Verb, object Object) (*Transaction, error) {
	if err := coretypes.ErrIfVerbNotValidForType(relation, object.Resource.Type); err != nil {
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

// NewTransactionWithAuthorizationFromBatchResults merges batch check results into an ordered
// slice of TransactionWithAuthorization matching the input transactions order.
// preResolved contains txn IDs whose authorization was determined without BatchCheck.
// roleCorrelations maps txn IDs to correlation IDs used for managed role checks.
func NewTransactionWithAuthorizationFromBatchResults(
	transactions []*Transaction,
	batchResults map[string]*TupleKeyAuthorization,
	preResolved map[string]bool,
	roleCorrelations map[string][]string,
) []*TransactionWithAuthorization {
	output := make([]*TransactionWithAuthorization, len(transactions))
	for i, txn := range transactions {
		txnID := txn.ID.StringValue()

		if authorized, ok := preResolved[txnID]; ok {
			output[i] = &TransactionWithAuthorization{
				Transaction: txn,
				Authorized:  authorized,
			}
			continue
		}

		if txn.Object.Resource.Type == coretypes.TypeRole && txn.Relation == coretypes.VerbAssignee {
			output[i] = &TransactionWithAuthorization{
				Transaction: txn,
				Authorized:  batchResults[txnID].Authorized,
			}
			continue
		}

		correlationIDs := roleCorrelations[txnID]
		authorized := false
		for _, correlationID := range correlationIDs {
			if result, exists := batchResults[correlationID]; exists && result.Authorized {
				authorized = true
				break
			}
		}

		output[i] = &TransactionWithAuthorization{
			Transaction: txn,
			Authorized:  authorized,
		}
	}

	return output
}

func (transaction *Transaction) UnmarshalJSON(data []byte) error {
	var shadow = struct {
		Relation coretypes.Verb
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

func (transaction *Transaction) TransactionKey() string {
	return transaction.Relation.StringValue() + ":" + transaction.Object.Resource.Type.StringValue() + ":" + transaction.Object.Resource.Kind.String()
}
