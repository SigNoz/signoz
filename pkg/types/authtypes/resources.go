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

func (resources *resources) Tuples(subject string, relation Relation, selector Selector, _ Typeable, _ ...Selector) ([]*openfgav1.TupleKey, error) {
	object := strings.Join([]string{TypeResources.StringValue(), resources.name.String(), selector.String()}, ":")
	return []*openfgav1.TupleKey{{User: subject, Relation: relation.StringValue(), Object: object}}, nil
}

func (resources *resources) Type() Type {
	return TypeResources
}

func (resources *resources) Name() Name {
	return resources.name
}
