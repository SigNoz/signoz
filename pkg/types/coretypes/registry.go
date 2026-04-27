package coretypes

import (
	"slices"

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
		KindDashboard:       ResourceMetaResourceDashboard,
		KindPublicDashboard: ResourceMetaResourcePublicDashboard,
	},
	TypeMetaResources: {
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
// support it. Used by /api/v1/authz/resources to publish the authz schema.
func VerbsForTypes() map[Verb][]Type {
	out := make(map[Verb][]Type)
	for typed, verbs := range typeToVerbs {
		for _, verb := range verbs {
			out[verb] = append(out[verb], typed)
		}
	}
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
