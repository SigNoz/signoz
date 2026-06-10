package model

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/types/cachetypes"
)

type GetFlamegraphSpansForTraceCache struct {
	StartTime     uint64              `json:"startTime"`
	EndTime       uint64              `json:"endTime"`
	DurationNano  uint64              `json:"durationNano"`
	SelectedSpans [][]*FlamegraphSpan `json:"selectedSpans"`
	TraceRoots    []*FlamegraphSpan   `json:"traceRoots"`
}

func (c *GetFlamegraphSpansForTraceCache) Clone() cachetypes.Cacheable {
	return &GetFlamegraphSpansForTraceCache{
		StartTime:     c.StartTime,
		EndTime:       c.EndTime,
		DurationNano:  c.DurationNano,
		SelectedSpans: c.SelectedSpans,
		TraceRoots:    c.TraceRoots,
	}
}

func (c *GetFlamegraphSpansForTraceCache) Cost() int64 {
	const perSpanBytes = 128
	var spans int64
	for _, row := range c.SelectedSpans {
		spans += int64(len(row))
	}
	spans += int64(len(c.TraceRoots))
	return spans * perSpanBytes
}

func (c *GetFlamegraphSpansForTraceCache) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *GetFlamegraphSpansForTraceCache) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}
