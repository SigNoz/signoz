package serviceaccount

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Creates a new service account for an organization.
	Create(context.Context, valuer.UUID, *serviceaccounttypes.ServiceAccount) error

	// Gets a service account with roles by id.
	GetWithRoles(context.Context, valuer.UUID, valuer.UUID) (*serviceaccounttypes.ServiceAccountWithRoles, error)

	// Gets or creates a service account by name
	GetOrCreate(context.Context, valuer.UUID, *serviceaccounttypes.ServiceAccount) (*serviceaccounttypes.ServiceAccount, error)

	// Gets a service account by id
	Get(context.Context, valuer.UUID, valuer.UUID) (*serviceaccounttypes.ServiceAccount, error)

	// List all service accounts for an organization.
	List(context.Context, valuer.UUID) ([]*serviceaccounttypes.ServiceAccount, error)

	// Updates an existing service account
	Update(context.Context, valuer.UUID, *serviceaccounttypes.ServiceAccount) error

	// Assign a role to the service account. this is safe to retry
	SetRole(context.Context, valuer.UUID, valuer.UUID, valuer.UUID) error

	// Assigns a role by name to service account, this is safe to retry
	SetRoleByName(context.Context, valuer.UUID, valuer.UUID, string) error

	// Revokes a role from service account, this is safe to retry
	DeleteRole(context.Context, valuer.UUID, valuer.UUID, valuer.UUID) error

	// Deletes an existing service account by id
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	// Creates a new API key for a service account
	CreateFactorAPIKey(context.Context, *serviceaccounttypes.FactorAPIKey) error

	// Gets a factor API key by id
	GetFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) (*serviceaccounttypes.FactorAPIKey, error)

	// Gets or creates a factor api key by name
	GetOrCreateFactorAPIKey(context.Context, *serviceaccounttypes.FactorAPIKey) (*serviceaccounttypes.FactorAPIKey, error)

	// Lists all the API keys for a service account
	ListFactorAPIKey(context.Context, valuer.UUID) ([]*serviceaccounttypes.FactorAPIKey, error)

	// Updates an existing API key for a service account
	UpdateFactorAPIKey(context.Context, valuer.UUID, valuer.UUID, *serviceaccounttypes.FactorAPIKey) error

	// Set the last observed at for an api key.
	SetLastObservedAt(context.Context, string, time.Time) error

	// Revokes an existing API key for a service account
	RevokeFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) error

	// Gets the identity for service account based on the factor api key.
	GetIdentity(context.Context, string) (*authtypes.Identity, error)

	Config() Config

	statsreporter.StatsCollector
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	GetRoles(http.ResponseWriter, *http.Request)

	GetMe(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Update(http.ResponseWriter, *http.Request)

	UpdateMe(http.ResponseWriter, *http.Request)

	SetRole(http.ResponseWriter, *http.Request)

	DeleteRole(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)

	CreateFactorAPIKey(http.ResponseWriter, *http.Request)

	ListFactorAPIKey(http.ResponseWriter, *http.Request)

	UpdateFactorAPIKey(http.ResponseWriter, *http.Request)

	RevokeFactorAPIKey(http.ResponseWriter, *http.Request)
}
