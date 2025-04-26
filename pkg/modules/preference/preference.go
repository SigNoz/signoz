package preference

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
)

type Module interface {
	// Returns the preference for the given organization
	GetOrg(ctx context.Context, preferenceId string, orgId string) (*preferencetypes.GettablePreference, error)

	// Returns the preference for the given user
	GetUser(ctx context.Context, preferenceId string, orgId string, userId string) (*preferencetypes.GettablePreference, error)

	// Returns all preferences for the given organization
	GetAllOrg(ctx context.Context, orgId string) ([]*preferencetypes.PreferenceWithValue, error)

	// Returns all preferences for the given user
	GetAllUser(ctx context.Context, orgId string, userId string) ([]*preferencetypes.PreferenceWithValue, error)

	// Updates the preference for the given organization
	UpdateOrg(ctx context.Context, preferenceId string, preferenceValue interface{}, orgId string) error

	// Updates the preference for the given user
	UpdateUser(ctx context.Context, preferenceId string, preferenceValue interface{}, userId string) error
}

type Handler interface {
	// Returns the preference for the given organization
	GetOrg(http.ResponseWriter, *http.Request)

	// Updates the preference for the given organization
	UpdateOrg(http.ResponseWriter, *http.Request)

	// Returns all preferences for the given organization
	GetAllOrg(http.ResponseWriter, *http.Request)

	// Returns the preference for the given user
	GetUser(http.ResponseWriter, *http.Request)

	// Updates the preference for the given user
	UpdateUser(http.ResponseWriter, *http.Request)

	// Returns all preferences for the given user
	GetAllUser(http.ResponseWriter, *http.Request)
}
