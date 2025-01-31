package tracedetail

import (
	"slices"
	"sort"

	"go.signoz.io/signoz/pkg/query-service/model"
)

var (
	SPAN_LIMIT_PER_REQUEST_FOR_WATERFALL float64 = 500
)

type Interval struct {
	StartTime uint64
	Duration  uint64
	Service   string
}

func mergeIntervals(intervals []Interval) []Interval {
	if len(intervals) == 0 {
		return nil
	}

	var merged []Interval
	current := intervals[0]

	for i := 1; i < len(intervals); i++ {
		next := intervals[i]
		if current.StartTime+current.Duration >= next.StartTime {
			endTime := max(current.StartTime+current.Duration, next.StartTime+next.Duration)
			current.Duration = endTime - current.StartTime
		} else {
			merged = append(merged, current)
			current = next
		}
	}
	// Add the last interval
	merged = append(merged, current)

	return merged
}

func ContainsWaterfallSpan(slice []*model.Span, item *model.Span) bool {
	for _, v := range slice {
		if v.SpanID == item.SpanID {
			return true
		}
	}
	return false
}

func findIndexForSelectedSpanFromPreOrder(spans []*model.Span, selectedSpanId string) int {
	var selectedSpanIndex = -1

	for index, span := range spans {
		if span.SpanID == selectedSpanId {
			selectedSpanIndex = index
			break
		}
	}

	return selectedSpanIndex
}

func getPathFromRootToSelectedSpanId(node *model.Span, selectedSpanId string, uncollapsedSpans []string, isSelectedSpanIDUnCollapsed bool) (bool, []string) {
	spansFromRootToNode := []string{}

	if node.SpanID == selectedSpanId {
		if isSelectedSpanIDUnCollapsed {
			spansFromRootToNode = append(spansFromRootToNode, node.SpanID)
		}
		return true, spansFromRootToNode
	}

	isPresentInSubtreeForTheNode := false
	for _, child := range node.Children {
		isPresentInThisSubtree, _spansFromRootToNode := getPathFromRootToSelectedSpanId(child, selectedSpanId, uncollapsedSpans, isSelectedSpanIDUnCollapsed)
		// if the interested node is present in the given subtree then add the span node to uncollapsed node list
		if isPresentInThisSubtree {
			if !slices.Contains(uncollapsedSpans, node.SpanID) {
				spansFromRootToNode = append(spansFromRootToNode, node.SpanID)
			}
			isPresentInSubtreeForTheNode = true
			spansFromRootToNode = append(spansFromRootToNode, _spansFromRootToNode...)
		}
	}
	return isPresentInSubtreeForTheNode, spansFromRootToNode
}

func traverseTrace(span *model.Span, uncollapsedSpans []string, level uint64, isPartOfPreOrder bool, hasSibling bool, selectedSpanId string) []*model.Span {
	preOrderTraversal := []*model.Span{}

	// sort the children to maintain the order across requests
	sort.Slice(span.Children, func(i, j int) bool {
		if span.Children[i].TimeUnixNano == span.Children[j].TimeUnixNano {
			return span.Children[i].Name < span.Children[j].Name
		}
		return span.Children[i].TimeUnixNano < span.Children[j].TimeUnixNano
	})

	span.SubTreeNodeCount = 0
	nodeWithoutChildren := model.Span{
		SpanID:           span.SpanID,
		TraceID:          span.TraceID,
		ServiceName:      span.ServiceName,
		TimeUnixNano:     span.TimeUnixNano,
		Name:             span.Name,
		Kind:             int32(span.Kind),
		DurationNano:     span.DurationNano,
		HasError:         span.HasError,
		StatusMessage:    span.StatusMessage,
		StatusCodeString: span.StatusCodeString,
		SpanKind:         span.SpanKind,
		References:       span.References,
		Events:           span.Events,
		TagMap:           span.TagMap,
		Children:         make([]*model.Span, 0),
		HasChildren:      len(span.Children) > 0,
		Level:            level,
		HasSiblings:      hasSibling,
		SubTreeNodeCount: 0,
	}

	if isPartOfPreOrder {
		preOrderTraversal = append(preOrderTraversal, &nodeWithoutChildren)
	}

	for index, child := range span.Children {
		_childTraversal := traverseTrace(child, uncollapsedSpans, level+1, isPartOfPreOrder && slices.Contains(uncollapsedSpans, span.SpanID), index != (len(span.Children)-1), selectedSpanId)
		preOrderTraversal = append(preOrderTraversal, _childTraversal...)
		nodeWithoutChildren.SubTreeNodeCount += child.SubTreeNodeCount + 1
		span.SubTreeNodeCount += child.SubTreeNodeCount + 1
	}

	nodeWithoutChildren.SubTreeNodeCount += 1
	return preOrderTraversal

}

