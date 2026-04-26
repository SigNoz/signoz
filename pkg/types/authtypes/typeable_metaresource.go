package authtypes

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableMetaResource)

type typeableMetaResource struct {
	coretypes.Typeable
	kind coretypes.Kind
}

func NewTypeableMetaResource(kind coretypes.Kind) (Typeable, error) {
	core, err := coretypes.NewTypeableMetaResources(kind)
	if err != nil {
		return nil, err
	}

	return &typeableMetaResource{kind: kind, Typeable: core}, nil
}

func MustNewTypeableMetaResource(kind coretypes.Kind) Typeable {
	typeableesource, err := NewTypeableMetaResource(kind)
	if err != nil {
		panic(err)
	}

	return typeableesource
}

func (typeableMetaResource *typeableMetaResource) Tuples(subject string, relation coretypes.Relation, selectors []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, selector := range selectors {
		object := typeableMetaResource.Prefix(orgID) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}
