package tracedetailtypes

import (
	"encoding/json"
	"maps"
	"slices"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/types/cachetypes"
)

// TraceSummary is the ClickHouse scan struct for the trace_summary query.
type TraceSummary struct {
	TraceID  string    `ch:"trace_id"`
	Start    time.Time `ch:"start"`
	End      time.Time `ch:"end"`
	NumSpans uint64    `ch:"num_spans"`
}

// WaterfallTrace holds pre-processed trace data
type WaterfallTrace struct {
	StartTime                     uint64                    `json:"startTime"`
	EndTime                       uint64                    `json:"endTime"`
	TotalSpans                    uint64                    `json:"totalSpans"`
	TotalErrorSpans               uint64                    `json:"totalErrorSpans"`
	ServiceNameToTotalDurationMap map[string]uint64         `json:"serviceNameToTotalDurationMap"`
	SpanIDToSpanNodeMap           map[string]*WaterfallSpan `json:"spanIdToSpanNodeMap"`
	TraceRoots                    []*WaterfallSpan          `json:"traceRoots"`
	HasMissingSpans               bool                      `json:"hasMissingSpans"`
}

// NewWaterfallTrace constructs a WaterfallTrace from processed span data.
func NewWaterfallTrace(
	startTime, endTime, totalSpans, totalErrorSpans uint64,
	spanIDToSpanNodeMap map[string]*WaterfallSpan,
	serviceNameToTotalDurationMap map[string]uint64,
	traceRoots []*WaterfallSpan,
	hasMissingSpans bool,
) *WaterfallTrace {
	return &WaterfallTrace{
		StartTime:                     startTime,
		EndTime:                       endTime,
		TotalSpans:                    totalSpans,
		TotalErrorSpans:               totalErrorSpans,
		SpanIDToSpanNodeMap:           spanIDToSpanNodeMap,
		ServiceNameToTotalDurationMap: serviceNameToTotalDurationMap,
		TraceRoots:                    traceRoots,
		HasMissingSpans:               hasMissingSpans,
	}
}

func NewWaterfallTraceFromSpans(spans []StorableSpan) *WaterfallTrace {
	var (
		startTime, endTime, totalErrorSpans uint64
		spanIDToSpanNodeMap                 = make(map[string]*WaterfallSpan, len(spans))
		traceRoots                          []*WaterfallSpan
		hasMissingSpans                     bool
	)

	for _, item := range spans {
		span := item.ToSpan()
		startTimeUnixNano := uint64(item.StartTime.UnixNano())
		if startTime == 0 || startTimeUnixNano < startTime {
			startTime = startTimeUnixNano
		}
		endTime = max(endTime, startTimeUnixNano+span.DurationNano)

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
				missingSpan := NewMissingWaterfallSpan(spanNode.ParentSpanID, spanNode.TraceID, spanNode.TimeUnixNano, spanNode.DurationNano)
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
		root.computeSubTreeNodeCount()
	}

	sort.Slice(traceRoots, func(i, j int) bool {
		if traceRoots[i].TimeUnixNano == traceRoots[j].TimeUnixNano {
			return traceRoots[i].Name < traceRoots[j].Name
		}
		return traceRoots[i].TimeUnixNano < traceRoots[j].TimeUnixNano
	})

	return NewWaterfallTrace(
		startTime,
		endTime,
		uint64(len(spans)),
		totalErrorSpans,
		spanIDToSpanNodeMap,
		calculateServiceTime(spanIDToSpanNodeMap),
		traceRoots,
		hasMissingSpans,
	)
}

func (wt *WaterfallTrace) GetPreOrderedSpans() []*WaterfallSpan {
	var preOrderedSpans []*WaterfallSpan
	for _, root := range wt.TraceRoots {
		preOrderedSpans = append(preOrderedSpans, root.getPreOrderedSpans(nil, true, 0)...)
	}
	return preOrderedSpans
}

func (wt *WaterfallTrace) GetSelectedSpans(uncollapsedSpanIDs []string, selectedSpanID string) ([]*WaterfallSpan, []string) {
	uncollapsedSpanIDsMap := wt.CalculateUncollapsedSpanIDs(uncollapsedSpanIDs, selectedSpanID)

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
	startIndex, endIndex := windowAroundIndex(selectedSpanIndex, len(preOrderedSpans))
	return preOrderedSpans[startIndex:endIndex], slices.Collect(maps.Keys(uncollapsedSpanIDsMap))
}

// CalculateUncollapsedSpanIDs returns the full set of span IDs that should be uncollapsed,
// merging three sources:
//  1. Caller-supplied uncollapsedSpanIDs (explicit user state)
//  2. Every ancestor of selectedSpanID (so the selected span is always visible)
//  3. Up to MaxDepthForSelectedChildren levels of descendants below selectedSpanID,
//     when selectedSpanID is itself already uncollapsed (auto-expansion)
func (wt *WaterfallTrace) CalculateUncollapsedSpanIDs(uncollapsedSpanIDs []string, selectedSpanID string) map[string]struct{} {
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
			selectedSpan.autoExpandDescendants(MaxDepthForSelectedChildren, uncollapsedSpanMap)
		}
	}

	return uncollapsedSpanMap
}

func (wt *WaterfallTrace) getPathFromRoot(selectedSpanID string) ([]string, bool) {
	for _, root := range wt.TraceRoots {
		if path, found := root.getPathToSelectedSpanID(selectedSpanID); found {
			return path, found
		}
	}
	return nil, false
}

