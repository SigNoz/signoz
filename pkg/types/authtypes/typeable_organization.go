package authtypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type typeableOrganization struct {
	coretypes.Typeable
}

func NewTypeableOrganization() *typeableOrganization {
	return &typeableOrganization{Typeable: coretypes.NewTypeableOrganization()}
}

func (typeableOrganization *typeableOrganization) Tuples(subject string, relation coretypes.Relation, selectors []Selector, _ valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, selector := range selectors {
		object := strings.Join([]string{typeableOrganization.Type().StringValue(), selector.String()}, ":")
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}
