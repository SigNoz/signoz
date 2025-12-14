package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(typeableMetaResource)

type typeableMetaResource struct {
	name Name
}

func NewTypeableMetaResource(name Name) (Typeable, error) {
	return &typeableMetaResource{name: name}, nil
}

func MustNewTypeableMetaResource(name Name) Typeable {
	typeableesource, err := NewTypeableMetaResource(name)
	if err != nil {
		panic(err)
	}

	return typeableesource
}

func (typeableMetaResource *typeableMetaResource) Tuples(subject string, relation Relation, selector []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)
	for _, selector := range selector {
		object := typeableMetaResource.Prefix(orgID) + "/" + selector.String()
		tuples = append(tuples, &openfgav1.TupleKey{User: subject, Relation: relation.StringValue(), Object: object})
	}

	return tuples, nil
}

func (typeableMetaResource *typeableMetaResource) Type() Type {
	return TypeMetaResource
}

func (typeableMetaResource *typeableMetaResource) Name() Name {
	return typeableMetaResource.name
}

// example: metaresource:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/dashboard
func (typeableMetaResource *typeableMetaResource) Prefix(orgID valuer.UUID) string {
	return typeableMetaResource.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableMetaResource.Name().String()
}
