package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(resources)

type resources struct {
	name Name
}

func MustNewResources(name string) Typeable {
	return &resources{name: MustNewName(name)}
}

func (resources *resources) Tuples(subject string, relation Relation, selector Selector, _ Typeable, _ ...Selector) ([]*openfgav1.CheckRequestTupleKey, error) {
	object := strings.Join([]string{TypeResources.StringValue(), resources.name.String(), selector.String()}, ":")
	return []*openfgav1.CheckRequestTupleKey{{User: subject, Relation: relation.StringValue(), Object: object}}, nil
}

func (resources *resources) Type() Type {
	return TypeResources
}
