package licensetypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type License interface {
	// ID returns the unique identifier for the license
	ID() valuer.UUID

	// OrgID returns the organization ID for the license
	OrgID() valuer.UUID

	// Contents returns the raw data for the license
	Contents() []byte

	// Key returns the key for the license
	Key() string

	// CreatedAt returns the creation time for the license
	CreatedAt() time.Time

	// UpdatedAt returns the last update time for the license
	UpdatedAt() time.Time

	// FeatureValues returns the feature values for the license
	FeatureVariants() map[featuretypes.Name]*featuretypes.FeatureVariant
}
