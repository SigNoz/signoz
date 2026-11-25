package spantypes

import (
	"cmp"
	"maps"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

const spanListMaxLimit = 1000

var (
	ErrCodeTraceSpansInvalidLimit = errors.MustNewCode("trace_spans_invalid_limit")
	ErrCodeTraceSpansInvalidView  = errors.MustNewCode("trace_spans_invalid_view")
)

// spanPage is one page of a view by span position, before the stored data of its spans is read.
type spanPage struct {
	view      SpanListView
	total     uint64
	positions []int32
}

// spanListViews lists every view, in the order they are documented.
func spanListViews() []SpanListView {
	views := make([]SpanListView, 0)
	for _, view := range SpanListView("").Enum() {
		views = append(views, view.(SpanListView))
	}
	return views
}

func validateSpanListView(view SpanListView) error {
	if !slices.Contains(spanListViews(), view) {
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

// firstPage returns the first limit spans of a view, with the size of the whole view as its total.
func (skeleton *TraceSkeleton) firstPage(view SpanListView, limit int) *spanPage {
	positions := skeleton.viewPositions(view)
	return &spanPage{view: view, total: uint64(len(positions)), positions: positions[:min(limit, len(positions))]}
}

// viewPositions lists the spans of a view in the order of the view.
func (skeleton *TraceSkeleton) viewPositions(view SpanListView) []int32 {
	switch view {
	case SpanListViewErrorOrigins:
		return skeleton.spansWhere(skeleton.errorStartsAt)
	case SpanListViewUnmarkedFailures:
		return skeleton.spansWhere(func(i int32) bool { return skeleton.unmarkedFailureKind(i) != "" })
	case SpanListViewLinks:
		return skeleton.spansWhere(func(i int32) bool { return skeleton.hasLink[i] })
	case SpanListViewTimeSpent:
		return skeleton.timeSpentSpans()
	case SpanListViewAIUsage:
		return skeleton.aiUsageSpans()
	}
	return skeleton.treeOrder
}

// errorStartsAt reports whether span i is an error span with no error span among its children.
func (skeleton *TraceSkeleton) errorStartsAt(i int32) bool {
	return skeleton.hasError[i] && !slices.ContainsFunc(skeleton.children(i), func(child int32) bool { return skeleton.hasError[child] })
}

// spansWhere lists the spans that match, in start time order.
func (skeleton *TraceSkeleton) spansWhere(match func(i int32) bool) []int32 {
	spans := make([]int32, 0)
	for i := range int32(skeleton.len()) {
		if match(i) {
			spans = append(spans, i)
		}
	}
	return spans
}

// timeSpentSpans lists the longest span of each sibling group, the group with the most own time
// first. Equal groups fall back to span order, so that every page cuts the same ranking.
func (skeleton *TraceSkeleton) timeSpentSpans() []int32 {
	ranked := slices.Clone(skeleton.groups)
	slices.SortFunc(ranked, func(a, b siblingGroup) int {
		return cmp.Or(cmp.Compare(b.ownTime, a.ownTime), cmp.Compare(a.longest, b.longest))
	})
	spans := make([]int32, len(ranked))
	for k := range ranked {
		spans[k] = ranked[k].longest
	}
	return spans
}

// aiUsageSpans lists the spans that carry gen_ai usage by cost, or by tokens when no span
// carries a cost; equal spans fall back to span order.
func (skeleton *TraceSkeleton) aiUsageSpans() []int32 {
	hasCost := false
	for _, usage := range skeleton.aiUsage {
		hasCost = hasCost || usage.Cost != nil
	}
	weight := func(i int32) float64 {
		usage := skeleton.aiUsage[i]
		if hasCost {
			return floatValue(usage.Cost)
		}
		return floatValue(usage.InputTokens) + floatValue(usage.OutputTokens)
	}
	spans := slices.Collect(maps.Keys(skeleton.aiUsage))
	slices.SortFunc(spans, func(a, b int32) int {
		return cmp.Or(cmp.Compare(weight(b), weight(a)), cmp.Compare(a, b))
	})
	return spans
}

// newSpanList builds the items of a page.
func (skeleton *TraceSkeleton) newSpanList(page *spanPage) SpanList {
	list := SpanList{Total: page.total, Items: make([]SpanItem, 0, len(page.positions))}
	for _, i := range page.positions {
		item := SpanItem{Span: skeleton.span(i), TreeStats: skeleton.treeStats(i), UnmarkedFailureKind: skeleton.unmarkedFailureKind(i)}
		if page.view == SpanListViewAIUsage {
			skeleton.setUsageAttributes(&item.Span, i)
		}
		list.Items = append(list.Items, item)
	}
	return list
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
