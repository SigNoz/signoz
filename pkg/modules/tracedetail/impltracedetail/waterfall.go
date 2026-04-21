package impltracedetail

import (
	"maps"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/tracedetailtypes"
)

type traverseOpts struct {
	uncollapsedSpans map[string]struct{}
	selectedSpanID   string
	selectAll        bool
}

func GetSelectedSpans(uncollapsedSpans []string, selectedSpanID string, trace *tracedetailtypes.WaterfallTrace, spanIDToSpanNodeMap map[string]*tracedetailtypes.WaterfallSpan) ([]*tracedetailtypes.WaterfallSpan, []string) {
	uncollapsedSpanMap := trace.CalculateUncollapsedSpanIDs(uncollapsedSpans, selectedSpanID)

	var preOrderTraversal = make([]*tracedetailtypes.WaterfallSpan, 0)
	selectedSpanIndex := -1
	for _, rootSpanID := range trace.TraceRoots {
		rootNode, exists := spanIDToSpanNodeMap[rootSpanID.SpanID]
		if !exists {
			continue
		}

		opts := traverseOpts{
			uncollapsedSpans: uncollapsedSpanMap,
			selectedSpanID:   selectedSpanID,
		}
		preOrderderedSpans, autoExpanded := traverseTrace(rootNode, opts, 0, true, 0)
		for _, spanID := range autoExpanded {
			uncollapsedSpanMap[spanID] = struct{}{}
		}

		if idx := findIndexForSelectedSpan(preOrderderedSpans, selectedSpanID); idx != -1 {
			selectedSpanIndex = idx + len(preOrderTraversal)
		}
		preOrderTraversal = append(preOrderTraversal, preOrderderedSpans...)
	}

	startIndex, endIndex := windowAroundIndex(selectedSpanIndex, len(preOrderTraversal))

	return preOrderTraversal[startIndex:endIndex], slices.Collect(maps.Keys(uncollapsedSpanMap))
}

// getUncollapsedSpanMap creates a map from uncollapsed spans ids and root to selected span path.
// func getUncollapsedSpanMap(uncollapsedSpans []string, selectedSpanID string, traceRoots []*tracedetailtypes.WaterfallSpan, spanIDToSpanNodeMap map[string]*tracedetailtypes.WaterfallSpan) map[string]struct{} {
// 	uncollapsedSpanMap := make(map[string]struct{}, len(uncollapsedSpans))
// 	for _, spanID := range uncollapsedSpans {
// 		uncollapsedSpanMap[spanID] = struct{}{}
// 	}

// 	for _, root := range traceRoots {
// 		rootNode, exists := spanIDToSpanNodeMap[root.SpanID]
// 		if !exists {
// 			continue
// 		}
// 		if found, path := getPathFromRootToSelectedSpanID(rootNode, selectedSpanID); found {
// 			for _, spanID := range path {
// 				if spanID != selectedSpanID {
// 					uncollapsedSpanMap[spanID] = struct{}{}
// 				}
// 			}
// 			break
// 		}
// 	}
// 	return uncollapsedSpanMap
// }

// windowAroundIndex returns start/end indices for a window of SpanLimitPerRequest spans.
func windowAroundIndex(selectedIndex, total int) (start, end int) {
	selectedIndex = max(selectedIndex, 0)

	start = selectedIndex - int(tracedetailtypes.SpanLimitPerRequest*0.4)
	end = selectedIndex + int(tracedetailtypes.SpanLimitPerRequest*0.6)

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

func traverseTrace(
	span *tracedetailtypes.WaterfallSpan,
	opts traverseOpts,
	level uint64,
	isPartOfPreOrder bool,
	autoExpandDepth int,
) ([]*tracedetailtypes.WaterfallSpan, []string) {

	preOrderTraversal := []*tracedetailtypes.WaterfallSpan{}
	autoExpandedSpans := []string{}

	span.SubTreeNodeCount = 0
	nodeWithoutChildren := span.CopyWithoutChildren(level)

	if isPartOfPreOrder {
		preOrderTraversal = append(preOrderTraversal, nodeWithoutChildren)
	}

	remainingAutoExpandDepth := 0
	_, isSelectedSpanUncollapsed := opts.uncollapsedSpans[opts.selectedSpanID]
	if span.SpanID == opts.selectedSpanID && isSelectedSpanUncollapsed {
		remainingAutoExpandDepth = tracedetailtypes.MaxDepthForSelectedChildren
	} else if autoExpandDepth > 0 {
		remainingAutoExpandDepth = autoExpandDepth - 1
	}

	_, isAlreadyUncollapsed := opts.uncollapsedSpans[span.SpanID]
	for _, child := range span.Children {
		isChildWithinMaxDepth := remainingAutoExpandDepth > 0
		childIsPartOfPreOrder := opts.selectAll || (isPartOfPreOrder && (isAlreadyUncollapsed || isChildWithinMaxDepth))

		if isPartOfPreOrder && isChildWithinMaxDepth && !isAlreadyUncollapsed {
			if !slices.Contains(autoExpandedSpans, span.SpanID) {
				autoExpandedSpans = append(autoExpandedSpans, span.SpanID)
			}
		}

		childTraversal, childAutoExpanded := traverseTrace(child, opts, level+1, childIsPartOfPreOrder, remainingAutoExpandDepth)
		preOrderTraversal = append(preOrderTraversal, childTraversal...)
		autoExpandedSpans = append(autoExpandedSpans, childAutoExpanded...)
		nodeWithoutChildren.SubTreeNodeCount += child.SubTreeNodeCount + 1
		span.SubTreeNodeCount += child.SubTreeNodeCount + 1
	}

	nodeWithoutChildren.SubTreeNodeCount += 1
	return preOrderTraversal, autoExpandedSpans
}

func getPathFromRootToSelectedSpanID(node *tracedetailtypes.WaterfallSpan, selectedSpanID string) (bool, []string) {
	path := []string{node.SpanID}
	if node.SpanID == selectedSpanID {
		return true, path
	}

	for _, child := range node.Children {
		found, childPath := getPathFromRootToSelectedSpanID(child, selectedSpanID)
		if found {
			path = append(path, childPath...)
			return true, path
		}
	}
	return false, nil
}

func findIndexForSelectedSpan(spans []*tracedetailtypes.WaterfallSpan, selectedSpanID string) int {
	for i, span := range spans {
		if span.SpanID == selectedSpanID {
			return i
		}
	}
	return -1
}

func containsSpan(spans []*tracedetailtypes.WaterfallSpan, target *tracedetailtypes.WaterfallSpan) bool {
	for _, s := range spans {
		if s.SpanID == target.SpanID {
			return true
		}
	}
	return false
}

func waterfallCacheKey(traceID string) string {
	return strings.Join([]string{"v3_waterfall", traceID}, "-")
}
