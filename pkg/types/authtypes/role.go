package authtypes

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(role)

type role struct{}

func (role *role) Tuples(subject string, relation Relation, selector Selector, parentTypeable Typeable, parentSelectors ...Selector) ([]*openfgav1.CheckRequestTupleKey, error) {
	if !slices.Contains(typeRoleSupportedRelations, relation) {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZUnsupportedRelation, "unsupported relation for type %s, supported relations are %v", TypeRole.StringValue(), typeRoleSupportedRelations)
	}

	tuples := make([]*openfgav1.CheckRequestTupleKey, 0)
	// for each resource if the parent resources selectors are present then we need to add them to tuples
	for _, selector := range parentSelectors {
		resourcesTuples, err := parentTypeable.Tuples(subject, relation, selector, nil)
		if err != nil {
			return nil, err
		}
		tuples = append(tuples, resourcesTuples...)
	}

	object := strings.Join([]string{TypeRole.StringValue(), selector.String()}, ":")
	tuples = append(tuples, &openfgav1.CheckRequestTupleKey{User: subject, Relation: relation.StringValue(), Object: object})

	return tuples, nil
}

func (role *role) Type() Type {
	return TypeRole
}
