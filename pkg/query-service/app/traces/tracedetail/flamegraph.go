package tracedetail

import (
	"sort"

	"go.signoz.io/signoz/pkg/query-service/model"
)

var (
	SPAN_LIMIT_PER_REQUEST_FOR_FLAMEGRAPH float64 = 50
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
		if len(_spans) > 0 && _spans[0].SpanID == selectedSpanId {
			selectedSpanLevel = index
			break
		}
	}

	return selectedSpanLevel
}

func GetSelectedSpansForFlamegraph(traceRoots []*model.FlamegraphSpan, spanIdToSpanNodeMap map[string]*model.FlamegraphSpan) [][]*model.FlamegraphSpan {

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

func GetSelectedSpansForFlamegraphForRequest(selectedSpanID string, selectedSpans [][]*model.FlamegraphSpan) [][]*model.FlamegraphSpan {
	var selectedIndex = 0

	if selectedSpanID != "" {
		selectedIndex = FindIndexForSelectedSpan(selectedSpans, selectedSpanID)
	}

	lowerLimit := selectedIndex - int(SPAN_LIMIT_PER_REQUEST_FOR_FLAMEGRAPH*0.4)
	upperLimit := selectedIndex + int(SPAN_LIMIT_PER_REQUEST_FOR_FLAMEGRAPH*0.6)

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

	return selectedSpans[lowerLimit:upperLimit]
}
