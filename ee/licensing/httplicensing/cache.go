package httplicensing

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/types/licensetypes"
)

const (
	activeLicenseCacheKey string        = "active_license"
	activeLicenseCacheTTL time.Duration = time.Minute
)

// A nil License means the organization has no active license.
type cachedActiveLicense struct {
	License *licensetypes.License
}

func (typ cachedActiveLicense) MarshalBinary() ([]byte, error) {
	return json.Marshal(typ)
}

func (typ *cachedActiveLicense) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, typ)
}
