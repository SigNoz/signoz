package querybuildertypesv5

import (
	"bytes"
	"encoding/json"
	"maps"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/cachetypes"
)

var _ cachetypes.Cacheable = (*CachedData)(nil)

// CachedBucketEdge says which part of a request window a bucket holds. A body
// bucket holds whole steps and is valid for any window that contains its
// range. An edge bucket holds the partial aggregate of one window end and is
// valid only for a window with exactly that end.
type CachedBucketEdge string

const (
	CachedBucketBody  CachedBucketEdge = ""
	CachedBucketHead  CachedBucketEdge = "head"
	CachedBucketTail  CachedBucketEdge = "tail"
	CachedBucketWhole CachedBucketEdge = "whole"
)

// CachedBucket holds the points of one query for [StartMs, EndMs) on the step
// grid, and nothing outside it.
type CachedBucket struct {
	StartMs        uint64           `json:"startMs"`
	EndMs          uint64           `json:"endMs"`
	Edge           CachedBucketEdge `json:"edge,omitempty"`
	Type           RequestType      `json:"type"`
	Value          json.RawMessage  `json:"value"`
	Stats          ExecStats        `json:"stats"`
	Warnings       []string         `json:"warnings,omitempty"`
	WarningsDocURL string           `json:"warningsDocURL,omitempty"`
}

func (c *CachedBucket) Clone() *CachedBucket {
	return &CachedBucket{
		StartMs:        c.StartMs,
		EndMs:          c.EndMs,
		Edge:           c.Edge,
		Type:           c.Type,
		Value:          bytes.Clone(c.Value),
		Stats:          c.Stats.Clone(),
		Warnings:       slices.Clone(c.Warnings),
		WarningsDocURL: c.WarningsDocURL,
	}
}

// CachedData is the cache entry of one query: body buckets are disjoint and
// sorted by start, edge buckets follow.
type CachedData struct {
	Buckets []*CachedBucket `json:"buckets"`
}

func (c *CachedData) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

func (c *CachedData) MarshalBinary() ([]byte, error) {
	return json.Marshal(c)
}

func (c *CachedData) Clone() cachetypes.Cacheable {
	cloned := &CachedData{Buckets: make([]*CachedBucket, 0, len(c.Buckets))}
	for _, bucket := range c.Buckets {
		if bucket == nil {
			continue
		}
		cloned.Buckets = append(cloned.Buckets, bucket.Clone())
	}
	return cloned
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
		size += int64(len(b.Value))
		for _, w := range b.Warnings {
			size += int64(len(w))
		}
	}
	return size
}

// Clone returns a deep copy; StepIntervals is the only reference field.
func (e ExecStats) Clone() ExecStats {
	cloned := e
	cloned.StepIntervals = maps.Clone(e.StepIntervals)
	return cloned
}
