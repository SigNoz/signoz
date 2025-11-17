package role

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Creates the role.
	Create(context.Context, *roletypes.Role) error

	// Gets the role if it exists or creates one.
	GetOrCreate(context.Context, *roletypes.Role) (*roletypes.Role, error)

	// Gets the role
	Get(context.Context, valuer.UUID, valuer.UUID) (*roletypes.Role, error)

	// Gets the objects associated with the given role and relation.
	GetObjects(context.Context, valuer.UUID, valuer.UUID, authtypes.Relation) ([]*authtypes.Object, error)

	// Lists all the roles for the organization.
	List(context.Context, valuer.UUID) ([]*roletypes.Role, error)

	// Gets all the typeable resources registered from role registry.
	GetResources(context.Context) []*authtypes.Resource

	// Patches the role.
	Patch(context.Context, valuer.UUID, *roletypes.Role) error

	// Patches the objects in authorization server associated with the given role and relation
	PatchObjects(context.Context, valuer.UUID, valuer.UUID, authtypes.Relation, []*authtypes.Object, []*authtypes.Object) error

	// Deletes the role and tuples in authorization server.
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	// Assigns role to the given subject.
	Assign(context.Context, valuer.UUID, valuer.UUID, string) error

	RegisterTypeable
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
