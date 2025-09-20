package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(resources)

type resources struct {
	name Name
}

func MustNewResources(name Name) Typeable {
	return &resources{name: name}
}

func (resources *resources) Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := strings.Join([]string{TypeResources.StringValue(), resources.name.String(), selector.String()}, ":")
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (resources *resources) Type() Type {
	return TypeResources
}

func (resources *resources) Name() Name {
	return resources.name
}
