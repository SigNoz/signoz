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

const (
	SigNozAdminRoleName     = "signoz-admin"
	SigNozEditorRoleName    = "signoz-editor"
	SigNozViewerRoleName    = "signoz-viewer"
	SigNozAnonymousRoleName = "signoz-anonymous"
)

// ManagedPermission is a (verb, resource) tuple granted to a managed role.
// All managed permissions are wildcard — they apply to every instance of the type.
type ManagedPermission struct {
	Verb     Verb
	Resource GettableResource
}

var managedRolePermissions = map[string][]ManagedPermission{
	SigNozAnonymousRoleName: {
		{Verb: VerbRead, Resource: GettableResource{Type: TypeMetaResource, Kind: KindPublicDashboard}},
	},
}

// ManagedRolePermissions returns the static map of managed-role names to the
// (verb, resource) tuples granted to each role. All permissions are wildcard.
func ManagedRolePermissions() map[string][]ManagedPermission {
	return managedRolePermissions
}

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

// Registry is the assembled view over the static authz schema: the set of
// (Type, Kind) resources, the unique Type list, and the managed-role
// transaction policy expanded into concrete *Transaction objects.
type Registry struct {
	resources                 []*GettableResource
	uniqueTypes               []Type
	transactions              map[string][]*Transaction
	managedRolesByTransaction map[string][]string
}

func NewRegistry() *Registry {
	resources := ListResources()
	transactions := buildManagedRoleTransactions()

	return &Registry{
		resources:                 resources,
		uniqueTypes:               buildUniqueTypes(resources),
		transactions:              transactions,
		managedRolesByTransaction: buildManagedRolesByTransaction(transactions),
	}
}

func (registry *Registry) GetResources() []*GettableResource {
	return registry.resources
}

func (registry *Registry) GetUniqueTypes() []Type {
	return registry.uniqueTypes
}

func (registry *Registry) GetManagedRoleTransactions() map[string][]*Transaction {
	return registry.transactions
}

func (registry *Registry) GetManagedRolesByTransaction() map[string][]string {
	return registry.managedRolesByTransaction
}

func buildManagedRoleTransactions() map[string][]*Transaction {
	out := make(map[string][]*Transaction)
	for roleName, perms := range managedRolePermissions {
		for _, perm := range perms {
			object := *MustNewObject(perm.Resource, WildCardSelectorString)
			txn, err := NewTransaction(perm.Verb, object)
			if err != nil {
				panic(err)
			}
			out[roleName] = append(out[roleName], txn)
		}
	}
	return out
}

func buildUniqueTypes(resources []*GettableResource) []Type {
	seen := make(map[Type]struct{})
	out := make([]Type, 0)
	for _, resource := range resources {
		if _, ok := seen[resource.Type]; ok {
			continue
		}
		seen[resource.Type] = struct{}{}
		out = append(out, resource.Type)
	}
	return out
}

func buildManagedRolesByTransaction(transactions map[string][]*Transaction) map[string][]string {
	out := make(map[string][]string)
	for roleName, txns := range transactions {
		for _, txn := range txns {
			key := txn.TransactionKey()
			out[key] = append(out[key], roleName)
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
