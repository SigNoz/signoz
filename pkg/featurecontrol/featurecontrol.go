package featurecontrol

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type FeatureControl interface {
	// List returns the list of features for the given orgID.
	ListOrgFeatures(context.Context, valuer.UUID) ([]*featuretypes.GettableOrgFeature, error)

	// Get returns the feature for the given orgID and name. It returns an error of type NotFound and ErrCodeFeatureNotFound if the feature is not found.
	GetFeature(context.Context, valuer.UUID, featuretypes.Name) (*featuretypes.GettableOrgFeature, error)

	// SetDefault sets the defaults for the given orgID.
	SetDefault(context.Context, valuer.UUID) error

	// Boolean returns the boolean value of the feature for the given orgID and name.
	// It returns an error of (type NotFound and code ErrCodeFeatureNotFound) if the feature is not found.
	// It returns an error of (type InvalidInput and code ErrCodeFeatureKindMismatch) if the feature is not a boolean.
	Boolean(context.Context, valuer.UUID, featuretypes.Name) (bool, error)
}
