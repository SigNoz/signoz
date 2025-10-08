package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableRole)

type typeableRole struct{}

func (typeableRole *typeableRole) Tuples(subject string, relation Relation, selector []Selector, orgId valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableRole.Prefix(orgId) + "/" + selector.String()
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

func (typeableRole *typeableRole) Prefix(orgId valuer.UUID) string {
	// example: role:orgId/0199c47d-f61b-7833-bc5f-c0730f12f046/role
	return typeableRole.Type().StringValue() + ":" + "organization" + "/" + orgId.StringValue() + "/" + typeableRole.Name().String()
}
