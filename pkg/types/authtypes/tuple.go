package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type TupleKeyAuthorization struct {
	Tuple      *openfgav1.TupleKey
	Authorized bool
}

// TransactionKey returns a composite key for matching transactions to managed roles.
func (transaction *Transaction) TransactionKey() string {
	return transaction.Relation.StringValue() + ":" + transaction.Object.Resource.Type.StringValue() + ":" + transaction.Object.Resource.Name.String()
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

// NewTuplesFromTransactionsWithManagedRoles converts transactions to tuples for BatchCheck.
// Direct role-assignment transactions (TypeRole + RelationAssignee) produce one tuple keyed by txn ID.
// Other transactions are expanded via managedRolesByTransaction into role-assignee checks, keyed by "txnID:roleName".
// Transactions with no managed role mapping are marked as pre-resolved (false) in the returned map.
func NewTuplesFromTransactionsWithManagedRoles(
	transactions []*Transaction,
	subject string,
	orgID valuer.UUID,
	managedRolesByTransaction map[string][]string,
) (tuples map[string]*openfgav1.TupleKey, preResolved map[string]bool, roleCorrelations map[string][]string, err error) {
	tuples = make(map[string]*openfgav1.TupleKey)
	preResolved = make(map[string]bool)
	roleCorrelations = make(map[string][]string)

	for _, txn := range transactions {
		txnID := txn.ID.StringValue()

		if txn.Object.Resource.Type == TypeRole && txn.Relation == RelationAssignee {
			typeable, err := NewTypeableFromType(txn.Object.Resource.Type, txn.Object.Resource.Name)
			if err != nil {
				return nil, nil, nil, err
			}

			txnTuples, err := typeable.Tuples(subject, txn.Relation, []Selector{txn.Object.Selector}, orgID)
			if err != nil {
				return nil, nil, nil, err
			}

			tuples[txnID] = txnTuples[0]
			continue
		}

		roleNames, found := managedRolesByTransaction[txn.TransactionKey()]
		if !found || len(roleNames) == 0 {
			preResolved[txnID] = false
			continue
		}

		for _, roleName := range roleNames {
			roleSelector := MustNewSelector(TypeRole, roleName)
			roleTuples, err := TypeableRole.Tuples(subject, RelationAssignee, []Selector{roleSelector}, orgID)
			if err != nil {
				return nil, nil, nil, err
			}

			correlationID := valuer.GenerateUUID().StringValue()
			tuples[correlationID] = roleTuples[0]
			roleCorrelations[txnID] = append(roleCorrelations[txnID], correlationID)
		}
	}

	return tuples, preResolved, roleCorrelations, nil
}
