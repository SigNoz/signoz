package role

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Setter interface {
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
	PatchObjects(context.Context, valuer.UUID, valuer.UUID, authtypes.Relation, []*authtypes.Object, []*authtypes.Object) error

	// Deletes the role and tuples in authorization server.
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	RegisterTypeable
}

type Getter interface {
	// Gets the role
	Get(context.Context, valuer.UUID, valuer.UUID) (*roletypes.Role, error)

	// Gets the role by org_id and name
	GetByOrgIDAndName(context.Context, valuer.UUID, string) (*roletypes.Role, error)

	// Lists all the roles for the organization.
	List(context.Context, valuer.UUID) ([]*roletypes.Role, error)

	//  Lists all the roles for the organization filtered by name
	ListByOrgIDAndNames(context.Context, valuer.UUID, []string) ([]*roletypes.Role, error)
}

type Granter interface {
	// Grants a role to the subject based on role name.
	Grant(context.Context, valuer.UUID, string, string) error

	// Grants a role to the subject based on role id.
	GrantByID(context.Context, valuer.UUID, valuer.UUID, string) error

	// Revokes a granted role from the subject based on role name.
	Revoke(context.Context, valuer.UUID, string, string) error

	// Changes the granted role for the subject based on role name.
	ModifyGrant(context.Context, valuer.UUID, string, string, string) error

	// Bootstrap the managed roles.
	CreateManagedRoles(context.Context, valuer.UUID, []*roletypes.Role) error
}

type RegisterTypeable interface {
	MustGetTypeables() []authtypes.Typeable
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	GetObjects(http.ResponseWriter, *http.Request)

	GetResources(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Patch(http.ResponseWriter, *http.Request)

	PatchObjects(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)
}
