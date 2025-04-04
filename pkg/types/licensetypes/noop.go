package licensetypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Noop struct {
	featureRegistry *featuretypes.Registry
}

func NewNoop() License {
	return &Noop{
		featureRegistry: featuretypes.NewCommunityRegistry(),
	}
}

func (*Noop) ID() valuer.UUID {
	return valuer.UUID{}
}

func (*Noop) OrgID() valuer.UUID {
	return valuer.UUID{}
}

func (*Noop) Contents() []byte {
	return []byte{}
}

func (*Noop) Key() string {
	return ""
}

func (*Noop) CreatedAt() time.Time {
	return time.Time{}
}

func (*Noop) UpdatedAt() time.Time {
	return time.Time{}
}

func (noop *Noop) FeatureRegistry() *featuretypes.Registry {
	return noop.featureRegistry
}

func (*Noop) LicenseFeatures() []*featuretypes.LicenseFeature {
	return []*featuretypes.LicenseFeature{}
}
