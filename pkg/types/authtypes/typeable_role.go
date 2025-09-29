package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableRole)

type typeableRole struct{}

func (typeableRole *typeableRole) Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := strings.Join([]string{typeableRole.Type().StringValue(), selector.String()}, ":")
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableRole *typeableRole) Type() Type {
	return TypeRole
}

func (typeableRole *typeableRole) Name() Name {
	return MustNewName("role")
}

func (typeableRole *typeableRole) Prefix() string {
	return typeableRole.Type().StringValue()
}
