package authdomain

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// List all auth domains for an organization.
	ListByOrgID(context.Context, valuer.UUID) ([]*authtypes.AuthDomain, error)

	// Get an auth domain by id.
	Get(context.Context, valuer.UUID) (*authtypes.AuthDomain, error)

	// Get an auth domain by orgID and id.
	GetByOrgIDAndID(context.Context, valuer.UUID, valuer.UUID) (*authtypes.AuthDomain, error)

	// Get an auth domain by name and orgID.
	GetByNameAndOrgID(context.Context, string, valuer.UUID) (*authtypes.AuthDomain, error)

	// Create a new auth domain for an organization.
	Create(context.Context, *authtypes.AuthDomain) error

	// Update an existing auth domain.
	Update(context.Context, *authtypes.AuthDomain) error

	// Delete an existing auth domain by id.
	Delete(context.Context, valuer.UUID, valuer.UUID) error
}

type Handler interface {
	List(http.ResponseWriter, *http.Request)
	Create(http.ResponseWriter, *http.Request)
	Update(http.ResponseWriter, *http.Request)
	Delete(http.ResponseWriter, *http.Request)
}
