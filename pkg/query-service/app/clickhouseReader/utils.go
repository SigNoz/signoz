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

func getPathFromRootToSelectedSpanId(node *model.Span, selectedSpanId string, uncollapsedSpans *[]string, isSelectedSpanIDUnCollapsed bool) bool {
	if node.SpanID == selectedSpanId {
		if isSelectedSpanIDUnCollapsed {
			*uncollapsedSpans = append(*uncollapsedSpans, node.SpanID)
		}
		return true
	}
	isPresentInSubtreeForTheNode := false
	for _, child := range node.Children {
		isPresentInThisSubtree := getPathFromRootToSelectedSpanId(child, selectedSpanId, uncollapsedSpans, isSelectedSpanIDUnCollapsed)
		// if the interested node is present in the given subtree then add the span node to uncollapsed node list
		if isPresentInThisSubtree {
			if !contains(*uncollapsedSpans, node.SpanID) {
				*uncollapsedSpans = append(*uncollapsedSpans, node.SpanID)
			}
			isPresentInSubtreeForTheNode = true
		}
	}
	return isPresentInSubtreeForTheNode
}

func traverseTraceAndAddRequiredMetadata(span *model.Span, uncollapsedSpans []string, preorderTraversal *[]*model.Span, level uint64, isPartOfPreorder bool, hasSibling bool) {
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
		DurationNano:     int64(span.DurationNano),
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
		*preorderTraversal = append(*preorderTraversal, &nodeWithoutChildren)
	}

	for index, child := range span.Children {
		traverseTraceAndAddRequiredMetadata(child, uncollapsedSpans, preorderTraversal, level+1, isPartOfPreorder && contains(uncollapsedSpans, span.SpanID), index != (len(span.Children)-1))
		nodeWithoutChildren.SubTreeNodeCount += child.SubTreeNodeCount + 1
		span.SubTreeNodeCount += child.SubTreeNodeCount + 1
	}

}
