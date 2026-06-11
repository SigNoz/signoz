package spantypes

import (
	"encoding/json"
	"maps"
	"slices"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/types/cachetypes"
)

type TraceSummary struct {
	TraceID  string    `ch:"trace_id"`
	Start    time.Time `ch:"start"`
	End      time.Time `ch:"end"`
	NumSpans uint64    `ch:"num_spans"`
}

// WaterfallTrace holds processed trace data with childern populated in spans.
type WaterfallTrace struct {
	StartTime           uint64                    `json:"startTime"`
	EndTime             uint64                    `json:"endTime"`
	TotalSpans          uint64                    `json:"totalSpans"`
	TotalErrorSpans     uint64                    `json:"totalErrorSpans"`
	SpanIDToSpanNodeMap map[string]*WaterfallSpan `json:"spanIdToSpanNodeMap"`
	TraceRoots          []*WaterfallSpan          `json:"traceRoots"`
	HasMissingSpans     bool                      `json:"hasMissingSpans"`
}

// GettableWaterfallTrace is the response for the waterfall API.
type GettableWaterfallTrace struct {
	StartTimestampMillis  uint64           `json:"startTimestampMillis"`
	EndTimestampMillis    uint64           `json:"endTimestampMillis"`
	RootServiceName       string           `json:"rootServiceName"`
	RootServiceEntryPoint string           `json:"rootServiceEntryPoint"`
	TotalSpansCount       uint64           `json:"totalSpansCount"`
	TotalErrorSpansCount  uint64           `json:"totalErrorSpansCount"`
	Spans                 []*WaterfallSpan `json:"spans"`
	HasMissingSpans       bool             `json:"hasMissingSpans"`
	UncollapsedSpans      []string         `json:"uncollapsedSpans"`
	HasMore               bool             `json:"hasMore"`
}

// NewWaterfallTrace constructs a WaterfallTrace from processed span data.
func NewWaterfallTrace(
	startTime, endTime, totalSpans, totalErrorSpans uint64,
	spanIDToSpanNodeMap map[string]*WaterfallSpan,
	traceRoots []*WaterfallSpan,
	hasMissingSpans bool,
) *WaterfallTrace {
	return &WaterfallTrace{
		StartTime:           startTime,
		EndTime:             endTime,
		TotalSpans:          totalSpans,
		TotalErrorSpans:     totalErrorSpans,
		SpanIDToSpanNodeMap: spanIDToSpanNodeMap,
		TraceRoots:          traceRoots,
		HasMissingSpans:     hasMissingSpans,
	}
}

// NewWaterfallTraceFromSpans requires WaterfallSpan nodes with only below fields:
// SpanID, ParentSpanID, TimeUnix, DurationNano, HasError, and ServiceName.
func NewWaterfallTraceFromSpans(nodes []*WaterfallSpan) *WaterfallTrace {
	var (
		startTime, endTime, totalErrorSpans uint64
		spanIDToSpanNodeMap                 = make(map[string]*WaterfallSpan, len(nodes))
		traceRoots                          []*WaterfallSpan
		hasMissingSpans                     bool
	)

	for _, span := range nodes {
		if startTime == 0 || span.TimeUnix < startTime {
			startTime = span.TimeUnix
		}
		endTime = max(endTime, span.TimeUnix+span.DurationNano)
		if span.HasError {
			totalErrorSpans++
		}
		spanIDToSpanNodeMap[span.SpanID] = span
	}

	for _, spanNode := range spanIDToSpanNodeMap {
		if spanNode.ParentSpanID != "" {
			if parentNode, exists := spanIDToSpanNodeMap[spanNode.ParentSpanID]; exists {
				parentNode.Children = append(parentNode.Children, spanNode)
			} else {
				missingSpan := NewMissingWaterfallSpan(spanNode.ParentSpanID, spanNode.TraceID, spanNode.TimeUnix, spanNode.DurationNano)
				missingSpan.Children = append(missingSpan.Children, spanNode)
				spanIDToSpanNodeMap[missingSpan.SpanID] = missingSpan
				traceRoots = append(traceRoots, missingSpan)
				hasMissingSpans = true
			}
		} else if getSpanIndex(traceRoots, spanNode.SpanID) == -1 {
			traceRoots = append(traceRoots, spanNode)
		}
	}

	for _, root := range traceRoots {
		root.SortChildren()
		root.GetSubtreeNodeCount()
	}

	sort.Slice(traceRoots, func(i, j int) bool {
		if traceRoots[i].TimeUnix == traceRoots[j].TimeUnix {
			return traceRoots[i].Name < traceRoots[j].Name
		}
		return traceRoots[i].TimeUnix < traceRoots[j].TimeUnix
	})

	return NewWaterfallTrace(
		startTime,
		endTime,
		uint64(len(nodes)),
		totalErrorSpans,
		spanIDToSpanNodeMap,
		traceRoots,
		hasMissingSpans,
	)
}

// GetAllSpans returns all spans with pre order traversal.
func (wt *WaterfallTrace) GetAllSpans() []*WaterfallSpan {
	var preOrderedSpans []*WaterfallSpan
	for _, root := range wt.TraceRoots {
		preOrderedSpans = append(preOrderedSpans, root.getPreOrderedSpans(nil, true, 0)...)
	}
	return preOrderedSpans
}

