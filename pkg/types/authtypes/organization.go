package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(organization)

type organization struct{}

func (organization *organization) Tuples(subject string, relation Relation, selector Selector, parentTypeable Typeable, parentSelectors ...Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	object := strings.Join([]string{TypeRole.StringValue(), selector.String()}, ":")
	tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})

	return tuples, nil
}

func (organization *organization) Type() Type {
	return TypeOrganization
}

func (organization *organization) Name() Name {
	return MustNewName("organization")
}
