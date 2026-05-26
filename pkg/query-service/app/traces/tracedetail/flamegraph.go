package tracedetail

import (
	"sort"

	"github.com/SigNoz/signoz/pkg/query-service/model"
)

var (
	flamegraphSpanLevelLimit      float64 = 50
	flamegraphSpanLimitPerLevel   int     = 100
	flamegraphSamplingBucketCount int     = 50
	flamegraphTopLatencySpanCount int     = 5

	MaxLimitWithoutSampling uint = 120_000
)

func ContainsFlamegraphSpan(slice []*model.FlamegraphSpan, item *model.FlamegraphSpan) bool {
	for _, v := range slice {
		if v.SpanID == item.SpanID {
			return true
		}
	}
	return false
}

func BfsTraversalForTrace(span *model.FlamegraphSpan, level int64) map[int64][]*model.FlamegraphSpan {
	bfs := map[int64][]*model.FlamegraphSpan{}
	bfs[level] = []*model.FlamegraphSpan{span}

	for _, child := range span.Children {
		childBfsMap := BfsTraversalForTrace(child, level+1)
		for _level, nodes := range childBfsMap {
			bfs[_level] = append(bfs[_level], nodes...)
		}
	}
	span.Level = level
	span.Children = make([]*model.FlamegraphSpan, 0)

	return bfs
}

func FindIndexForSelectedSpan(spans [][]*model.FlamegraphSpan, selectedSpanId string) int {
	var selectedSpanLevel int = 0

	for index, _spans := range spans {
		for _, span := range _spans {
			if span.SpanID == selectedSpanId {
				selectedSpanLevel = index
				break
			}
		}
	}

	return selectedSpanLevel
}

// GetAllSpansForFlamegraph groups all spans as per their level
func GetAllSpansForFlamegraph(traceRoots []*model.FlamegraphSpan, spanIdToSpanNodeMap map[string]*model.FlamegraphSpan) [][]*model.FlamegraphSpan {

	var traceIdLevelledFlamegraph = map[string]map[int64][]*model.FlamegraphSpan{}
	selectedSpans := [][]*model.FlamegraphSpan{}

	// sort the trace roots to add missing spans at the right order
	sort.Slice(traceRoots, func(i, j int) bool {
		if traceRoots[i].TimeUnixNano == traceRoots[j].TimeUnixNano {
			return traceRoots[i].Name < traceRoots[j].Name
		}
		return traceRoots[i].TimeUnixNano < traceRoots[j].TimeUnixNano
	})

	for _, rootSpanID := range traceRoots {
		if rootNode, exists := spanIdToSpanNodeMap[rootSpanID.SpanID]; exists {
			bfsMapForTrace := BfsTraversalForTrace(rootNode, 0)
			traceIdLevelledFlamegraph[rootSpanID.SpanID] = bfsMapForTrace
		}
	}

	for _, trace := range traceRoots {
		keys := make([]int64, 0, len(traceIdLevelledFlamegraph[trace.SpanID]))
		for key := range traceIdLevelledFlamegraph[trace.SpanID] {
			keys = append(keys, key)
		}

		sort.Slice(keys, func(i, j int) bool {
			return keys[i] < keys[j]
		})

		for _, level := range keys {
			if ok, exists := traceIdLevelledFlamegraph[trace.SpanID][level]; exists {
				selectedSpans = append(selectedSpans, ok)
			}
		}
	}

	return selectedSpans
}

func getLatencyAndTimestampBucketedSpans(spans []*model.FlamegraphSpan, selectedSpanID string, isSelectedSpanIDPresent bool, startTime uint64, endTime uint64) []*model.FlamegraphSpan {
	var sampledSpans []*model.FlamegraphSpan
	// sort the spans by latency for latency filtering
	sort.Slice(spans, func(i, j int) bool {
		return spans[i].DurationNano > spans[j].DurationNano
	})

	// pick the top 5 latency spans
	for idx := range flamegraphTopLatencySpanCount {
		sampledSpans = append(sampledSpans, spans[idx])
	}

	// always add the selectedSpan
	if isSelectedSpanIDPresent {
		idx := -1
		for _idx, span := range spans {
			if span.SpanID == selectedSpanID {
				idx = _idx
			}
		}
		if idx != -1 {
			sampledSpans = append(sampledSpans, spans[idx])
		}
	}

	bucketSize := (endTime - startTime) / uint64(flamegraphSamplingBucketCount)
	if bucketSize == 0 {
		bucketSize = 1
	}

	bucketedSpans := make([][]*model.FlamegraphSpan, flamegraphSamplingBucketCount)

	for _, span := range spans {
		if span.TimeUnixNano >= startTime && span.TimeUnixNano <= endTime {
			bucketIndex := int((span.TimeUnixNano - startTime) / bucketSize)
			if bucketIndex >= 0 && bucketIndex < flamegraphSamplingBucketCount {
				bucketedSpans[bucketIndex] = append(bucketedSpans[bucketIndex], span)
			}
		}
	}

	for i := range bucketedSpans {
		if len(bucketedSpans[i]) > 2 {
			// Keep only the first 2 spans
			bucketedSpans[i] = bucketedSpans[i][:2]
		}
	}

	// Flatten the bucketed spans into a single slice
	for _, bucket := range bucketedSpans {
		sampledSpans = append(sampledSpans, bucket...)
	}

	return sampledSpans
}

func GetSelectedSpansForFlamegraphForRequest(selectedSpanID string, selectedSpans [][]*model.FlamegraphSpan, startTime uint64, endTime uint64) [][]*model.FlamegraphSpan {
	var selectedSpansForRequest = make([][]*model.FlamegraphSpan, 0)
	var selectedIndex = 0

	if selectedSpanID != "" {
		selectedIndex = FindIndexForSelectedSpan(selectedSpans, selectedSpanID)
	}

	lowerLimit := selectedIndex - int(flamegraphSpanLevelLimit*0.4)
	upperLimit := selectedIndex + int(flamegraphSpanLevelLimit*0.6)

	if lowerLimit < 0 {
		upperLimit = upperLimit - lowerLimit
		lowerLimit = 0
	}

	if upperLimit > len(selectedSpans) {
		lowerLimit = lowerLimit - (upperLimit - len(selectedSpans))
		upperLimit = len(selectedSpans)
	}

	if lowerLimit < 0 {
		lowerLimit = 0
	}

	for i := lowerLimit; i < upperLimit; i++ {
		if len(selectedSpans[i]) > flamegraphSpanLimitPerLevel {
			_spans := getLatencyAndTimestampBucketedSpans(selectedSpans[i], selectedSpanID, i == selectedIndex, startTime, endTime)
			selectedSpansForRequest = append(selectedSpansForRequest, _spans)
		} else {
			selectedSpansForRequest = append(selectedSpansForRequest, selectedSpans[i])
		}
	}

	return selectedSpansForRequest
}

func GetTotalSpanCount(spans [][]*model.FlamegraphSpan) uint64 {
	levelCount := len(spans)
	spanCount := uint64(0)
	for i := range levelCount {
		spanCount += uint64(len(spans[i]))
	}
	return spanCount
}