// GetSelectedSpans returns a window of spans around selectedSpanID with pre order traversal.
func (wt *WaterfallTrace) GetSelectedSpans(uncollapsedSpanIDs []string, selectedSpanID string, spanLimitPerRequest float64, maxDepthForSelectedChildren int) ([]*WaterfallSpan, []string) {
	uncollapsedSpanIDsMap := wt.CalculateUncollapsedSpanIDs(uncollapsedSpanIDs, selectedSpanID, maxDepthForSelectedChildren)

	var (
		preOrderedSpans   []*WaterfallSpan
		selectedSpanIndex = -1
	)
	for _, root := range wt.TraceRoots {
		preOrderedSpansForRoot := root.getPreOrderedSpans(uncollapsedSpanIDsMap, false, 0)
		if idx := getSpanIndex(preOrderedSpansForRoot, selectedSpanID); idx != -1 {
			selectedSpanIndex = idx + len(preOrderedSpans)
		}
		preOrderedSpans = append(preOrderedSpans, preOrderedSpansForRoot...)
	}
	startIndex, endIndex := windowAroundIndex(selectedSpanIndex, len(preOrderedSpans), spanLimitPerRequest)
	return preOrderedSpans[startIndex:endIndex], slices.Collect(maps.Keys(uncollapsedSpanIDsMap))
}

// CalculateUncollapsedSpanIDs returns the full set of span IDs that should be uncollapsed,
// merging three sources:
//  1. Caller-supplied uncollapsedSpanIDs (explicit user state)
//  2. Every ancestor of selectedSpanID (so the selected span is always visible)
//  3. Up to maxDepthForSelectedChildren levels of descendants below selectedSpanID,
//     when selectedSpanID is itself already uncollapsed (auto-expansion).
func (wt *WaterfallTrace) CalculateUncollapsedSpanIDs(uncollapsedSpanIDs []string, selectedSpanID string, maxDepthForSelectedChildren int) map[string]struct{} {
	uncollapsedSpanMap := make(map[string]struct{}, len(uncollapsedSpanIDs))
	for _, spanID := range uncollapsedSpanIDs {
		uncollapsedSpanMap[spanID] = struct{}{}
	}

	// Uncollapse every ancestor so the selected span is reachable in the tree.
	path, _ := wt.getPathFromRoot(selectedSpanID)
	for _, spanID := range path {
		if spanID != selectedSpanID {
			uncollapsedSpanMap[spanID] = struct{}{}
		}
	}

	// Auto-expand children of the selected span when it is already uncollapsed.
	if _, isUncollapsed := uncollapsedSpanMap[selectedSpanID]; isUncollapsed {
		if selectedSpan, exists := wt.SpanIDToSpanNodeMap[selectedSpanID]; exists {
			selectedSpan.autoExpandDescendants(maxDepthForSelectedChildren, uncollapsedSpanMap)
		}
	}

	return uncollapsedSpanMap
}

func (wt *WaterfallTrace) Clone() cachetypes.Cacheable {
	copyOfSpanIDToSpanNodeMap := make(map[string]*WaterfallSpan)
	maps.Copy(copyOfSpanIDToSpanNodeMap, wt.SpanIDToSpanNodeMap)

	copyOfTraceRoots := make([]*WaterfallSpan, len(wt.TraceRoots))
	copy(copyOfTraceRoots, wt.TraceRoots)
	return &WaterfallTrace{
		StartTime:           wt.StartTime,
		EndTime:             wt.EndTime,
		TotalSpans:          wt.TotalSpans,
		TotalErrorSpans:     wt.TotalErrorSpans,
		SpanIDToSpanNodeMap: copyOfSpanIDToSpanNodeMap,
		TraceRoots:          copyOfTraceRoots,
		HasMissingSpans:     wt.HasMissingSpans,
	}
}

func (wt *WaterfallTrace) getPathFromRoot(selectedSpanID string) ([]string, bool) {
	for _, root := range wt.TraceRoots {
		if path, found := root.getPathToSelectedSpanID(selectedSpanID); found {
			return path, found
		}
	}
	return nil, false
}

func (wt *WaterfallTrace) MarshalBinary() (data []byte, err error) {
	return json.Marshal(wt)
}

func (wt *WaterfallTrace) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, wt)
}

// NewGettableWaterfallTrace constructs a GettableWaterfallTrace from processed trace data and selected spans.
func NewGettableWaterfallTrace(
	traceData *WaterfallTrace,
	selectedSpans []*WaterfallSpan,
	uncollapsedSpans []string,
	selectAllSpans bool,
) *GettableWaterfallTrace {
	var rootServiceName, rootServiceEntryPoint string
	if len(traceData.TraceRoots) > 0 {
		rootServiceName = traceData.TraceRoots[0].ServiceName
		rootServiceEntryPoint = traceData.TraceRoots[0].Name
	}

	// convert start timestamp to millis because client is expecting it in millis
	for _, span := range selectedSpans {
		span.TimeUnix = span.TimeUnix / 1_000_000
	}

	return &GettableWaterfallTrace{
		Spans:                 selectedSpans,
		UncollapsedSpans:      uncollapsedSpans,
		StartTimestampMillis:  traceData.StartTime / 1_000_000,
		EndTimestampMillis:    traceData.EndTime / 1_000_000,
		TotalSpansCount:       traceData.TotalSpans,
		TotalErrorSpansCount:  traceData.TotalErrorSpans,
		RootServiceName:       rootServiceName,
		RootServiceEntryPoint: rootServiceEntryPoint,
		HasMissingSpans:       traceData.HasMissingSpans,
		HasMore:               !selectAllSpans,
	}
}

// windowAroundIndex returns start/end indices for a window of spanLimitPerRequest spans.
func windowAroundIndex(selectedIndex, total int, spanLimitPerRequest float64) (start, end int) {
	selectedIndex = max(selectedIndex, 0)

	start = selectedIndex - int(spanLimitPerRequest*0.4)
	end = selectedIndex + int(spanLimitPerRequest*0.6)

	if start < 0 {
		end = end - start
		start = 0
	}
	if end > total {
		start = start - (end - total)
		end = total
	}
	start = max(start, 0)
	return
}
