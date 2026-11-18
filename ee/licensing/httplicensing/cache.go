package httplicensing

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/types/licensetypes"
)

const (
	activeLicenseCacheKey string = "active_license"

	// Not in licensing.Config as no deployment needs to tune it yet.
	activeLicenseCacheTTL time.Duration = time.Minute
)

// A nil License means the organization has no active license.
type cachedActiveLicense struct {
	License *licensetypes.License
}

func (l cachedActiveLicense) MarshalBinary() ([]byte, error) {
	return json.Marshal(l)
}

func (l *cachedActiveLicense) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, l)
}
