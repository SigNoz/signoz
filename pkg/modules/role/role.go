package role

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Creates the role metadata and tuples in authorization server
	Create(context.Context, *roletypes.PostableRole) error

	// Gets the role metadata
	Get(context.Context, valuer.UUID, valuer.UUID) (*roletypes.GettableRole, error)

	// Gets the objects associated with the given role and relation
	GetObjects(context.Context, valuer.UUID, valuer.UUID, authtypes.Relation) ([]*authtypes.Object, error)

	// Lists all the roles metadata for the organization
	List(context.Context, valuer.UUID) ([]*roletypes.GettableRole, error)

	// Gets all the typeable resources registered from role registry
	GetResources(context.Context) []*authtypes.Resource

	// Patches the roles metadata
	Patch(context.Context, valuer.UUID, valuer.UUID, *roletypes.PatchableRoleMetadata) error

	// Patches the objects in authorization server associated with the given role and relation
	PatchObjects(context.Context, valuer.UUID, valuer.UUID, authtypes.Relation, *roletypes.PatchableRelationObjects) error

	// Deletes the role metadata and tuples in authorization server
	Delete(context.Context, valuer.UUID, valuer.UUID) error
}

type RegisterTypeable interface {
	MustGetTypeables() []authtypes.Typeable
}

type Handler interface {
	// Creates the role metadata and tuples in authorization server
	Create(*http.Request, http.ResponseWriter)

	// Gets the role metadata
	Get(*http.Request, http.ResponseWriter)

	// Gets the objects for the given relation and role
	GetObjects(*http.Request, http.ResponseWriter)

	// Gets all the resources and the relations
	GetResources(*http.Request, http.ResponseWriter)

	// Lists all the roles metadata for the organization
	List(*http.Request, http.ResponseWriter)

	// Gets all the typeable resources and the relations
	GetResourcesAndRelations(*http.Request, http.ResponseWriter)

	// Patches the role metdata
	Patch(*http.Request, http.ResponseWriter)

	// Patches the objects for the given relation and role
	PatchObjects(*http.Request, http.ResponseWriter)

	// Deletes the role metadata and tuples in authorization server
	Delete(*http.Request, http.ResponseWriter)
}
