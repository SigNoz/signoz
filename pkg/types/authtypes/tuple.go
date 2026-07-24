package authtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var (
	ErrCodeAuthZUnavailable = errors.MustNewCode("authz_unavailable")
	ErrCodeAuthZForbidden   = errors.MustNewCode("authz_forbidden")
	ErrCodeAuthZInvalidType = errors.MustNewCode("authz_invalid_type")
	ErrCodeTypeableNotFound = errors.MustNewCode("typeable_not_found")
)

type TupleKeyAuthorization struct {
	Tuple      *openfgav1.TupleKey
	Authorized bool
}

func NewTuples(resource coretypes.Resource, subject string, relation Relation, selectors []coretypes.Selector, orgID valuer.UUID) []*openfgav1.TupleKey {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, selector := range selectors {
		object := resource.Object(orgID, selector.String())
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
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

		txnTuples := NewTuples(resource, subject, txn.Relation, []coretypes.Selector{txn.Object.Selector}, orgID)

		// Each transaction produces one tuple, keyed by transaction ID
		tuples[txn.ID.StringValue()] = txnTuples[0]
	}

	return tuples, nil
}

func NewTuplesFromTransactionGroups(name string, orgID valuer.UUID, transactionGroups []*TransactionGroup) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	subject := MustNewSubject(coretypes.NewResourceRole(), name, orgID, &coretypes.VerbAssignee)

	for _, transactionGroup := range transactionGroups {
		if err := coretypes.ErrIfVerbNotValidForResource(transactionGroup.Relation.Verb, transactionGroup.ObjectGroup.Resource); err != nil {
			return nil, err
		}

		resource, err := coretypes.NewResourceFromTypeAndKind(transactionGroup.ObjectGroup.Resource.Type, transactionGroup.ObjectGroup.Resource.Kind)
		if err != nil {
			return nil, err
		}

		objectGroupTuples := NewTuples(resource, subject, transactionGroup.Relation, transactionGroup.ObjectGroup.Selectors, orgID)
		tuples = append(tuples, objectGroupTuples...)
	}

	return tuples, nil
}

func DiffTuples(existing, desired []*openfgav1.TupleKey) (additions, deletions []*openfgav1.TupleKey) {
	key := func(tuple *openfgav1.TupleKey) string {
		return tuple.GetUser() + "|" + tuple.GetRelation() + "|" + tuple.GetObject()
	}

	existingSet := make(map[string]struct{}, len(existing))
	for _, tuple := range existing {
		existingSet[key(tuple)] = struct{}{}
	}

	desiredSet := make(map[string]struct{}, len(desired))
	for _, tuple := range desired {
		desiredSet[key(tuple)] = struct{}{}
	}

	additions = make([]*openfgav1.TupleKey, 0)
	for _, tuple := range desired {
		if _, ok := existingSet[key(tuple)]; !ok {
			additions = append(additions, tuple)
		}
	}

	deletions = make([]*openfgav1.TupleKey, 0)
	for _, tuple := range existing {
		if _, ok := desiredSet[key(tuple)]; !ok {
			deletions = append(deletions, tuple)
		}
	}

	return additions, deletions
}

func MustNewTransactionGroupsFromTuples(tuples []*openfgav1.TupleKey) TransactionGroups {
	objectsByRelation := make(map[string][]*coretypes.Object)

	for _, tuple := range tuples {
		verb, err := coretypes.NewVerb(tuple.GetRelation())
		if err != nil {
			panic(err)
		}

		object := coretypes.MustNewObjectFromString(tuple.GetObject())
		objectsByRelation[verb.StringValue()] = append(objectsByRelation[verb.StringValue()], object)
	}

	transactionGroups := make(TransactionGroups, 0)
	for _, verb := range coretypes.Verbs {
		objects := objectsByRelation[verb.StringValue()]
		if len(objects) == 0 {
			continue
		}

		for _, objectGroup := range coretypes.NewObjectGroupsFromObjects(objects) {
			transactionGroups = append(transactionGroups, &TransactionGroup{
				Relation:    Relation{Verb: verb},
				ObjectGroup: *objectGroup,
			})
		}
	}

	return transactionGroups
}

func NewTuplesFromTransactionsWithCorrelations(transactions []*Transaction, subject string, orgID valuer.UUID) (tuples map[string]*openfgav1.TupleKey, correlations map[string][]string, err error) {
	tuples = make(map[string]*openfgav1.TupleKey)
	correlations = make(map[string][]string)

	for _, txn := range transactions {
		resource, err := coretypes.NewResourceFromTypeAndKind(txn.Object.Resource.Type, txn.Object.Resource.Kind)
		if err != nil {
			return nil, nil, err
		}

		selectorStrings, err := newCheckSelectors(txn.Object.Resource.Type, txn.Object.Selector)
		if err != nil {
			return nil, nil, err
		}

		selectors := make([]coretypes.Selector, 0, len(selectorStrings))
		for _, selectorString := range selectorStrings {
			selector, err := txn.Object.Resource.Type.Selector(selectorString)
			if err != nil {
				return nil, nil, err
			}
			selectors = append(selectors, selector)
		}

		txnID := txn.ID.StringValue()
		for index, tuple := range NewTuples(resource, subject, txn.Relation, selectors, orgID) {
			if index == 0 {
				tuples[txnID] = tuple
				continue
			}

			correlationID := valuer.GenerateUUID().StringValue()
			tuples[correlationID] = tuple
			correlations[txnID] = append(correlations[txnID], correlationID)
		}
	}

	return tuples, correlations, nil
}

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

		if txn.Object.Resource.Type.Equals(coretypes.TypeRole) && txn.Relation.Verb == coretypes.VerbAssignee {
			resource, err := coretypes.NewResourceFromTypeAndKind(txn.Object.Resource.Type, txn.Object.Resource.Kind)
			if err != nil {
				return nil, nil, nil, err
			}

			txnTuples := NewTuples(resource, subject, txn.Relation, []coretypes.Selector{txn.Object.Selector}, orgID)

			tuples[txnID] = txnTuples[0]
			continue
		}

		roleNames, found := managedRolesByTransaction[txn.TransactionKey()]
		if !found || len(roleNames) == 0 {
			preResolved[txnID] = false
			continue
		}

		for _, roleName := range roleNames {
			roleSelector := coretypes.TypeRole.MustSelector(roleName)
			roleTuples := NewTuples(coretypes.ResourceRole, subject, Relation{Verb: coretypes.VerbAssignee}, []coretypes.Selector{roleSelector}, orgID)

			correlationID := valuer.GenerateUUID().StringValue()
			tuples[correlationID] = roleTuples[0]
			roleCorrelations[txnID] = append(roleCorrelations[txnID], correlationID)
		}
	}

	return tuples, preResolved, roleCorrelations, nil
}

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

		if txn.Object.Resource.Type.Equals(coretypes.TypeRole) && txn.Relation.Verb == coretypes.VerbAssignee {
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

func newCheckSelectors(resourceType coretypes.Type, selector coretypes.Selector) ([]string, error) {
	if resourceType.Equals(coretypes.TypeTelemetryResource) {
		canonical, err := telemetrytypes.NewTelemetryGrantSelector(selector.String())
		if err != nil {
			return nil, err
		}

		return telemetrytypes.NewTelemetryGrantSelectors(canonical), nil
	}

	selectorStrings := []string{selector.String()}
	if selector.String() != coretypes.WildCardSelectorString {
		selectorStrings = append(selectorStrings, coretypes.WildCardSelectorString)
	}

	return selectorStrings, nil
}
