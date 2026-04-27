package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type GettableResource struct {
	Type Type `json:"type" required:"true"`
	Kind Kind `json:"kind" required:"true"`
}

type Resource interface {
	// Type of the resource. Resources have finite types defined in the system.
	Type() Type

	// Kind of the resource.
	Kind() Kind

	// Prefix is the prefix of the resource. It is used to generate the object string for the resource.
	Prefix(orgId valuer.UUID) string

	// Object generates the object string for the resource. It is used to generate the object string for the resource.
	Object(orgId valuer.UUID, selector string) string

	// Scope of the resource.
	Scope(verb Verb) string
}

func NewGettableResource(resource Resource) *GettableResource {
	return &GettableResource{
		Type: resource.Type(),
		Kind: resource.Kind(),
	}
}
