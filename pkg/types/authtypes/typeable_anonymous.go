package authtypes

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableAnonymous)

var (
	AnonymousUser = valuer.UUID{}
)

type typeableAnonymous struct {
	coretypes.Typeable
}

func NewTypeableAnonymous() *typeableAnonymous {
	return &typeableAnonymous{Typeable: coretypes.NewTypeableAnonymous()}
}

func (typeableAnonymous *typeableAnonymous) Tuples(subject string, relation coretypes.Relation, selector []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableAnonymous.Prefix(orgID) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}
