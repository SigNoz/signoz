package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableUser)

type typeableUser struct{}

func (typeableUser *typeableUser) Tuples(subject string, relation Relation, selector []Selector, orgId valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableUser.Prefix(orgId) + "/" + selector.String()
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

func (typeableUser *typeableUser) Prefix(orgId valuer.UUID) string {
	return typeableUser.Type().StringValue() + ":" + "organization" + "/" + orgId.StringValue()
}
