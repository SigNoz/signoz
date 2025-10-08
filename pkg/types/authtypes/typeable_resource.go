package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableResource)

type typeableResource struct {
	name Name
}

func NewTypeableResource(name Name) (Typeable, error) {
	return &typeableResource{name: name}, nil
}

func MustNewTypeableResource(name Name) Typeable {
	typeableesource, err := NewTypeableResource(name)
	if err != nil {
		panic(err)
	}
	return typeableesource
}

func (typeableResource *typeableResource) Tuples(subject string, relation Relation, selector []Selector, orgId valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableResource.Prefix(orgId) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableResource *typeableResource) Type() Type {
	return TypeResource
}

func (typeableResource *typeableResource) Name() Name {
	return typeableResource.name
}

func (typeableResource *typeableResource) Prefix(orgId valuer.UUID) string {
	// example: resource:orgId/0199c47d-f61b-7833-bc5f-c0730f12f046/dashboard
	return typeableResource.Type().StringValue() + ":" + "organization" + "/" + orgId.StringValue() + "/" + typeableResource.Name().String()
}
