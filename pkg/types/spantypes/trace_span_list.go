package spantypes

import (
	"cmp"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

const spanListMaxLimit = 1000

var (
	ErrCodeTraceSpansInvalidLimit = errors.MustNewCode("trace_spans_invalid_limit")
	ErrCodeTraceSpansInvalidView  = errors.MustNewCode("trace_spans_invalid_view")
)

// SpanListPage is one page of a span list picked from the tree.
type SpanListPage struct {
	skeleton *TraceSkeleton
	view     SpanListView
	// total counts the spans the page was cut from.
	total     uint64
	positions []int32
}

// NewSpanList builds the items of a page.
func NewSpanList(page *SpanListPage) *SpanList {
	skeleton := page.skeleton
	list := &SpanList{Total: page.total, Items: make([]SpanItem, 0, len(page.positions))}
	for _, i := range page.positions {
		item := SpanItem{Span: skeleton.span(i), TreeStats: skeleton.treeStats(i), UnmarkedFailureKind: skeleton.unmarkedFailureKind(i)}
		if page.view == SpanListViewAIUsage {
			skeleton.setUsageAttributes(&item.Span, i)
		}
		list.Items = append(list.Items, item)
	}
	return list
}

func validateSpanListView(view SpanListView) error {
	if !slices.Contains(SpanListView("").Enum(), any(view)) {
		return errors.NewInvalidInputf(ErrCodeTraceSpansInvalidView, "invalid view %q, expected one of error_origins, unmarked_failures, time_spent, ai_usage, links", string(view))
	}
	return nil
}

func pageLimit(name string, value, fallback int) (int, error) {
	switch {
	case value < 0 || value > spanListMaxLimit:
		return 0, errors.NewInvalidInputf(ErrCodeTraceSpansInvalidLimit, "%s must be between 1 and %d, got %d", name, spanListMaxLimit, value)
	case value == 0:
		return fallback, nil
	}
	return value, nil
}

// page cuts one page out of the spans of scope. A view keeps the ones of its kind, in its own order.
func (skeleton *TraceSkeleton) page(scope []int32, view SpanListView, offset, limit int) *SpanListPage {
	positions := scope
	if view != "" {
		positions = skeleton.viewPositions(view, scope)
	}
	page := &SpanListPage{skeleton: skeleton, view: view, total: uint64(len(positions))}
	if offset < len(positions) {
		page.positions = positions[offset:min(offset+limit, len(positions))]
	}
	return page
}

// viewPositions lists the spans of scope that are in a view, in the order of the view.
func (skeleton *TraceSkeleton) viewPositions(view SpanListView, scope []int32) []int32 {
	switch view {
	case SpanListViewErrorOrigins:
		return skeleton.spansWhere(scope, skeleton.errorStartsAt)
	case SpanListViewUnmarkedFailures:
		return skeleton.spansWhere(scope, func(i int32) bool { return skeleton.unmarkedFailureKind(i) != "" })
	case SpanListViewLinks:
		return skeleton.spansWhere(scope, func(i int32) bool { return skeleton.hasLink[i] })
	case SpanListViewTimeSpent:
		return skeleton.timeSpentSpans(scope)
	case SpanListViewAIUsage:
		return skeleton.aiUsageSpans(scope)
	}
	return nil
}

// errorStartsAt reports whether span i is an error span with no error span among its children.
func (skeleton *TraceSkeleton) errorStartsAt(i int32) bool {
	return skeleton.hasError[i] && !slices.ContainsFunc(skeleton.children(i), func(child int32) bool { return skeleton.hasError[child] })
}

// spansWhere lists the spans of scope that match, in start time order.
func (skeleton *TraceSkeleton) spansWhere(scope []int32, match func(i int32) bool) []int32 {
	spans := make([]int32, 0)
	for _, i := range scope {
		if match(i) {
			spans = append(spans, i)
		}
	}
	slices.Sort(spans)
	return spans
}

// timeSpentSpans lists one span for each sibling group in scope, its longest there, the group with
// the most own time first. Equal groups fall back to span order, so that every page cuts the same ranking.
func (skeleton *TraceSkeleton) timeSpentSpans(scope []int32) []int32 {
	longest := slices.Repeat([]int32{-1}, len(skeleton.groups))
	for _, i := range scope {
		group := skeleton.groupOf[i]
		if longest[group] < 0 || skeleton.durationNano[i] > skeleton.durationNano[longest[group]] {
			longest[group] = i
		}
	}
	spans := slices.DeleteFunc(longest, func(i int32) bool { return i < 0 })
	groupOwnTime := func(i int32) uint64 { return skeleton.groups[skeleton.groupOf[i]].ownTime }
	slices.SortFunc(spans, func(a, b int32) int {
		return cmp.Or(cmp.Compare(groupOwnTime(b), groupOwnTime(a)), cmp.Compare(a, b))
	})
	return spans
}

// aiUsageSpans lists the spans of scope that carry gen_ai usage by cost, or by tokens when none
// of them carries a cost; equal spans fall back to span order.
func (skeleton *TraceSkeleton) aiUsageSpans(scope []int32) []int32 {
	spans := skeleton.spansWhere(scope, func(i int32) bool {
		_, ok := skeleton.aiUsage[i]
		return ok
	})
	hasCost := slices.ContainsFunc(spans, func(i int32) bool { return skeleton.aiUsage[i].Cost != nil })
	weight := func(i int32) float64 {
		usage := skeleton.aiUsage[i]
		if hasCost {
			return floatValue(usage.Cost)
		}
		return floatValue(usage.InputTokens) + floatValue(usage.OutputTokens)
	}
	slices.SortFunc(spans, func(a, b int32) int {
		return cmp.Or(cmp.Compare(weight(b), weight(a)), cmp.Compare(a, b))
	})
	return spans
}

// span returns span i with service.name as its only resource attribute.
func (skeleton *TraceSkeleton) span(i int32) Span {
	return Span{
		SpanID:             skeleton.spanID(i),
		TraceID:            skeleton.traceID,
		ParentSpanID:       skeleton.parentSpanID(i),
		Name:               skeleton.stringTable[skeleton.names[i]],
		KindString:         skeleton.stringTable[skeleton.kinds[i]],
		TimeUnix:           uint64(skeleton.startNano[i] / 1_000_000),
		DurationNano:       skeleton.durationNano[i],
		HasError:           skeleton.hasError[i],
		StatusCodeString:   skeleton.stringTable[skeleton.statusCodeStrings[i]],
		StatusMessage:      skeleton.stringTable[skeleton.statusMessages[i]],
		ResponseStatusCode: skeleton.stringTable[skeleton.responseStatusCodes[i]],
		Resource:           map[string]string{"service.name": skeleton.stringTable[skeleton.services[i]]},
		Attributes:         map[string]any{},
		Events:             []Event{},
		References:         skeleton.spanReferences(i),
	}
}

func (skeleton *TraceSkeleton) setUsageAttributes(span *Span, i int32) {
	usage := skeleton.aiUsage[i]
	for key, value := range map[string]*float64{
		aiobservabilitytypes.GenAIUsageInputTokens:              usage.InputTokens,
		aiobservabilitytypes.GenAIUsageOutputTokens:             usage.OutputTokens,
		aiobservabilitytypes.GenAIUsageCacheReadInputTokens:     usage.CacheReadTokens,
		aiobservabilitytypes.GenAIUsageCacheCreationInputTokens: usage.CacheWriteTokens,
		aiobservabilitytypes.GenAIUsageReasoningOutputTokens:    usage.ReasoningTokens,
		aiobservabilitytypes.SignozGenAITotalCost:               usage.Cost,
	} {
		if value != nil {
			span.Attributes[key] = *value
		}
	}
}

func floatValue(value *float64) float64 {
	if value == nil {
		return 0
	}
	return *value
}
