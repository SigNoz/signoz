package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableResources)

type typeableResources struct {
	name Name
}

func NewTypeableResources(name Name) (Typeable, error) {
	return &typeableResources{name: name}, nil
}

func MustNewTypeableResources(name Name) Typeable {
	resources, err := NewTypeableResources(name)
	if err != nil {
		panic(err)
	}
	return resources
}

func (typeableResources *typeableResources) Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableResources.Prefix() + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableResources *typeableResources) Type() Type {
	return TypeResources
}

func (typeableResources *typeableResources) Name() Name {
	return typeableResources.name
}

func (typeableResources *typeableResources) Prefix() string {
	return strings.Join([]string{typeableResources.Type().StringValue(), typeableResources.Name().String()}, ":")
}
