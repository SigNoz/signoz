package preference

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Returns all preferences for the given organization
	ListByOrg(context.Context, valuer.UUID) ([]*preferencetypes.Preference, error)

	// Returns the preference for the given organization by name.
	GetByOrg(context.Context, valuer.UUID, preferencetypes.Name) (*preferencetypes.Preference, error)

	// Updates the preference for the given organization
	UpdateByOrg(context.Context, valuer.UUID, preferencetypes.Name, any) error

	// Returns all preferences for the given user
	ListByUser(context.Context, valuer.UUID) ([]*preferencetypes.Preference, error)

	// Returns the preference for the given user by name.
	GetByUser(context.Context, valuer.UUID, preferencetypes.Name) (*preferencetypes.Preference, error)

	// Updates the preference for the given user
	UpdateByUser(context.Context, valuer.UUID, preferencetypes.Name, any) error
}

type Handler interface {
	// Returns the preference for the given organization
	GetByOrg(http.ResponseWriter, *http.Request)

	// Updates the preference for the given organization
	UpdateByOrg(http.ResponseWriter, *http.Request)

	// Returns all preferences for the given organization
	ListByOrg(http.ResponseWriter, *http.Request)

	// Returns the preference for the given user
	GetByUser(http.ResponseWriter, *http.Request)

	// Updates the preference for the given user
	UpdateByUser(http.ResponseWriter, *http.Request)

	// Returns all preferences for the given user
	ListByUser(http.ResponseWriter, *http.Request)
}
