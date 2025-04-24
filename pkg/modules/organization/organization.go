package organization

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Create creates the given organization
	Create(context.Context, *types.Organization) error

	// Get gets the organization based on the given id
	Get(context.Context, valuer.UUID) (*types.Organization, error)

	// GetAll gets all the organizations
	GetAll(context.Context) ([]*types.Organization, error)

	// Update updates the given organization based on id present
	Update(context.Context, *types.Organization) error
}

type API interface {
	// Get gets the organization based on the id in claims
	Get(http.ResponseWriter, *http.Request)

	// GetAll gets all the organizations
	GetAll(http.ResponseWriter, *http.Request)

	// Update updates the organization based on the id in claims
	Update(http.ResponseWriter, *http.Request)
}
