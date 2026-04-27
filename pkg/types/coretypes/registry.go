package coretypes

import (
	"sort"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeInvalidVerbForType = errors.MustNewCode("invalid_verb")
	ErrCodeResourceNotFound   = errors.MustNewCode("resource_not_found")
)

// NewResourceFromTypeAndKind looks up the canonical Resource for a (Type, Kind)
// pair from the static Resources slice. Returns an error if no match exists.
func NewResourceFromTypeAndKind(typed Type, kind Kind) (Resource, error) {
	for _, resource := range Resources {
		if resource.Type().StringValue() == typed.StringValue() && resource.Kind().String() == kind.String() {
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

// Registry exposes the static authz schema declared in this package: the
// list of types, resources, managed roles, and the per-role transaction
// policy. It also pre-computes the derived views (sorted ResourceRefs and
// the verb→types inverse) once at construction so consumers can read them
// directly.
type Registry struct {
	types        []Type
	resources    []Resource
	resourceRefs []ResourceRef
	typesByVerb  map[Verb][]Type
	managedRoles []string
	transactions map[string][]Transaction
}

func NewRegistry() *Registry {
	return &Registry{
		types:        Types,
		resources:    Resources,
		resourceRefs: buildResourceRefs(Resources),
		typesByVerb:  buildTypesByVerb(Types),
		managedRoles: ManagedRoles,
		transactions: ManagedRoleToTransactions,
	}
}

func (registry *Registry) Types() []Type {
	return registry.types
}

func (registry *Registry) Resources() []Resource {
	return registry.resources
}

func (registry *Registry) ManagedRoles() []string {
	return registry.managedRoles
}

func (registry *Registry) ManagedRoleTransactions() map[string][]Transaction {
	return registry.transactions
}

// ResourceRefs returns every (Type, Kind) pair in the registry, sorted by
// type then kind. Used by the `generate authz` command to emit a stable
// schema.
func (registry *Registry) ResourceRefs() []ResourceRef {
	return registry.resourceRefs
}

// TypesByVerb is the inverse of Type.AllowedVerbs: for each verb, the list
// of types that allow it. Each list is sorted so the output is stable.
func (registry *Registry) TypesByVerb() map[Verb][]Type {
	return registry.typesByVerb
}

func buildResourceRefs(resources []Resource) []ResourceRef {
	out := make([]ResourceRef, 0, len(resources))
	for _, r := range resources {
		out = append(out, ResourceRef{Type: r.Type(), Kind: r.Kind()})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Type.StringValue() != out[j].Type.StringValue() {
			return out[i].Type.StringValue() < out[j].Type.StringValue()
		}
		return out[i].Kind.String() < out[j].Kind.String()
	})
	return out
}

func buildTypesByVerb(types []Type) map[Verb][]Type {
	out := make(map[Verb][]Type)
	for _, t := range types {
		for _, v := range t.AllowedVerbs() {
			out[v] = append(out[v], t)
		}
	}
	for _, ts := range out {
		sort.Slice(ts, func(i, j int) bool { return ts[i].StringValue() < ts[j].StringValue() })
	}
	return out
}

func ErrIfVerbNotValidForType(verb Verb, typed Type) error {
	if !typed.IsValidVerb(verb) {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidVerbForType, "verb %s is not valid for type %s", verb.StringValue(), typed.StringValue())
	}
	return nil
}
