package authtypes

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type typeableRole struct {
	coretypes.Typeable
}

func NewTypeableRole() *typeableRole {
	return &typeableRole{Typeable: coretypes.NewTypeableRole()}
}

func (typeableRole *typeableRole) Tuples(subject string, relation coretypes.Relation, selectors []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, selector := range selectors {
		object := typeableRole.Prefix(orgID) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}
