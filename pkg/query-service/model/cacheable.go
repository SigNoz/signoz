package model

import (
	"encoding/json"
	"maps"

	"github.com/SigNoz/signoz/pkg/types/cachetypes"
)

type GetWaterfallSpansForTraceWithMetadataCache struct {
	StartTime                     uint64            `json:"startTime"`
	EndTime                       uint64            `json:"endTime"`
	DurationNano                  uint64            `json:"durationNano"`
	TotalSpans                    uint64            `json:"totalSpans"`
	TotalErrorSpans               uint64            `json:"totalErrorSpans"`
	ServiceNameToTotalDurationMap map[string]uint64 `json:"serviceNameToTotalDurationMap"`
	SpanIdToSpanNodeMap           map[string]*Span  `json:"spanIdToSpanNodeMap"`
	TraceRoots                    []*Span           `json:"traceRoots"`
	HasMissingSpans               bool              `json:"hasMissingSpans"`
}

func (c *GetWaterfallSpansForTraceWithMetadataCache) Clone() cachetypes.Cacheable {
	copyOfServiceNameToTotalDurationMap := make(map[string]uint64)
	maps.Copy(copyOfServiceNameToTotalDurationMap, c.ServiceNameToTotalDurationMap)

	copyOfSpanIdToSpanNodeMap := make(map[string]*Span)
	maps.Copy(copyOfSpanIdToSpanNodeMap, c.SpanIdToSpanNodeMap)

	copyOfTraceRoots := make([]*Span, len(c.TraceRoots))
	copy(copyOfTraceRoots, c.TraceRoots)
	return &GetWaterfallSpansForTraceWithMetadataCache{
		StartTime:                     c.StartTime,
		EndTime:                       c.EndTime,
		DurationNano:                  c.DurationNano,
		TotalSpans:                    c.TotalSpans,
		TotalErrorSpans:               c.TotalErrorSpans,
		ServiceNameToTotalDurationMap: copyOfServiceNameToTotalDurationMap,
		SpanIdToSpanNodeMap:           copyOfSpanIdToSpanNodeMap,
		TraceRoots:                    copyOfTraceRoots,
		HasMissingSpans:               c.HasMissingSpans,
	}
}

func (c *GetWaterfallSpansForTraceWithMetadataCache) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *GetWaterfallSpansForTraceWithMetadataCache) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

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

func (c *GetFlamegraphSpansForTraceCache) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *GetFlamegraphSpansForTraceCache) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}
