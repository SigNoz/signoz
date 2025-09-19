package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(role)

type role struct{}

func (role *role) Tuples(subject string, relation Relation, selector Selector, parentTypeable Typeable, parentSelectors ...Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range parentSelectors {
		resourcesTuples, err := parentTypeable.Tuples(subject, relation, selector, nil)
		if err != nil {
			return nil, err
		}
		tuples = append(tuples, resourcesTuples...)
	}

	object := strings.Join([]string{TypeRole.StringValue(), selector.String()}, ":")
	tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})

	return tuples, nil
}

func (role *role) Type() Type {
	return TypeRole
}

func (role *role) Name() Name {
	return MustNewName("role")
}
