package authtypes

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type rawTransactionGroup struct {
	Relation    string `json:"relation"`
	ObjectGroup struct {
		Resource struct {
			Type string `json:"type"`
			Kind string `json:"kind"`
		} `json:"resource"`
		Selectors []string `json:"selectors"`
	} `json:"objectGroup"`
}

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

func NewTransactionGroups(data []byte) (TransactionGroups, error) {
	var rawGroups []rawTransactionGroup
	if err := json.Unmarshal(data, &rawGroups); err != nil {
		return nil, errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "transactionGroups must be an array of {relation, objectGroup} objects")
	}

	groups := make(TransactionGroups, 0, len(rawGroups))
	for index, rawGroup := range rawGroups {
		group, err := newTransactionGroup(rawGroup, index)
		if err != nil {
			return nil, err
		}

		groups = append(groups, group)
	}

	return groups, nil
}

func NewTransactionGroupsFromTransactions(transactions []coretypes.Transaction) TransactionGroups {
	objectsByVerb := make(map[string][]*coretypes.Object)
	for _, transaction := range transactions {
		object := transaction.Object
		objectsByVerb[transaction.Verb.StringValue()] = append(objectsByVerb[transaction.Verb.StringValue()], &object)
	}

	groups := make(TransactionGroups, 0)
	for _, verb := range coretypes.Verbs {
		objects := objectsByVerb[verb.StringValue()]
		if len(objects) == 0 {
			continue
		}

		for _, objectGroup := range coretypes.NewObjectGroupsFromObjects(objects) {
			groups = append(groups, &TransactionGroup{Relation: Relation{Verb: verb}, ObjectGroup: *objectGroup})
		}
	}

	return groups
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

func (groups TransactionGroups) Value() (driver.Value, error) {
	data, err := json.Marshal(groups)
	if err != nil {
		return nil, err
	}

	return string(data), nil
}

func (groups *TransactionGroups) Scan(value any) error {
	if value == nil {
		*groups = make(TransactionGroups, 0)
		return nil
	}

	var data []byte
	switch typed := value.(type) {
	case string:
		data = []byte(typed)
	case []byte:
		data = typed
	default:
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "unsupported type %T for transaction groups", value)
	}

	parsed, err := NewTransactionGroups(data)
	if err != nil {
		return errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan transactionGroups")
	}

	*groups = parsed
	return nil
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

func newTransactionGroup(raw rawTransactionGroup, index int) (*TransactionGroup, error) {
	verb, err := coretypes.NewVerb(raw.Relation)
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "transactionGroups[%d].relation: %s", index, err.Error())
	}

	resourceType, err := coretypes.NewType(raw.ObjectGroup.Resource.Type)
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "transactionGroups[%d].objectGroup.resource.type: %s", index, err.Error())
	}

	kind, err := coretypes.NewKind(raw.ObjectGroup.Resource.Kind)
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "transactionGroups[%d].objectGroup.resource.kind: %s", index, err.Error())
	}

	resourceRef := coretypes.ResourceRef{Type: resourceType, Kind: kind}
	if err := coretypes.ErrIfVerbNotValidForResource(verb, resourceRef); err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "transactionGroups[%d]: %s", index, err.Error())
	}

	selectors := make([]coretypes.Selector, 0, len(raw.ObjectGroup.Selectors))
	for selectorIndex, rawSelector := range raw.ObjectGroup.Selectors {
		if resourceType.Equals(coretypes.TypeTelemetryResource) {
			rawSelector, err = telemetrytypes.NewTelemetryGrantSelector(rawSelector)
			if err != nil {
				return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "transactionGroups[%d].objectGroup.selectors[%d]: %s", index, selectorIndex, err.Error())
			}
		}

		selector, err := resourceType.Selector(rawSelector)
		if err != nil {
			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "transactionGroups[%d].objectGroup.selectors[%d]: %s", index, selectorIndex, err.Error())
		}
		selectors = append(selectors, selector)
	}

	return &TransactionGroup{
		Relation:    Relation{Verb: verb},
		ObjectGroup: coretypes.ObjectGroup{Resource: resourceRef, Selectors: selectors},
	}, nil
}
