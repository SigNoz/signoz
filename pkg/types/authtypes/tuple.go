package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type TupleKeyAuthorization struct {
	Tuple      *openfgav1.TupleKey
	Authorized bool
}

func NewTuplesFromTransactions(transactions []*Transaction, subject string, orgID valuer.UUID) (map[string]*openfgav1.TupleKey, error) {
	tuples := make(map[string]*openfgav1.TupleKey, len(transactions))
	for _, txn := range transactions {
		typeable, err := NewTypeableFromType(txn.Object.Resource.Type, txn.Object.Resource.Name)
		if err != nil {
			return nil, err
		}

		txnTuples, err := typeable.Tuples(subject, txn.Relation, []Selector{txn.Object.Selector}, orgID)
		if err != nil {
			return nil, err
		}

		// Each transaction produces one tuple, keyed by transaction ID
		tuples[txn.ID.StringValue()] = txnTuples[0]
	}

	return tuples, nil
}
