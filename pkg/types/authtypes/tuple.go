package authtypes

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type TupleKeyAuthorization struct {
	Tuple      *openfgav1.TupleKey
	Authorized bool
}

func NewTuples(resource coretypes.Resource, subject string, verb coretypes.Verb, selectors []Selector, orgID valuer.UUID) []*openfgav1.TupleKey {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, selector := range selectors {
		object := resource.Object(orgID, selector.String())
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: verb.StringValue(), Object: object})
	}

	return tuples
}

func NewTuplesFromTransactions(transactions []*Transaction, subject string, orgID valuer.UUID) (map[string]*openfgav1.TupleKey, error) {
	tuples := make(map[string]*openfgav1.TupleKey, len(transactions))
	for _, txn := range transactions {
		resource, err := coretypes.NewResourceFromTypeAndKind(txn.Object.Resource.Type, txn.Object.Resource.Kind)
		if err != nil {
			return nil, err
		}

		txnTuples := NewTuples(resource, subject, txn.Relation, []Selector{txn.Object.Selector}, orgID)

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

		if txn.Object.Resource.Type == coretypes.TypeRole && txn.Relation == coretypes.VerbAssignee {
			resource, err := coretypes.NewResourceFromTypeAndKind(txn.Object.Resource.Type, txn.Object.Resource.Kind)
			if err != nil {
				return nil, nil, nil, err
			}

			txnTuples := NewTuples(resource, subject, txn.Relation, []Selector{txn.Object.Selector}, orgID)

			tuples[txnID] = txnTuples[0]
			continue
		}

		roleNames, found := managedRolesByTransaction[txn.TransactionKey()]
		if !found || len(roleNames) == 0 {
			preResolved[txnID] = false
			continue
		}

		for _, roleName := range roleNames {
			roleSelector := MustNewSelector(coretypes.TypeRole, roleName)
			roleTuples := NewTuples(coretypes.ResourceRole, subject, coretypes.VerbAssignee, []Selector{roleSelector}, orgID)

			correlationID := valuer.GenerateUUID().StringValue()
			tuples[correlationID] = roleTuples[0]
			roleCorrelations[txnID] = append(roleCorrelations[txnID], correlationID)
		}
	}

	return tuples, preResolved, roleCorrelations, nil
}
