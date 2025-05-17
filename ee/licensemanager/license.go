package licensemanager

import (
	"context"

	"github.com/SigNoz/signoz/ee/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/factory"
)

type License interface {
	factory.Service

	// Activate validates and enables the license
	Activate(ctx context.Context, ID string) error
	// Get fetches the license based on ID
	Get(ctx context.Context, orgID string, ID string) (*licensetypes.LicenseV3, error)
	// GetAll fetches all the licenses for the org
	GetAll(ctx context.Context, orgID string) ([]*licensetypes.LicenseV3, error)
	// GetActive fetches the current active license in org
	GetActive(ctx context.Context, orgID string) (*licensetypes.LicenseV3, error)
	// Refresh refreshes the license state from upstream server
	Refresh()

	// feature surrogate
	// CheckFeature checks if the feature is active or not
	CheckFeature()
	// GetFeatureFlags fetches all the defined feature flags
	GetFeatureFlags()
	// InitFeatures initialises the feature flags
	InitFeatures()
	// UpdateFeatureFlag updates the feature flag
	UpdateFeatureFlag()
	// GetFeatureFlag fetches the feature flag
	GetFeatureFlag()
}

type API interface{}
