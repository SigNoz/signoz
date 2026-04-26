package authtypes

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type typeableServiceAccount struct {
	coretypes.Typeable
}

func NewTypeableServiceAccount() *typeableServiceAccount {
	return &typeableServiceAccount{Typeable: coretypes.NewTypeableServiceAccount()}
}

func (typeableServiceAccount *typeableServiceAccount) Tuples(subject string, relation coretypes.Relation, selectors []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, selector := range selectors {
		object := typeableServiceAccount.Prefix(orgID) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}
