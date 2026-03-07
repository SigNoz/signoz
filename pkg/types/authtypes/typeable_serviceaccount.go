package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableServiceAccount)

type typeableServiceAccount struct{}

func (typeableServiceAccount *typeableServiceAccount) Tuples(subject string, relation Relation, selectors []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, selector := range selectors {
		object := typeableServiceAccount.Prefix(orgID) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableServiceAccount *typeableServiceAccount) Type() Type {
	return TypeServiceAccount
}

func (typeableServiceAccount *typeableServiceAccount) Name() Name {
	return MustNewName("serviceaccount")
}

// example: serviceaccount:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/serviceaccount
func (typeableServiceAccount *typeableServiceAccount) Prefix(orgID valuer.UUID) string {
	return typeableServiceAccount.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableServiceAccount.Name().String()
}

func (typeableServiceAccount *typeableServiceAccount) Scope(relation Relation) string {
	return typeableServiceAccount.Name().String() + ":" + relation.StringValue()
}
