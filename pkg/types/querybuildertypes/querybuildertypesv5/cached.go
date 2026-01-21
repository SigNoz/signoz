package querybuildertypesv5

import (
	"bytes"
	"encoding/json"
	"maps"

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

func (c *CachedBucket) Clone() *CachedBucket {
	return &CachedBucket{
		StartMs: c.StartMs,
		EndMs:   c.EndMs,
		Type:    c.Type,
		Value:   bytes.Clone(c.Value),
		Stats: ExecStats{
			RowsScanned:   c.Stats.RowsScanned,
			BytesScanned:  c.Stats.BytesScanned,
			DurationMS:    c.Stats.DurationMS,
			StepIntervals: maps.Clone(c.Stats.StepIntervals),
		},
	}
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

func (c *CachedData) Clone() cachetypes.Cacheable {
	clonedCachedData := new(CachedData)
	clonedCachedData.Buckets = make([]*CachedBucket, len(c.Buckets))
	for i := range c.Buckets {
		clonedCachedData.Buckets[i] = c.Buckets[i].Clone()
	}

	clonedCachedData.Warnings = make([]string, len(c.Warnings))
	copy(clonedCachedData.Warnings, c.Warnings)

	return clonedCachedData
}
