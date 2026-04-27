package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var Resources = []Resource{
	ResourceAnonymous,
	ResourceOrganization,
	ResourceRole,
	ResourceServiceAccount,
	ResourceUser,
	ResourceMetaResourceRole,
	ResoureceMetaResourcesRole,
	ResourceMetaResourceDashboard,
	ResourceMetaResourcesDashboard,
	ResourceMetaResourcePublicDashboard,
	ResourceMetaResourcesPublicDashboard,
}

var (
	ResourceAnonymous                    Resource = NewResourceAnonymous()
	ResourceOrganization                          = NewResourceOrganization()
	ResourceRole                                  = NewResourceRole()
	ResourceServiceAccount                        = NewResourceServiceAccount()
	ResourceUser                                  = NewResourceUser()
	ResourceMetaResourceRole                      = NewResourceMetaResource(KindRole)
	ResoureceMetaResourcesRole                    = NewResourceMetaResources(KindRole)
	ResourceMetaResourceDashboard                 = NewResourceMetaResource(KindDashboard)
	ResourceMetaResourcesDashboard                = NewResourceMetaResources(KindDashboard)
	ResourceMetaResourcePublicDashboard           = NewResourceMetaResource(KindPublicDashboard)
	ResourceMetaResourcesPublicDashboard          = NewResourceMetaResources(KindPublicDashboard)
)

type ResourceRef struct {
	Type Type `json:"type" required:"true"`
	Kind Kind `json:"kind" required:"true"`
}

// String returns a stable string identifier for the (Type, Kind) pair.
// ResourceRef itself isn't comparable (Type embeds a slice), so callers
// that need a map key use ref.String() — this also satisfies fmt.Stringer.
func (ref ResourceRef) String() string {
	return ref.Type.StringValue() + ":" + ref.Kind.String()
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

func NewResourceRef(resource Resource) *ResourceRef {
	return &ResourceRef{
		Type: resource.Type(),
		Kind: resource.Kind(),
	}
}
