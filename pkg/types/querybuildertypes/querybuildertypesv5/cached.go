package querybuildertypesv5

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/types/cachetypes"
)

var _ cachetypes.Cacheable = (*CachedData)(nil)

type CachedBucket struct {
	StartMs uint64          `json:"startMs"`
	EndMs   uint64          `json:"endMs"`
	Type    RequestType     `json:"type"`
	Value   json.RawMessage `json:"value"`
	Stats   ExecStats       `json:"stats"`
}

// CachedData represents the full cached data for a query
type CachedData struct {
	Buckets  []*CachedBucket `json:"buckets"`
	Warnings []string        `json:"warnings"`
}

func (c *CachedData) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

func (c *CachedData) MarshalBinary() ([]byte, error) {
	return json.Marshal(c)
}

func (c *CachedData) Clone() cachetypes.Cloneable {
	return nil
}
