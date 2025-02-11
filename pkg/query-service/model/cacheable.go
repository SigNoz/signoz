package model

import "encoding/json"

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

func (c *GetFlamegraphSpansForTraceCache) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *GetFlamegraphSpansForTraceCache) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}
