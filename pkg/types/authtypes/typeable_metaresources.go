package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableMetaResources)

type typeableMetaResources struct {
	name Name
}

func NewTypeableMetaResources(name Name) (Typeable, error) {
	return &typeableMetaResources{name: name}, nil
}

func MustNewTypeableMetaResources(name Name) Typeable {
	resources, err := NewTypeableMetaResources(name)
	if err != nil {
		panic(err)
	}

	return resources
}

func (typeableResources *typeableMetaResources) Tuples(subject string, relation Relation, selector []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableResources.Prefix(orgID) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableMetaResources *typeableMetaResources) Type() Type {
	return TypeMetaResources
}

func (typeableMetaResources *typeableMetaResources) Name() Name {
	return typeableMetaResources.name
}

// example: metaresources:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/dashboards
func (typeableMetaResources *typeableMetaResources) Prefix(orgID valuer.UUID) string {
	return typeableMetaResources.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableMetaResources.Name().String()
}
