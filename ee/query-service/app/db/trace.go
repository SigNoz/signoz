package db

import (
	"errors"
	"strconv"

	"go.signoz.io/signoz/ee/query-service/model"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

// SmartTraceAlgorithm is an algorithm to find the target span and build a tree of spans around it with the given levelUp and levelDown parameters and the given spanLimit
func SmartTraceAlgorithm(payload []basemodel.SearchSpanResponseItem, targetSpanId string, levelUp int, levelDown int, spanLimit int) ([]basemodel.SearchSpansResult, error) {
	var spans []*model.SpanForTraceDetails

	// if targetSpanId is null or not present then randomly select a span as targetSpanId
	if (targetSpanId == "" || targetSpanId == "null") && len(payload) > 0 {
		targetSpanId = payload[0].SpanID
	}

	// Build a slice of spans from the payload
	for _, spanItem := range payload {
		var parentID string
		if len(spanItem.References) > 0 && spanItem.References[0].RefType == "CHILD_OF" {
			parentID = spanItem.References[0].SpanId
		}
		span := &model.SpanForTraceDetails{
			TimeUnixNano: spanItem.TimeUnixNano,
			SpanID:       spanItem.SpanID,
			TraceID:      spanItem.TraceID,
			ServiceName:  spanItem.ServiceName,
			Name:         spanItem.Name,
			Kind:         spanItem.Kind,
			DurationNano: spanItem.DurationNano,
			TagMap:       spanItem.TagMap,
			ParentID:     parentID,
			Events:       spanItem.Events,
			HasError:     spanItem.HasError,
		}
		spans = append(spans, span)
	}

	// Build span trees from the spans
	roots, err := buildSpanTrees(&spans)
	if err != nil {
		return nil, err
	}
	targetSpan := &model.SpanForTraceDetails{}

	// Find the target span in the span trees
	for _, root := range roots {
		targetSpan, err = breadthFirstSearch(root, targetSpanId)
		if targetSpan != nil {
			break
		}
		if err != nil {
			zap.L().Error("Error during BreadthFirstSearch()", zap.Error(err))
			return nil, err
		}
	}

	// If the target span is not found, return span not found error
	if targetSpan == nil {
		return nil, errors.New("span not found")
	}

	// Build the final result
	parents := []*model.SpanForTraceDetails{}

	// Get the parent spans of the target span up to the given levelUp parameter and spanLimit
	preParent := targetSpan
	for i := 0; i < levelUp+1; i++ {
		if i == levelUp {
			preParent.ParentID = ""
		}
		if spanLimit-len(preParent.Children) <= 0 {
			parents = append(parents, preParent)
			parents = append(parents, preParent.Children[:spanLimit]...)
			spanLimit -= (len(preParent.Children[:spanLimit]) + 1)
			preParent.ParentID = ""
			break
		}
		parents = append(parents, preParent)
		parents = append(parents, preParent.Children...)
		spanLimit -= (len(preParent.Children) + 1)
		preParent = preParent.ParentSpan
		if preParent == nil {
			break
		}
	}

	// Get the child spans of the target span until the given levelDown and spanLimit
	preParents := []*model.SpanForTraceDetails{targetSpan}
	children := []*model.SpanForTraceDetails{}

	for i := 0; i < levelDown && len(preParents) != 0 && spanLimit > 0; i++ {
		parents := []*model.SpanForTraceDetails{}
		for _, parent := range preParents {
			if spanLimit-len(parent.Children) <= 0 {
				children = append(children, parent.Children[:spanLimit]...)
				spanLimit -= len(parent.Children[:spanLimit])
				break
			}
			children = append(children, parent.Children...)
			parents = append(parents, parent.Children...)
		}
		preParents = parents
	}

	// Store the final list of spans in the resultSpanSet map to avoid duplicates
	resultSpansSet := make(map[*model.SpanForTraceDetails]struct{})
	resultSpansSet[targetSpan] = struct{}{}
	for _, parent := range parents {
		resultSpansSet[parent] = struct{}{}
	}
	for _, child := range children {
		resultSpansSet[child] = struct{}{}
	}

	searchSpansResult := []basemodel.SearchSpansResult{{
		Columns:   []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References", "Events", "HasError"},
		Events:    make([][]interface{}, len(resultSpansSet)),
		IsSubTree: true,
	},
	}

	// Convert the resultSpansSet map to searchSpansResult
	i := 0 // index for spans
	for item := range resultSpansSet {
		references := []basemodel.OtelSpanRef{
			{
				TraceId: item.TraceID,
				SpanId:  item.ParentID,
				RefType: "CHILD_OF",
			},
		}

		referencesStringArray := []string{}
		for _, item := range references {
			referencesStringArray = append(referencesStringArray, item.ToString())
		}
		keys := make([]string, 0, len(item.TagMap))
		values := make([]string, 0, len(item.TagMap))

		for k, v := range item.TagMap {
			keys = append(keys, k)
			values = append(values, v)
		}
		if item.Events == nil {
			item.Events = []string{}
		}
		searchSpansResult[0].Events[i] = []interface{}{
			item.TimeUnixNano,
			item.SpanID,
			item.TraceID,
			item.ServiceName,
			item.Name,
			strconv.Itoa(int(item.Kind)),
			strconv.FormatInt(item.DurationNano, 10),
			keys,
			values,
			referencesStringArray,
			item.Events,
			item.HasError,
		}
		i++ // increment index
	}
	return searchSpansResult, nil
}

// buildSpanTrees builds trees of spans from a list of spans.
func buildSpanTrees(spansPtr *[]*model.SpanForTraceDetails) ([]*model.SpanForTraceDetails, error) {

	// Build a map of spanID to span for fast lookup
	var roots []*model.SpanForTraceDetails
	spans := *spansPtr
	mapOfSpans := make(map[string]*model.SpanForTraceDetails, len(spans))

	for _, span := range spans {
		if span.ParentID == "" {
			roots = append(roots, span)
		}
		mapOfSpans[span.SpanID] = span
	}

	// Build the span tree by adding children to the parent spans
	for _, span := range spans {
		if span.ParentID == "" {
			continue
		}
		parent := mapOfSpans[span.ParentID]

		// If the parent span is not found, add current span to list of roots
		if parent == nil {
			// zap.L().Debug("Parent Span not found parent_id: ", span.ParentID)
			roots = append(roots, span)
			span.ParentID = ""
			continue
		}

		span.ParentSpan = parent
		parent.Children = append(parent.Children, span)
	}

	return roots, nil
}

// breadthFirstSearch performs a breadth-first search on the span tree to find the target span.
func breadthFirstSearch(spansPtr *model.SpanForTraceDetails, targetId string) (*model.SpanForTraceDetails, error) {
	queue := []*model.SpanForTraceDetails{spansPtr}
	visited := make(map[string]bool)

	for len(queue) > 0 {
		current := queue[0]
		visited[current.SpanID] = true
		queue = queue[1:]
		if current.SpanID == targetId {
			return current, nil
		}

		for _, child := range current.Children {
			if ok := visited[child.SpanID]; !ok {
				queue = append(queue, child)
			}
		}
	}
	return nil, nil
}
