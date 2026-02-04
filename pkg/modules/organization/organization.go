package organization

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Getter interface {
	// Get gets the organization based on the given id
	Get(context.Context, valuer.UUID) (*types.Organization, error)

	// ListByOwnedKeyRange gets all the organizations owned by the instance
	ListByOwnedKeyRange(context.Context) ([]*types.Organization, error)
}

type Setter interface {
	// Create creates the given organization
	Create(context.Context, *types.Organization) error

	// Update updates the given organization
	Update(context.Context, *types.Organization) error
}

type Handler interface {
	// Get gets the organization based on the id in claims
	Get(http.ResponseWriter, *http.Request)

	// Update updates the organization based on the id in claims
	Update(http.ResponseWriter, *http.Request)
}
