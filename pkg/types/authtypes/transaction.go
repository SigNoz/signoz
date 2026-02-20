package authtypes

import (
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Resource struct {
	Name Name `json:"name" required:"true"`
	Type Type `json:"type" required:"true"`
}

type Object struct {
	Resource Resource `json:"resource" required:"true"`
	Selector Selector `json:"selector" required:"true"`
}

type Transaction struct {
	ID       valuer.UUID `json:"id"`
	Relation Relation    `json:"relation" required:"true"`
	Object   Object      `json:"object" required:"true"`
}

type GettableTransaction struct {
	Relation   Relation `json:"relation" required:"true"`
	Object     Object   `json:"object" required:"true"`
	Authorized bool     `json:"authorized" required:"true"`
}

func NewObject(resource Resource, selector Selector) (*Object, error) {
	err := IsValidSelector(resource.Type, selector.val)
	if err != nil {
		return nil, err
	}

	return &Object{Resource: resource, Selector: selector}, nil
}

func MustNewObject(resource Resource, selector Selector) *Object {
	object, err := NewObject(resource, selector)
	if err != nil {
		panic(err)
	}

	return object
}

func MustNewObjectFromString(input string) *Object {
	parts := strings.Split(input, "/")
	if len(parts) != 4 {
		panic(errors.Newf(errors.TypeInternal, errors.CodeInternal, "invalid input format: %s", input))
	}

	typeParts := strings.Split(parts[0], ":")
	if len(typeParts) != 2 {
		panic(errors.Newf(errors.TypeInternal, errors.CodeInternal, "invalid type format: %s", parts[0]))
	}

	resource := Resource{
		Type: MustNewType(typeParts[0]),
		Name: MustNewName(parts[2]),
	}

	selector := MustNewSelector(resource.Type, parts[3])

	return &Object{Resource: resource, Selector: selector}
}

func MustNewObjectsFromStringSlice(input []string) []*Object {
	objects := make([]*Object, 0, len(input))
	for _, str := range input {
		objects = append(objects, MustNewObjectFromString(str))
	}
	return objects
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

func (object *Object) UnmarshalJSON(data []byte) error {
	var shadow = struct {
		Resource Resource
		Selector Selector
	}{}

	err := json.Unmarshal(data, &shadow)
	if err != nil {
		return err
	}

	obj, err := NewObject(shadow.Resource, shadow.Selector)
	if err != nil {
		return err
	}

	*object = *obj
	return nil
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