func (c *WaterfallTrace) Clone() cachetypes.Cacheable {
	copyOfServiceNameToTotalDurationMap := make(map[string]uint64)
	maps.Copy(copyOfServiceNameToTotalDurationMap, c.ServiceNameToTotalDurationMap)

	copyOfSpanIDToSpanNodeMap := make(map[string]*WaterfallSpan)
	maps.Copy(copyOfSpanIDToSpanNodeMap, c.SpanIDToSpanNodeMap)

	copyOfTraceRoots := make([]*WaterfallSpan, len(c.TraceRoots))
	copy(copyOfTraceRoots, c.TraceRoots)
	return &WaterfallTrace{
		StartTime:                     c.StartTime,
		EndTime:                       c.EndTime,
		TotalSpans:                    c.TotalSpans,
		TotalErrorSpans:               c.TotalErrorSpans,
		ServiceNameToTotalDurationMap: copyOfServiceNameToTotalDurationMap,
		SpanIDToSpanNodeMap:           copyOfSpanIDToSpanNodeMap,
		TraceRoots:                    copyOfTraceRoots,
		HasMissingSpans:               c.HasMissingSpans,
	}
}

func (c *WaterfallTrace) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}

func (c *WaterfallTrace) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

// WaterfallResponse is the response for the v3 waterfall API.
type WaterfallResponse struct {
	StartTimestampMillis          uint64            `json:"startTimestampMillis"`
	EndTimestampMillis            uint64            `json:"endTimestampMillis"`
	RootServiceName               string            `json:"rootServiceName"`
	RootServiceEntryPoint         string            `json:"rootServiceEntryPoint"`
	TotalSpansCount               uint64            `json:"totalSpansCount"`
	TotalErrorSpansCount          uint64            `json:"totalErrorSpansCount"`
	ServiceNameToTotalDurationMap map[string]uint64 `json:"serviceNameToTotalDurationMap"`
	Spans                         []*WaterfallSpan  `json:"spans"`
	HasMissingSpans               bool              `json:"hasMissingSpans"`
	UncollapsedSpans              []string          `json:"uncollapsedSpans"`
	HasMore                       bool              `json:"hasMore"`
}

// NewWaterfallResponseFromWaterfallTrace constructs a WaterfallResponse from processed trace data and selected spans.
func NewWaterfallResponseFromWaterfallTrace(
	traceData *WaterfallTrace,
	selectedSpans []*WaterfallSpan,
	uncollapsedSpans []string,
	selectAllSpans bool,
) *WaterfallResponse {
	var rootServiceName, rootServiceEntryPoint string
	if len(traceData.TraceRoots) > 0 {
		rootServiceName = traceData.TraceRoots[0].ServiceName
		rootServiceEntryPoint = traceData.TraceRoots[0].Name
	}

	serviceDurationsMillis := make(map[string]uint64, len(traceData.ServiceNameToTotalDurationMap))
	for svc, dur := range traceData.ServiceNameToTotalDurationMap {
		serviceDurationsMillis[svc] = dur / 1_000_000
	}

	// convert start timestamp to millis because client is expecting it in millis
	for _, span := range selectedSpans {
		span.TimeUnixNano = span.TimeUnixNano / 1_000_000
	}

	return &WaterfallResponse{
		Spans:                         selectedSpans,
		UncollapsedSpans:              uncollapsedSpans,
		StartTimestampMillis:          traceData.StartTime / 1_000_000,
		EndTimestampMillis:            traceData.EndTime / 1_000_000,
		TotalSpansCount:               traceData.TotalSpans,
		TotalErrorSpansCount:          traceData.TotalErrorSpans,
		RootServiceName:               rootServiceName,
		RootServiceEntryPoint:         rootServiceEntryPoint,
		ServiceNameToTotalDurationMap: serviceDurationsMillis,
		HasMissingSpans:               traceData.HasMissingSpans,
		HasMore:                       !selectAllSpans,
	}
}

// windowAroundIndex returns start/end indices for a window of SpanLimitPerRequest spans.
func windowAroundIndex(selectedIndex, total int) (start, end int) {
	selectedIndex = max(selectedIndex, 0)

	start = selectedIndex - int(SpanLimitPerRequest*0.4)
	end = selectedIndex + int(SpanLimitPerRequest*0.6)

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

func calculateServiceTime(spanIDToSpanNodeMap map[string]*WaterfallSpan) map[string]uint64 {
	serviceSpans := make(map[string][]*WaterfallSpan)
	for _, span := range spanIDToSpanNodeMap {
		if span.ServiceName != "" {
			serviceSpans[span.ServiceName] = append(serviceSpans[span.ServiceName], span)
		}
	}

	totalTimes := make(map[string]uint64)
	for service, spans := range serviceSpans {
		sort.Slice(spans, func(i, j int) bool {
			return spans[i].TimeUnixNano < spans[j].TimeUnixNano
		})

		currentStart := spans[0].TimeUnixNano
		currentEnd := currentStart + spans[0].DurationNano
		total := uint64(0)

		for _, span := range spans[1:] {
			startNano := span.TimeUnixNano
			endNano := startNano + span.DurationNano
			if currentEnd >= startNano {
				if endNano > currentEnd {
					currentEnd = endNano
				}
			} else {
				total += currentEnd - currentStart
				currentStart = startNano
				currentEnd = endNano
			}
		}
		total += currentEnd - currentStart
		totalTimes[service] = total
	}
	return totalTimes
}
