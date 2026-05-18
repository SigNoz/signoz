package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

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

	// AllowedVerbs returns the verbs that are valid for this resource.
	// By default, this delegates to the type's allowed verbs, but specific
	// resources can restrict the set further (e.g., some metaresource kinds
	// may not support attach/detach).
	AllowedVerbs() []Verb
}

type ResourceRef struct {
	Type Type `json:"type" required:"true"`
	Kind Kind `json:"kind" required:"true"`
}

func NewResourceRef(resource Resource) *ResourceRef {
	return &ResourceRef{
		Type: resource.Type(),
		Kind: resource.Kind(),
	}
}

func (ref ResourceRef) String() string {
	return ref.Type.StringValue() + ":" + ref.Kind.String()
}
