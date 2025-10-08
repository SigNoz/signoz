package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableResources)

type typeableResources struct {
	name Name
}

func NewTypeableResources(name Name) (Typeable, error) {
	return &typeableResources{name: name}, nil
}

func MustNewTypeableResources(name Name) Typeable {
	resources, err := NewTypeableResources(name)
	if err != nil {
		panic(err)
	}
	return resources
}

func (typeableResources *typeableResources) Tuples(subject string, relation Relation, selector []Selector, orgId valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableResources.Prefix(orgId) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableResources *typeableResources) Type() Type {
	return TypeResources
}

func (typeableResources *typeableResources) Name() Name {
	return typeableResources.name
}

func (typeableResources *typeableResources) Prefix(orgId valuer.UUID) string {
	// example: resources:orgId/0199c47d-f61b-7833-bc5f-c0730f12f046/dashboards
	return typeableResources.Type().StringValue() + ":" + "organization" + "/" + orgId.StringValue() + "/" + typeableResources.Name().String()
}
