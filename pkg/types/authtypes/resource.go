package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(resource)

type resource struct {
	name Name
}

func NewResource(name Name) (Typeable, error) {
	return &resource{name: name}, nil
}

func MustNewResource(name Name) Typeable {
	resource, err := NewResource(name)
	if err != nil {
		panic(err)
	}
	return resource
}

func (resource *resource) Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := resource.Prefix() + ":" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (resource *resource) Type() Type {
	return TypeResource
}

func (resource *resource) Name() Name {
	return resource.name
}

func (resource *resource) Prefix() string {
	return strings.Join([]string{resource.Type().StringValue(), resource.Name().String()}, ":")
}
