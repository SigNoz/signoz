package coretypes

import (
	"sort"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeInvalidVerbForType = errors.MustNewCode("invalid_verb")
	ErrCodeResourceNotFound   = errors.MustNewCode("resource_not_found")
)

var resourcesByRef = func() map[string]Resource {
	out := make(map[string]Resource, len(Resources))
	for _, r := range Resources {
		out[ResourceRef{Type: r.Type(), Kind: r.Kind()}.String()] = r
	}
	return out
}()

// NewResourceFromTypeAndKind looks up the canonical Resource for a (Type, Kind)
// pair from the static Resources slice. Returns an error if no match exists.
func NewResourceFromTypeAndKind(typed Type, kind Kind) (Resource, error) {
	if resource, ok := resourcesByRef[ResourceRef{Type: typed, Kind: kind}.String()]; ok {
		return resource, nil
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

// Registry exposes the static authz schema declared in this package and the
// derived views (sorted ResourceRefs and the verb→types inverse) computed
// once at construction. Direct package-level data (Types, Resources,
// ManagedRoles, ManagedRoleToTransactions) is read straight from this
// struct.
type Registry struct {
	resourceRefs []ResourceRef
	typesByVerb  map[Verb][]Type
}

func NewRegistry() *Registry {
	return &Registry{
		resourceRefs: buildResourceRefs(Resources),
		typesByVerb:  buildTypesByVerb(Types),
	}
}

func (registry *Registry) Types() []Type {
	return Types
}

func (registry *Registry) Resources() []Resource {
	return Resources
}

func (registry *Registry) ManagedRoles() []string {
	return ManagedRoles
}

func (registry *Registry) ManagedRoleTransactions() map[string][]Transaction {
	return ManagedRoleToTransactions
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
