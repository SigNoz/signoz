package querybuildertypesv5

import (
	"bytes"
	"encoding/json"
	"maps"

	"github.com/SigNoz/signoz/pkg/errors"
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

func (c *CachedBucket) Contains(other *CachedBucket) bool {
	return c.StartMs <= other.StartMs && other.EndMs <= c.EndMs
}

// true if c and other overlap or sit edge to edge, false otherwise.
func (c *CachedBucket) Touches(other *CachedBucket) bool {
	return c.StartMs <= other.EndMs && other.StartMs <= c.EndMs
}

// CachedData represents the full cached data for a query.
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

// Cost approximates the retained bytes of this CachedData for use as the
// ristretto cache cost. The dominant contributor is the serialized bucket
// values (json.RawMessage); other fields are fixed-size or small strings.
func (c *CachedData) Cost() int64 {
	var size int64
	for _, b := range c.Buckets {
		if b == nil {
			continue
		}
		// Value is the bulk of the payload
		size += int64(len(b.Value))
	}
	for _, w := range c.Warnings {
		size += int64(len(w))
	}
	return size
}

func (r *Result) SplitIntoCacheCellBuckets(startMs, endMs, cellWidthMs uint64) ([]*CachedBucket, error) {
	tsData, ok := r.Value.(*TimeSeriesData)
	if !ok || tsData == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "result of type %s cannot be bucketed", r.Type.StringValue())
	}

	cellBuckets := make([]*CachedBucket, 0, 1)
	for from := startMs; from < endMs; {
		to := endMs
		if cellWidthMs > 0 {
			to = min(endMs, (from/cellWidthMs+1)*cellWidthMs)
		}
		// A promql value stamped exactly at the window end is an instant inside
		// the window, so the last slice keeps it. A builder value never sits
		// there, since the end is step-aligned and partial steps are dropped.
		sliceEndMs := to
		if to == endMs {
			sliceEndMs = endMs + 1
		}
		value, err := json.Marshal(tsData.FilterToTimeRange(from, sliceEndMs))
		if err != nil {
			return nil, err
		}
		cellBuckets = append(cellBuckets, &CachedBucket{
			StartMs: from,
			EndMs:   to,
			Type:    r.Type,
			Value:   value,
			Stats:   r.Stats.prorate(to-from, endMs-startMs),
		})
		from = to
	}
	return cellBuckets, nil
}

// prorate returns the share of the stats that partMs out of wholeMs of the
// scanned window accounts for.
func (e ExecStats) prorate(partMs, wholeMs uint64) ExecStats {
	ratio := 1.0
	if partMs < wholeMs {
		ratio = float64(partMs) / float64(wholeMs)
	}
	return ExecStats{
		RowsScanned:   uint64(float64(e.RowsScanned) * ratio),
		BytesScanned:  uint64(float64(e.BytesScanned) * ratio),
		DurationMS:    uint64(float64(e.DurationMS) * ratio),
		StepIntervals: maps.Clone(e.StepIntervals),
	}
}
