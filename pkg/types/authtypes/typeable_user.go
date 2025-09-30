package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableUser)

type typeableUser struct{}

func (typeableUser *typeableUser) Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := strings.Join([]string{typeableUser.Type().StringValue(), selector.String()}, ":")
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableUser *typeableUser) Type() Type {
	return TypeUser
}

func (typeableUser *typeableUser) Name() Name {
	return MustNewName("user")
}

func (typeableUser *typeableUser) Prefix() string {
	return typeableUser.Type().StringValue()
}