func CalculateServiceTime(serviceIntervals map[string][]Interval) map[string]uint64 {
	totalTimes := make(map[string]uint64)

	for service, serviceIntervals := range serviceIntervals {
		sort.Slice(serviceIntervals, func(i, j int) bool {
			return serviceIntervals[i].StartTime < serviceIntervals[j].StartTime
		})
		mergedIntervals := mergeIntervals(serviceIntervals)
		totalTime := uint64(0)
		for _, interval := range mergedIntervals {
			totalTime += interval.Duration
		}
		totalTimes[service] = totalTime
	}

	return totalTimes
}

func GetSelectedSpans(uncollapsedSpans []string, selectedSpanID string, traceRoots []*model.Span, spanIdToSpanNodeMap map[string]*model.Span, isSelectedSpanIDUnCollapsed bool) ([]*model.Span, []string, string, string) {

	var preOrderTraversal = make([]*model.Span, 0)
	var rootServiceName, rootServiceEntryPoint string
	updatedUncollapsedSpans := uncollapsedSpans

	selectedSpanIndex := -1
	for _, rootSpanID := range traceRoots {
		if rootNode, exists := spanIdToSpanNodeMap[rootSpanID.SpanID]; exists {
			_, spansFromRootToNode := getPathFromRootToSelectedSpanId(rootNode, selectedSpanID, updatedUncollapsedSpans, isSelectedSpanIDUnCollapsed)
			updatedUncollapsedSpans = append(updatedUncollapsedSpans, spansFromRootToNode...)

			_preOrderTraversal := traverseTrace(rootNode, updatedUncollapsedSpans, 0, true, false, selectedSpanID)
			_selectedSpanIndex := findIndexForSelectedSpanFromPreOrder(_preOrderTraversal, selectedSpanID)

			if _selectedSpanIndex != -1 {
				selectedSpanIndex = _selectedSpanIndex + len(preOrderTraversal)
			}

			preOrderTraversal = append(preOrderTraversal, _preOrderTraversal...)

			if rootServiceName == "" {
				rootServiceName = rootNode.ServiceName
			}

			if rootServiceEntryPoint == "" {
				rootServiceEntryPoint = rootNode.Name
			}
		}
	}

	// if we couldn't find the selectedSpan in the trace then defaulting the selected index to 0
	if selectedSpanIndex == -1 && selectedSpanID != "" {
		selectedSpanIndex = 0
	}

	// get the 0.4*[span limit] before the interested span index
	startIndex := selectedSpanIndex - int(SPAN_LIMIT_PER_REQUEST_FOR_WATERFALL*0.4)
	// get the 0.6*[span limit] after the intrested span index
	endIndex := selectedSpanIndex + int(SPAN_LIMIT_PER_REQUEST_FOR_WATERFALL*0.6)

	// adjust the sliding window according to the available left and right spaces.
	if startIndex < 0 {
		endIndex = endIndex - startIndex
		startIndex = 0
	}
	if endIndex > len(preOrderTraversal) {
		startIndex = startIndex - (endIndex - len(preOrderTraversal))
		endIndex = len(preOrderTraversal)
	}
	if startIndex < 0 {
		startIndex = 0
	}

	return preOrderTraversal[startIndex:endIndex], updatedUncollapsedSpans, rootServiceName, rootServiceEntryPoint
}
