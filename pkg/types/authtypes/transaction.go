package authtypes

import (
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Resource struct {
	Name Name `json:"name"`
	Type Type `json:"type"`
}

type Object struct {
	Resource Resource `json:"resource"`
	Selector Selector `json:"selector"`
}

type Transaction struct {
	Relation Relation `json:"relation"`
	Object   Object   `json:"object"`
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

	return &Transaction{Relation: relation, Object: object}, nil
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
