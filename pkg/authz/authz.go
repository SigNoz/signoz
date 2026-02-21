package authz

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type AuthZ interface {
	factory.Service

	// CheckWithTupleCreation takes upon the responsibility for generating the tuples alongside everything Check does.
	CheckWithTupleCreation(context.Context, authtypes.Claims, valuer.UUID, authtypes.Relation, authtypes.Typeable, []authtypes.Selector, []authtypes.Selector) error

	// CheckWithTupleCreationWithoutClaims checks permissions for anonymous users.
	CheckWithTupleCreationWithoutClaims(context.Context, valuer.UUID, authtypes.Relation, authtypes.Typeable, []authtypes.Selector, []authtypes.Selector) error

	// BatchCheck accepts a map of ID → tuple and returns a map of ID → authorization result.
	BatchCheck(context.Context, map[string]*openfgav1.TupleKey) (map[string]*authtypes.TupleKeyAuthorization, error)

	// Write accepts the insertion tuples and the deletion tuples.
	Write(context.Context, []*openfgav1.TupleKey, []*openfgav1.TupleKey) error

	// Lists the selectors for objects assigned to subject (s) with relation (r) on resource (s)
	ListObjects(context.Context, string, authtypes.Relation, authtypes.Typeable) ([]*authtypes.Object, error)

	// Creates the role.
	Create(context.Context, valuer.UUID, *roletypes.Role) error

	// Gets the role if it exists or creates one.
	GetOrCreate(context.Context, valuer.UUID, *roletypes.Role) (*roletypes.Role, error)

	// Gets the objects associated with the given role and relation.
	GetObjects(context.Context, valuer.UUID, valuer.UUID, authtypes.Relation) ([]*authtypes.Object, error)

	// Gets all the typeable resources registered from role registry.
	GetResources(context.Context) []*authtypes.Resource

	// Patches the role.
	Patch(context.Context, valuer.UUID, *roletypes.Role) error

	// Patches the objects in authorization server associated with the given role and relation
	PatchObjects(context.Context, valuer.UUID, string, authtypes.Relation, []*authtypes.Object, []*authtypes.Object) error

	// Deletes the role and tuples in authorization server.
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	// Gets the role
	Get(context.Context, valuer.UUID, valuer.UUID) (*roletypes.Role, error)

	// Gets the role by org_id and name
	GetByOrgIDAndName(context.Context, valuer.UUID, string) (*roletypes.Role, error)

	// Lists all the roles for the organization.
	List(context.Context, valuer.UUID) ([]*roletypes.Role, error)

	//  Lists all the roles for the organization filtered by name
	ListByOrgIDAndNames(context.Context, valuer.UUID, []string) ([]*roletypes.Role, error)

	// Grants a role to the subject based on role name.
	Grant(context.Context, valuer.UUID, string, string) error

	// Revokes a granted role from the subject based on role name.
	Revoke(context.Context, valuer.UUID, string, string) error

	// Changes the granted role for the subject based on role name.
	ModifyGrant(context.Context, valuer.UUID, string, string, string) error

	// Bootstrap the managed roles.
	CreateManagedRoles(context.Context, valuer.UUID, []*roletypes.Role) error

	// Bootstrap managed roles transactions and user assignments
	CreateManagedUserRoleTransactions(context.Context, valuer.UUID, valuer.UUID) error
}

type RegisterTypeable interface {
	MustGetTypeables() []authtypes.Typeable

	MustGetManagedRoleTransactions() map[string][]*authtypes.Transaction
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	GetObjects(http.ResponseWriter, *http.Request)

	GetResources(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Patch(http.ResponseWriter, *http.Request)

	PatchObjects(http.ResponseWriter, *http.Request)

	Check(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)
}
