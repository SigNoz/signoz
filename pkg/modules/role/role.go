package role

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Creates the role in sqlstore and tuples in authorization server
	Create(context.Context, *roletypes.PostableRole) error

	// Gets the role
	Get(context.Context, valuer.UUID, valuer.UUID) (*roletypes.GettableRole, error)

	// Lists all the roles for the organization
	List(context.Context, valuer.UUID) ([]*roletypes.GettableRole, error)

	// Gets all the typeable resources
	GetResources(context.Context) []*roletypes.Resource

	// Updates the role in sqlstore and tuples in authorization server
	Update(context.Context, valuer.UUID, valuer.UUID, *roletypes.UpdatableRole) error

	// Deletes the role in sqlstore and tuples in authorization server
	Delete(context.Context, valuer.UUID, valuer.UUID) error
}

type RegisterTypeable interface {
	MustGetTypeables() []authtypes.Typeable
}

type Handler interface {
	// Creates the role in sqlstore and tuples in authorization server
	Create(*http.Request, http.ResponseWriter)

	// Gets the role
	Get(*http.Request, http.ResponseWriter)

	// Lists all the roles for the organization
	List(*http.Request, http.ResponseWriter)

	// Gets all the typeable resources and the relations
	GetResourcesAndRelations(*http.Request, http.ResponseWriter)

	// Updates the role in sqlstore and tuples in authorization server
	Update(*http.Request, http.ResponseWriter)

	// Deletes the role in sqlstore and tuples in authorization server
	Delete(*http.Request, http.ResponseWriter)
}
