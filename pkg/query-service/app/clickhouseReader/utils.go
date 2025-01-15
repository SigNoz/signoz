package clickhouseReader

import (
	"sort"

	"go.signoz.io/signoz/pkg/query-service/model"
)

func contains(slice []string, item string) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
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
			if !contains(uncollapsedSpans, node.SpanID) {
				spansFromRootToNode = append(spansFromRootToNode, node.SpanID)
			}
			isPresentInSubtreeForTheNode = true
			spansFromRootToNode = append(spansFromRootToNode, _spansFromRootToNode...)
		}
	}
	return isPresentInSubtreeForTheNode, spansFromRootToNode
}

func traverseTraceAndAddRequiredMetadata(span *model.Span, uncollapsedSpans []string, level uint64, isPartOfPreorder bool, hasSibling bool, selectedSpanId string) ([]*model.Span, int) {
	preOrderTraversal := []*model.Span{}
	selectedSpanIndex := -1
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
		ParentSpanId:     span.ParentSpanId,
		Children:         make([]*model.Span, 0),
		HasChildren:      len(span.Children) > 0,
		Level:            level,
		HasSiblings:      hasSibling,
		SubTreeNodeCount: 0,
	}
	if isPartOfPreorder {
		preOrderTraversal = append(preOrderTraversal, &nodeWithoutChildren)
		if nodeWithoutChildren.SpanID == selectedSpanId {
			selectedSpanIndex = len(preOrderTraversal)
		}
	}

	for index, child := range span.Children {
		_childTraversal, _selectedSpanIndex := traverseTraceAndAddRequiredMetadata(child, uncollapsedSpans, level+1, isPartOfPreorder && contains(uncollapsedSpans, span.SpanID), index != (len(span.Children)-1), selectedSpanId)
		preOrderTraversal = append(preOrderTraversal, _childTraversal...)
		if _selectedSpanIndex != -1 {
			selectedSpanIndex = _selectedSpanIndex
		}
		nodeWithoutChildren.SubTreeNodeCount += child.SubTreeNodeCount + 1
		span.SubTreeNodeCount += child.SubTreeNodeCount + 1
	}

	return preOrderTraversal, selectedSpanIndex

}

func bfsTraversalForTrace(span *model.FlamegraphSpan, level int64, bfsMap *map[int64][]*model.FlamegraphSpan) {
	ok, exists := (*bfsMap)[level]
	span.Level = level
	if exists {
		(*bfsMap)[level] = append(ok, span)
	} else {
		(*bfsMap)[level] = []*model.FlamegraphSpan{span}
	}
	for _, child := range span.Children {
		bfsTraversalForTrace(child, level+1, bfsMap)
	}
}
