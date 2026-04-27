package coretypes

import (
	"slices"
	"sort"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeResourceNotFound   = errors.MustNewCode("resource_not_found")
	ErrCodeInvalidVerbForType = errors.MustNewCode("invalid_verb")
)

var typeToVerbs = map[Type][]Verb{
	TypeUser:           {VerbRead, VerbUpdate, VerbDelete},
	TypeServiceAccount: {VerbRead, VerbUpdate, VerbDelete},
	TypeRole:           {VerbAssignee, VerbRead, VerbUpdate, VerbDelete},
	TypeOrganization:   {VerbRead, VerbUpdate, VerbDelete},
	TypeMetaResource:   {VerbRead, VerbUpdate, VerbDelete},
	TypeMetaResources:  {VerbCreate, VerbList},
}

var (
	KindAnonymous       Kind = MustNewKind("anonymous")
	KindOrganization         = MustNewKind("organization")
	KindRole                 = MustNewKind("role")
	KindServiceAccount       = MustNewKind("serviceaccount")
	KindUser                 = MustNewKind("user")
	KindDashboard            = MustNewKind("dashboard")
	KindPublicDashboard      = MustNewKind("public-dashboard")
)

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

var registry = map[Type]map[Kind]Resource{
	TypeAnonymous: {
		KindAnonymous: ResourceAnonymous,
	},
	TypeOrganization: {
		KindOrganization: ResourceOrganization,
	},
	TypeRole: {
		KindRole: ResourceRole,
	},
	TypeServiceAccount: {
		KindServiceAccount: ResourceServiceAccount,
	},
	TypeUser: {
		KindUser: ResourceUser,
	},
	TypeMetaResource: {
		KindRole:            ResourceMetaResourceRole,
		KindDashboard:       ResourceMetaResourceDashboard,
		KindPublicDashboard: ResourceMetaResourcePublicDashboard,
	},
	TypeMetaResources: {
		KindRole:            ResoureceMetaResourcesRole,
		KindDashboard:       ResourceMetaResourcesDashboard,
		KindPublicDashboard: ResourceMetaResourcesPublicDashboard,
	},
}

func NewResourceFromTypeAndKind(typed Type, kind Kind) (Resource, error) {
	if kindMap, ok := registry[typed]; ok {
		if resource, ok := kindMap[kind]; ok {
			return resource, nil
		}
	}

	return nil, errors.Newf(errors.TypeNotFound, ErrCodeResourceNotFound, "no resource found for type %s and kind %s", typed.StringValue(), kind.String())
}

func MustNewResourceFromTypeAndKind(typed Type, kind Kind) Resource {
	resource, err := NewResourceFromTypeAndKind(typed, kind)
	if err != nil {
		panic(err)
	}

	return resource
}

// VerbsForTypes returns the inverse of typeToVerbs: verb → list of types that
// support it. Each verb's type list is sorted alphabetically so consumers
// (notably the `generate authz` command) produce stable output.
func VerbsForTypes() map[Verb][]Type {
	out := make(map[Verb][]Type)
	for typed, verbs := range typeToVerbs {
		for _, verb := range verbs {
			out[verb] = append(out[verb], typed)
		}
	}
	for _, types := range out {
		sort.Slice(types, func(i, j int) bool { return types[i].StringValue() < types[j].StringValue() })
	}
	return out
}

// ListResources returns every (Type, Kind) pair declared in the registry,
// sorted by type then kind. Used by `generate authz` to emit the static
// authz schema consumed by the frontend.
func ListResources() []*GettableResource {
	out := make([]*GettableResource, 0)
	for typed, kindMap := range registry {
		for kind := range kindMap {
			out = append(out, &GettableResource{Type: typed, Kind: kind})
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Type != out[j].Type {
			return out[i].Type.StringValue() < out[j].Type.StringValue()
		}
		return out[i].Kind.String() < out[j].Kind.String()
	})
	return out
}

func ErrIfVerbNotValidForType(verb Verb, typed Type) error {
	if validVerbs, ok := typeToVerbs[typed]; ok {
		if !slices.Contains(validVerbs, verb) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidVerbForType, "verb %s is not valid for type %s, valid verbs are: %s", verb.StringValue(), typed.StringValue(), validVerbs)
		}
	}

	return nil
}
