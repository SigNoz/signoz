package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableResource)

type typeableResource struct {
	name Name
}

func NewTypeableResource(name Name) (Typeable, error) {
	return &typeableResource{name: name}, nil
}

func MustNewTypeableResource(name Name) Typeable {
	typeableesource, err := NewTypeableResource(name)
	if err != nil {
		panic(err)
	}
	return typeableesource
}

func (typeableResource *typeableResource) Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableResource.Prefix() + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableResource *typeableResource) Type() Type {
	return TypeResource
}

func (typeableResource *typeableResource) Name() Name {
	return typeableResource.name
}

func (typeableResource *typeableResource) Prefix() string {
	return strings.Join([]string{typeableResource.Type().StringValue(), typeableResource.Name().String()}, ":")
}
