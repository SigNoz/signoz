package serviceaccount

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Creates a new service account for an organization.
	Create(context.Context, valuer.UUID, *serviceaccounttypes.ServiceAccount) error

	GetOrCreate(context.Context, *serviceaccounttypes.ServiceAccount) (*serviceaccounttypes.ServiceAccount, error)
	// Gets a service account by id.
	Get(context.Context, valuer.UUID, valuer.UUID) (*serviceaccounttypes.ServiceAccount, error)

	// Gets a service account by id without fetching roles.
	GetWithoutRoles(context.Context, valuer.UUID, valuer.UUID) (*serviceaccounttypes.ServiceAccount, error)

	// List all service accounts for an organization.
	List(context.Context, valuer.UUID) ([]*serviceaccounttypes.ServiceAccount, error)

	// Updates an existing service account
	Update(context.Context, valuer.UUID, *serviceaccounttypes.ServiceAccount) error

	// Updates an existing service account status
	UpdateStatus(context.Context, valuer.UUID, *serviceaccounttypes.ServiceAccount) error

	// Deletes an existing service account by id
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	// Creates a new API key for a service account
	CreateFactorAPIKey(context.Context, *serviceaccounttypes.FactorAPIKey) error

	// Gets a factor API key by id
	GetFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) (*serviceaccounttypes.FactorAPIKey, error)

	// Lists all the API keys for a service account
	ListFactorAPIKey(context.Context, valuer.UUID) ([]*serviceaccounttypes.FactorAPIKey, error)

	// Updates an existing API key for a service account
	UpdateFactorAPIKey(context.Context, valuer.UUID, *serviceaccounttypes.FactorAPIKey) error

	// Revokes an existing API key for a service account
	RevokeFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) error
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Update(http.ResponseWriter, *http.Request)

	UpdateStatus(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)

	CreateFactorAPIKey(http.ResponseWriter, *http.Request)

	ListFactorAPIKey(http.ResponseWriter, *http.Request)

	UpdateFactorAPIKey(http.ResponseWriter, *http.Request)

	RevokeFactorAPIKey(http.ResponseWriter, *http.Request)
}
