package licensing

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeUnsupported = errors.MustNewCode("licensing_unsupported")
)

type License interface {
	factory.Service

	// Validate validates the license with the upstream server
	Validate(ctx context.Context) error
	// Update updates the license based on ID
	Update(ctx context.Context, organizationID valuer.UUID, license *licensetypes.GettableLicense) error
	// Activate validates and enables the license
	Activate(ctx context.Context, organizationID valuer.UUID, key string) error
	// Get fetches the license based on ID
	Get(ctx context.Context, organizationID valuer.UUID, ID valuer.UUID) (*licensetypes.GettableLicense, error)
	// GetAll fetches all the licenses for the org
	GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.GettableLicense, error)
	// GetActive fetches the current active license in org
	GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.GettableLicense, error)
	// Refresh refreshes the license state from upstream server
	Refresh(ctx context.Context, organizationID valuer.UUID) error

	// feature surrogate
	// CheckFeature checks if the feature is active or not
	CheckFeature(ctx context.Context, key string) error
	// GetFeatureFlags fetches all the defined feature flags
	GetFeatureFlag(ctx context.Context, key string) (*featuretypes.GettableFeature, error)
	// GetFeatureFlags fetches all the defined feature flags
	GetFeatureFlags(ctx context.Context) ([]*featuretypes.GettableFeature, error)
	// InitFeatures initialises the feature flags
	InitFeatures(ctx context.Context, features []*featuretypes.GettableFeature) error
	// UpdateFeatureFlag updates the feature flag
	UpdateFeatureFlag(ctx context.Context, feature *featuretypes.GettableFeature) error

	ListOrganizations(ctx context.Context) ([]valuer.UUID, error)
}

type API interface {
	Activate(http.ResponseWriter, *http.Request)
	Refresh(http.ResponseWriter, *http.Request)
	GetActive(http.ResponseWriter, *http.Request)
}
