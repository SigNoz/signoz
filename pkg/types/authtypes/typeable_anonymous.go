package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableAnonymous)

var (
	AnonymousUser = valuer.UUID{}
)

type typeableAnonymous struct{}

func (typeableAnonymous *typeableAnonymous) Tuples(subject string, relation Relation, selector []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableAnonymous.Prefix(orgID) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableAnonymous *typeableAnonymous) Type() Type {
	return TypeAnonymous
}

func (typeableAnonymous *typeableAnonymous) Name() Name {
	return MustNewName("anonymous")
}

// example: anonymous:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/anonymous
func (typeableAnonymous *typeableAnonymous) Prefix(orgID valuer.UUID) string {
	return typeableAnonymous.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableAnonymous.Name().String()
}
