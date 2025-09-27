package authdomain

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// List all auth domains for an organization.
	ListByOrgID(context.Context, valuer.UUID) ([]*types.GettableOrgDomain, error)

	// Create a new auth domain for an organization.
	Create(context.Context, *types.GettableOrgDomain) error

	// Update an existing auth domain for an organization.
	Update(context.Context, *types.GettableOrgDomain) error

	// Delete an existing auth domain by id.
	Delete(context.Context, valuer.UUID) error
}

type Handler interface {
	ListDomains(http.ResponseWriter, *http.Request)
	CreateDomain(http.ResponseWriter, *http.Request)
	UpdateDomain(http.ResponseWriter, *http.Request)
	DeleteDomain(http.ResponseWriter, *http.Request)
}
