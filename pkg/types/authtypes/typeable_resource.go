package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableesource)

type typeableesource struct {
	name Name
}

func NewTypeableResource(name Name) (Typeable, error) {
	return &typeableesource{name: name}, nil
}

func MustNewTypeableResource(name Name) Typeable {
	typeableesource, err := NewTypeableResource(name)
	if err != nil {
		panic(err)
	}
	return typeableesource
}

func (typeableesource *typeableesource) Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableesource.Prefix() + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableesource *typeableesource) Type() Type {
	return TypeResource
}

func (typeableesource *typeableesource) Name() Name {
	return typeableesource.name
}

func (typeableesource *typeableesource) Prefix() string {
	return strings.Join([]string{typeableesource.Type().StringValue(), typeableesource.Name().String()}, ":")
}
