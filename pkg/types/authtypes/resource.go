package authtypes

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(resource)

type resource struct {
	name Name
}

func MustNewResource(name string) Typeable {
	return &resource{name: MustNewName(name)}
}

func (resource *resource) Tuples(subject string, relation Relation, selector Selector, parentTypeable Typeable, parentSelectors ...Selector) ([]*openfgav1.CheckRequestTupleKey, error) {
	if !slices.Contains(typeResourceSupportedRelations, relation) {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZUnsupportedRelation, "unsupported relation for type %s, supported relations are %v", TypeResource.StringValue(), typeResourceSupportedRelations)
	}

	tuples := make([]*openfgav1.CheckRequestTupleKey, 0)
	for _, selector := range parentSelectors {
		resourcesTuples, err := parentTypeable.Tuples(subject, relation, selector, nil)
		if err != nil {
			return nil, err
		}
		tuples = append(tuples, resourcesTuples...)
	}

	object := strings.Join([]string{TypeResource.StringValue(), resource.name.String(), selector.String()}, ":")
	tuples = append(tuples, &openfgav1.CheckRequestTupleKey{User: subject, Relation: relation.StringValue(), Object: object})

	return tuples, nil
}

func (resource *resource) Type() Type {
	return TypeResource
}
