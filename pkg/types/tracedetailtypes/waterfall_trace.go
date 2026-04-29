package tracedetailtypes

import (
	"encoding/json"
	"maps"
	"slices"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type TraceSummary struct {
	TraceID  string    `ch:"trace_id"`
	Start    time.Time `ch:"start"`
	End      time.Time `ch:"end"`
	NumSpans uint64    `ch:"num_spans"`
}

// WaterfallTrace holds processed trace data with childern populated in spans.
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

// GettableWaterfallTrace is the response for the v3 waterfall API.
type GettableWaterfallTrace struct {
	StartTimestampMillis  uint64 `json:"startTimestampMillis"`
	EndTimestampMillis    uint64 `json:"endTimestampMillis"`
	RootServiceName       string `json:"rootServiceName"`
	RootServiceEntryPoint string `json:"rootServiceEntryPoint"`
	TotalSpansCount       uint64 `json:"totalSpansCount"`
	TotalErrorSpansCount  uint64 `json:"totalErrorSpansCount"`
	// Deprecated: use Aggregations with SpanAggregationExecutionTimePercentage on the service.name field instead.
	ServiceNameToTotalDurationMap map[string]uint64       `json:"serviceNameToTotalDurationMap"`
	Spans                         []*WaterfallSpan        `json:"spans"`
	HasMissingSpans               bool                    `json:"hasMissingSpans"`
	UncollapsedSpans              []string                `json:"uncollapsedSpans"`
	HasMore                       bool                    `json:"hasMore"`
	Aggregations                  []SpanAggregationResult `json:"aggregations"`
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
		span := item.ToWaterfallSpan()
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
		root.GetSubtreeNodeCount()
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

func (wt *WaterfallTrace) GetWaterfallSpans(uncollapsedSpanIDs []string, selectedSpanID string, limit uint, spanPageSize float64, maxDepthToAutoExpand int) ([]*WaterfallSpan, []string, bool) {
	// Span selection decision: all spans or windowed
	selectAllSpans := wt.TotalSpans <= uint64(limit)

	var (
		selectedSpans    []*WaterfallSpan
		uncollapsedSpans []string
	)

	if selectAllSpans {
		selectedSpans = wt.GetAllSpans()
	} else {
		selectedSpans, uncollapsedSpans = wt.GetSelectedSpans(uncollapsedSpanIDs, selectedSpanID, spanPageSize, maxDepthToAutoExpand)
	}
	return selectedSpans, uncollapsedSpans, selectAllSpans
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
	copyOfServiceNameToTotalDurationMap := make(map[string]uint64)
	maps.Copy(copyOfServiceNameToTotalDurationMap, wt.ServiceNameToTotalDurationMap)

	copyOfSpanIDToSpanNodeMap := make(map[string]*WaterfallSpan)
	maps.Copy(copyOfSpanIDToSpanNodeMap, wt.SpanIDToSpanNodeMap)

	copyOfTraceRoots := make([]*WaterfallSpan, len(wt.TraceRoots))
	copy(copyOfTraceRoots, wt.TraceRoots)
	return &WaterfallTrace{
		StartTime:                     wt.StartTime,
		EndTime:                       wt.EndTime,
		TotalSpans:                    wt.TotalSpans,
		TotalErrorSpans:               wt.TotalErrorSpans,
		ServiceNameToTotalDurationMap: copyOfServiceNameToTotalDurationMap,
		SpanIDToSpanNodeMap:           copyOfSpanIDToSpanNodeMap,
		TraceRoots:                    copyOfTraceRoots,
		HasMissingSpans:               wt.HasMissingSpans,
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
	aggregations []SpanAggregationResult,
) *GettableWaterfallTrace {
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

	// duration values are in nanoseconds; convert in-place to milliseconds.
	for i := range aggregations {
		if aggregations[i].Aggregation == SpanAggregationDuration {
			for k, v := range aggregations[i].Value {
				aggregations[i].Value[k] = v / 1_000_000
			}
		}
	}

	return &GettableWaterfallTrace{
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
		Aggregations:                  aggregations,
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

func calculateServiceTime(spanIDToSpanNodeMap map[string]*WaterfallSpan) map[string]uint64 {
	serviceSpans := make(map[string][]*WaterfallSpan)
	for _, span := range spanIDToSpanNodeMap {
		if span.ServiceName != "" {
			serviceSpans[span.ServiceName] = append(serviceSpans[span.ServiceName], span)
		}
	}

	totalTimes := make(map[string]uint64)
	for service, spans := range serviceSpans {
		totalTimes[service] = mergeSpanIntervals(spans)
	}
	return totalTimes
}

// mergeSpanIntervals computes non-overlapping execution time for a set of spans.
func mergeSpanIntervals(spans []*WaterfallSpan) uint64 {
	if len(spans) == 0 {
		return 0
	}
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
	return total + (currentEnd - currentStart)
}

// GetSpanAggregation computes one aggregation result over all spans in the trace.
// Duration values are returned in nanoseconds; callers convert to milliseconds as needed.
func (wt *WaterfallTrace) GetSpanAggregation(aggregation SpanAggregationType, field telemetrytypes.TelemetryFieldKey) SpanAggregationResult {
	result := SpanAggregationResult{
		Field:       field,
		Aggregation: aggregation,
		Value:       make(map[string]uint64),
	}

	switch aggregation {
	case SpanAggregationSpanCount:
		for _, span := range wt.SpanIDToSpanNodeMap {
			if key, ok := span.FieldValue(field); ok {
				result.Value[key]++
			}
		}

	case SpanAggregationDuration:
		spansByField := make(map[string][]*WaterfallSpan)
		for _, span := range wt.SpanIDToSpanNodeMap {
			if key, ok := span.FieldValue(field); ok {
				spansByField[key] = append(spansByField[key], span)
			}
		}
		for key, spans := range spansByField {
			result.Value[key] = mergeSpanIntervals(spans)
		}

	case SpanAggregationExecutionTimePercentage:
		traceDuration := wt.EndTime - wt.StartTime
		spansByField := make(map[string][]*WaterfallSpan)
		for _, span := range wt.SpanIDToSpanNodeMap {
			if key, ok := span.FieldValue(field); ok {
				spansByField[key] = append(spansByField[key], span)
			}
		}
		if traceDuration > 0 {
			for key, spans := range spansByField {
				result.Value[key] = mergeSpanIntervals(spans) * 100 / traceDuration
			}
		}
	}

	return result
}
