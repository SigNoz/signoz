package tracedetail

import (
	"maps"
	"slices"
	"sort"

	"github.com/SigNoz/signoz/pkg/query-service/model"
)

var (
	SPAN_LIMIT_PER_REQUEST_FOR_WATERFALL float64 = 500

	maxDepthForSelectedSpanChildren int  = 5
	MaxLimitToSelectAllSpans        uint = 10_000
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

func getPathFromRootToSelectedSpanId(node *model.Span, selectedSpanId string) (bool, []string) {
	spansFromRootToNode := []string{}

	spansFromRootToNode = append(spansFromRootToNode, node.SpanID)
	if node.SpanID == selectedSpanId {
		return true, spansFromRootToNode
	}

	isPresentInSubtreeForTheNode := false
	for _, child := range node.Children {
		isPresentInThisSubtree, _spansFromRootToNode := getPathFromRootToSelectedSpanId(child, selectedSpanId)
		// if the interested node is present in the given subtree then add the span node to uncollapsed node list
		if isPresentInThisSubtree {
			isPresentInSubtreeForTheNode = true
			spansFromRootToNode = append(spansFromRootToNode, _spansFromRootToNode...)
			break
		}
	}
	return isPresentInSubtreeForTheNode, spansFromRootToNode
}

// traverseOpts holds the traversal configuration that remains constant
// throughout the recursion. Per-call state (level, isPartOfPreOrder, etc.)
// is passed as direct arguments.
type traverseOpts struct {
	uncollapsedSpans          map[string]struct{}
	selectedSpanID            string
	isSelectedSpanUncollapsed bool
	selectAll                 bool
}

func traverseTrace(
	span *model.Span,
	opts traverseOpts,
	level uint64,
	isPartOfPreOrder bool,
	hasSibling bool,
	autoExpandDepth int,
) ([]*model.Span, []string) {

	preOrderTraversal := []*model.Span{}
	autoExpandedSpans := []string{}

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

	remainingAutoExpandDepth := 0
	if span.SpanID == opts.selectedSpanID && opts.isSelectedSpanUncollapsed {
		remainingAutoExpandDepth = maxDepthForSelectedSpanChildren
	} else if autoExpandDepth > 0 {
		remainingAutoExpandDepth = autoExpandDepth - 1
	}

	_, isAlreadyUncollapsed := opts.uncollapsedSpans[span.SpanID]
	for index, child := range span.Children {
		// A child is included in the pre-order output if its parent is uncollapsed
		// OR if the child falls within MAX_DEPTH_FOR_SELECTED_SPAN_CHILDREN levels
		// below the selected span.
		isChildWithinMaxDepth := remainingAutoExpandDepth > 0
		childIsPartOfPreOrder := opts.selectAll || (isPartOfPreOrder && (isAlreadyUncollapsed || isChildWithinMaxDepth))

		if isPartOfPreOrder && isChildWithinMaxDepth && !isAlreadyUncollapsed {
			if !slices.Contains(autoExpandedSpans, span.SpanID) {
				autoExpandedSpans = append(autoExpandedSpans, span.SpanID)
			}
		}

		_childTraversal, _autoExpanded := traverseTrace(child, opts, level+1, childIsPartOfPreOrder, index != (len(span.Children)-1), remainingAutoExpandDepth)
		preOrderTraversal = append(preOrderTraversal, _childTraversal...)
		autoExpandedSpans = append(autoExpandedSpans, _autoExpanded...)
		nodeWithoutChildren.SubTreeNodeCount += child.SubTreeNodeCount + 1
		span.SubTreeNodeCount += child.SubTreeNodeCount + 1
	}

	nodeWithoutChildren.SubTreeNodeCount += 1
	return preOrderTraversal, autoExpandedSpans

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

	// create a map of uncollapsed spans for quick lookup
	uncollapsedSpanMap := make(map[string]struct{})
	for _, spanID := range uncollapsedSpans {
		uncollapsedSpanMap[spanID] = struct{}{}
	}

	selectedSpanIndex := -1
	for _, rootSpanID := range traceRoots {
		if rootNode, exists := spanIdToSpanNodeMap[rootSpanID.SpanID]; exists {
			present, spansFromRootToNode := getPathFromRootToSelectedSpanId(rootNode, selectedSpanID)
			if present {
				for _, spanID := range spansFromRootToNode {
					if selectedSpanID == spanID && !isSelectedSpanIDUnCollapsed {
						continue
					}
					uncollapsedSpanMap[spanID] = struct{}{}
				}
			}

			opts := traverseOpts{
				uncollapsedSpans:          uncollapsedSpanMap,
				selectedSpanID:            selectedSpanID,
				isSelectedSpanUncollapsed: isSelectedSpanIDUnCollapsed,
			}
			_preOrderTraversal, _autoExpanded := traverseTrace(rootNode, opts, 0, true, false, 0)
			// Merge auto-expanded spans into updatedUncollapsedSpans for returning in response
			for _, spanID := range _autoExpanded {
				uncollapsedSpanMap[spanID] = struct{}{}
			}
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

	return preOrderTraversal[startIndex:endIndex], slices.Collect(maps.Keys(uncollapsedSpanMap)), rootServiceName, rootServiceEntryPoint
}

func GetAllSpans(traceRoots []*model.Span) (spans []*model.Span, rootServiceName, rootEntryPoint string) {
	if len(traceRoots) > 0 {
		rootServiceName = traceRoots[0].ServiceName
		rootEntryPoint = traceRoots[0].Name
	}
	for _, root := range traceRoots {
		childSpans, _ := traverseTrace(root, traverseOpts{selectAll: true}, 0, true, false, 0)
		spans = append(spans, childSpans...)
	}
	return
}
