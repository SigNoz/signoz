package authtypes

import (
	"strings"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(user)

type user struct{}

func (user *user) Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := strings.Join([]string{TypeUser.StringValue(), selector.String()}, ":")
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (user *user) Type() Type {
	return TypeUser
}

func (user *user) Name() Name {
	return MustNewName("user")
}

func (user *user) Prefix() string {
	return user.Type().StringValue()
}
