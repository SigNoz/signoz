package authtypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableOrganization)

type typeableOrganization struct{}

func (typeableOrganization *typeableOrganization) Tuples(subject string, relation Relation, selector []Selector, _ valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := strings.Join([]string{typeableOrganization.Type().StringValue(), selector.String()}, ":")
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableOrganization *typeableOrganization) Type() Type {
	return TypeOrganization
}

func (typeableOrganization *typeableOrganization) Name() Name {
	return MustNewName("organization")
}

func (typeableOrganization *typeableOrganization) Prefix(_ valuer.UUID) string {
	return typeableOrganization.Type().StringValue()
}
