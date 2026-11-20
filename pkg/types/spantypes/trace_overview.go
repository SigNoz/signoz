package spantypes

import (
	"container/heap"
	"encoding/json"
	"slices"
	"strconv"
)

// ErrorPage returns one page of error origins and the ids of its spans, for their status messages.
func (s *TraceSkeleton) ErrorPage(offset int) (*TraceErrorList, []string) {
	origins := s.errorOrigins()
	list := &TraceErrorList{Total: uint64(len(origins)), Items: []TraceErrorItem{}, NextCursor: nextListCursor(OverviewListErrors, offset, len(origins))}
	spanIDs := make([]string, 0, inspectListSize)
	for _, i := range pageOf(origins, offset, inspectListSize) {
		item := TraceErrorItem{Span: s.Summary(i), Parent: s.parentSummary(i)}
		for p := s.Parents[i]; p != noParent && s.HasError(p); p = s.Parents[p] {
			item.ErrorAncestorCount++
		}
		list.Items = append(list.Items, item)
		spanIDs = append(spanIDs, item.Span.SpanID)
	}
	return list, spanIDs
}

// SetStatusMessages fills the status message of each item, cut like any other long value.
func (list *TraceErrorList) SetStatusMessages(messages map[string]string) {
	for i := range list.Items {
		message := messages[list.Items[i].Span.SpanID]
		if cut, _, ok := cutString(message, spanRecordValueChars); ok {
			message = cut
		}
		list.Items[i].StatusMessage = message
	}
}

// UnmarkedFailurePage returns one page of the spans that failed without the error flag: a 4xx
// response, a gRPC status other than OK, or an exception event.
func (s *TraceSkeleton) UnmarkedFailurePage(offset int) *TraceUnmarkedFailureList {
	type failure struct {
		index  int32
		reason UnmarkedFailureReason
	}
	failures := make([]failure, 0)
	for i := range int32(s.Len()) {
		if s.HasError(i) {
			continue
		}
		if reason, ok := unmarkedFailureReason(s.ResponseStatusCode(i), s.HasExceptionEvent(i)); ok {
			failures = append(failures, failure{index: i, reason: reason})
		}
	}
	list := &TraceUnmarkedFailureList{Total: uint64(len(failures)), Items: []TraceUnmarkedFailureItem{}, NextCursor: nextListCursor(OverviewListUnmarkedFailures, offset, len(failures))}
	for _, f := range pageOf(failures, offset, inspectListSize) {
		list.Items = append(list.Items, TraceUnmarkedFailureItem{Span: s.Summary(f.index), Parent: s.parentSummary(f.index), Reason: f.reason})
	}
	return list
}

// LinkPage returns one page of the spans that link to other spans, in start time order.
func (s *TraceSkeleton) LinkPage(offset int) *TraceLinkList {
	list := &TraceLinkList{Total: uint64(len(s.LinkedSpans)), Items: []TraceLinkItem{}, NextCursor: nextListCursor(OverviewListLinks, offset, len(s.LinkedSpans))}
	for _, linked := range pageOf(s.LinkedSpans, offset, inspectListSize) {
		idx, ok := s.Index(linked.SpanID)
		if !ok {
			continue
		}
		list.Items = append(list.Items, TraceLinkItem{
			Span:      s.Summary(idx),
			Parent:    s.parentSummary(idx),
			LinkCount: uint64(len(linked.Links)),
			Links:     linked.Links[:min(len(linked.Links), inspectLinkTargets)],
		})
	}
	return list
}

// SlowestPage returns one page of the ranking by own time, same-name spans under one parent
// counted as one entry. Only the entries up to the end of the page are kept while ranking.
func (s *TraceSkeleton) SlowestPage(offset int) *TraceSlowestList {
	keep := offset + inspectListSize
	top := &slowestHeap{}
	total := 0
	offer := func(e slowestEntry) {
		total++
		switch {
		case top.Len() < keep:
			heap.Push(top, e)
		case e.ranksBefore((*top)[0]):
			(*top)[0] = e
			heap.Fix(top, 0)
		}
	}
	single := func(i int32) slowestEntry {
		e := slowestEntry{longest: i, spanCount: 1, ownTime: s.ownTime[i]}
		if s.HasError(i) {
			e.errCount = 1
		}
		return e
	}

	for _, root := range s.roots {
		offer(single(root))
	}
	var siblings []int32
	for parent := range int32(s.Len()) {
		children := s.Children(parent)
		if len(children) == 1 {
			offer(single(children[0]))
			continue
		}
		siblings = append(siblings[:0], children...)
		slices.SortStableFunc(siblings, func(a, b int32) int {
			if s.Names[a] != s.Names[b] {
				return int(s.Names[a]) - int(s.Names[b])
			}
			return int(s.Services[a]) - int(s.Services[b])
		})
		for k := 0; k < len(siblings); {
			e := single(siblings[k])
			next := k + 1
			for ; next < len(siblings) && s.Names[siblings[next]] == s.Names[siblings[k]] && s.Services[siblings[next]] == s.Services[siblings[k]]; next++ {
				member := single(siblings[next])
				e.spanCount++
				e.ownTime += member.ownTime
				e.errCount += member.errCount
				if s.DurationNano[siblings[next]] > s.DurationNano[e.longest] {
					e.longest = siblings[next]
				}
			}
			offer(e)
			k = next
		}
	}

	ranked := []slowestEntry(*top)
	slices.SortFunc(ranked, func(a, b slowestEntry) int {
		if a.ranksBefore(b) {
			return -1
		}
		return 1
	})
	list := &TraceSlowestList{Total: uint64(total), Items: []TraceSlowestItem{}, NextCursor: nextListCursor(OverviewListSlowest, offset, total)}
	for _, e := range pageOf(ranked, offset, inspectListSize) {
		list.Items = append(list.Items, TraceSlowestItem{Span: s.Summary(e.longest), Parent: s.parentSummary(e.longest), SpanCount: e.spanCount, OwnTimeNano: e.ownTime, ErrorSpanCount: e.errCount})
	}
	return list
}

// ExpensivePage returns one page of the gen_ai spans ranked by cost, or by tokens when no span
// carries a cost; nil without gen_ai spans.
func (s *TraceSkeleton) ExpensivePage(offset int) *TraceExpensiveList {
	if len(s.AISpans) == 0 {
		return nil
	}
	hasCost := false
	for i := range s.AISpans {
		if s.AISpans[i].Cost != nil {
			hasCost = true
			break
		}
	}
	type rankedSpan struct {
		index  int32
		weight float64
		usage  *AISpanUsage
	}
	ranked := make([]rankedSpan, 0, len(s.AISpans))
	for i := range s.AISpans {
		usage := &s.AISpans[i]
		index, ok := s.Index(usage.SpanID)
		if !ok {
			continue
		}
		weight := floatValue(usage.InputTokens) + floatValue(usage.OutputTokens)
		if hasCost {
			weight = floatValue(usage.Cost)
		}
		ranked = append(ranked, rankedSpan{index: index, weight: weight, usage: usage})
	}
	// Equal weights fall back to span order, so that every page cuts the same ranking.
	slices.SortFunc(ranked, func(a, b rankedSpan) int {
		switch {
		case a.weight > b.weight:
			return -1
		case a.weight < b.weight:
			return 1
		}
		return int(a.index) - int(b.index)
	})

	list := &TraceExpensiveList{Total: uint64(len(ranked)), Items: []TraceExpensiveItem{}, NextCursor: nextListCursor(OverviewListExpensive, offset, len(ranked))}
	for _, span := range pageOf(ranked, offset, inspectListSize) {
		list.Items = append(list.Items, TraceExpensiveItem{
			Span:         s.Summary(span.index),
			Parent:       s.parentSummary(span.index),
			Cost:         span.usage.Cost,
			InputTokens:  uint64(floatValue(span.usage.InputTokens)),
			OutputTokens: uint64(floatValue(span.usage.OutputTokens)),
		})
	}
	return list
}

func (s *TraceSkeleton) Identity() *TraceIdentity {
	identity := &TraceIdentity{
		TraceID:              s.TraceID,
		StartTimestampMillis: uint64(s.startNs / 1_000_000),
		DurationNano:         uint64(s.endNs - s.startNs),
		SpanCount:            uint64(s.Len()),
		ErrorSpanCount:       s.errCount,
		RootCount:            uint64(len(s.roots)),
		HasMissingSpans:      s.HasMissingSpans(),
	}
	if root, ok := s.PrimaryRoot(); ok && !s.HasMissingParent(root) {
		summary := s.Summary(root)
		identity.Root = &summary
	}

	stats := make([]TraceServiceStats, len(s.Strings))
	for i := range int32(s.Len()) {
		service := &stats[s.Services[i]]
		service.SpanCount++
		service.OwnTimeNano += s.ownTime[i]
		if s.HasError(i) {
			service.ErrorSpanCount++
		}
	}
	services := make([]TraceServiceStats, 0)
	for idx := range stats {
		if stats[idx].SpanCount > 0 {
			stats[idx].ServiceName = s.Strings[idx]
			services = append(services, stats[idx])
		}
	}
	slices.SortStableFunc(services, func(a, b TraceServiceStats) int {
		switch {
		case a.OwnTimeNano > b.OwnTimeNano:
			return -1
		case a.OwnTimeNano < b.OwnTimeNano:
			return 1
		}
		return 0
	})
	identity.ServiceCount = uint64(len(services))
	identity.Services = services[:min(len(services), inspectServiceLimit)]

	if len(s.AISpans) > 0 {
		ai := &TraceAIIdentity{}
		for i := range s.AISpans {
			usage := &s.AISpans[i]
			if usage.IsModelCall {
				ai.ModelCallCount++
			}
			if usage.IsToolCall {
				ai.ToolCallCount++
			}
			ai.Tokens.Input += uint64(floatValue(usage.InputTokens))
			ai.Tokens.Output += uint64(floatValue(usage.OutputTokens))
			ai.Tokens.CacheRead += uint64(floatValue(usage.CacheReadTokens))
			ai.Tokens.CacheWrite += uint64(floatValue(usage.CacheWriteTokens))
			ai.Tokens.Reasoning += uint64(floatValue(usage.ReasoningTokens))
			if usage.Cost != nil {
				if ai.TotalCost == nil {
					ai.TotalCost = new(float64)
				}
				*ai.TotalCost += *usage.Cost
			}
		}
		identity.AI = ai
	}
	return identity
}

// Tree lists the first 50 spans of the trace: level by level from the roots, and in time order on
// the level that does not fit. It is complete when the trace has no more spans than that.
func (s *TraceSkeleton) Tree() *TraceTree {
	return s.tree(inspectTreeSpans)
}

// FitOverview drops the span records and then shrinks the tree until the overview fits the
// response size limit.
func (s *TraceSkeleton) FitOverview(overview *TraceOverview) {
	for limit := len(overview.Tree.Spans); jsonChars(overview) > inspectMaxResponseChars && limit > 0; {
		if overview.Tree.Records != nil {
			overview.Tree.Records = nil
			continue
		}
		over := jsonChars(overview) - inspectMaxResponseChars
		perSpan := jsonChars(overview.Tree.Spans)/len(overview.Tree.Spans) + 1
		limit = max(limit-over/perSpan-1, 0)
		overview.Tree = s.tree(limit)
	}
}

// SpanDetail places span i in the trace: its nearest ancestors with the root, and the first
// spans of each level below it. The record and the percentile are filled by the caller.
func (s *TraceSkeleton) SpanDetail(i int32, depth int) *TraceSpanDetail {
	ancestors := s.Ancestors(i)
	detail := &TraceSpanDetail{
		Summary:       s.Summary(i),
		Ancestors:     make([]SpanSummary, 0, depth+1),
		AncestorCount: uint64(len(ancestors)),
		Descendants:   make([]TraceSpanLevel, 0, depth),
	}
	for _, ancestor := range ancestors[:min(len(ancestors), depth)] {
		detail.Ancestors = append(detail.Ancestors, s.Summary(ancestor))
	}
	if len(ancestors) > depth {
		detail.Ancestors = append(detail.Ancestors, s.Summary(ancestors[len(ancestors)-1]))
	}

	spans := []int32{i}
	for level := 1; level <= depth; level++ {
		next := make([]int32, 0)
		for _, parent := range spans {
			next = append(next, s.Children(parent)...)
		}
		if len(next) == 0 {
			break
		}
		// Positions are in start time order; sorting puts the children of different parents in time order.
		slices.Sort(next)
		shown := make([]SpanSummary, 0, min(len(next), inspectLevelSize))
		for _, child := range next[:min(len(next), inspectLevelSize)] {
			shown = append(shown, s.Summary(child))
		}
		detail.Descendants = append(detail.Descendants, TraceSpanLevel{Level: uint32(level), Total: uint64(len(next)), Spans: shown})
		spans = next
	}
	return detail
}

// FitSpan drops the deepest levels below the span until the response fits its size limit.
func FitSpan(detail *TraceSpanDetail) {
	for len(detail.Descendants) > 0 && jsonChars(detail) > inspectMaxResponseChars {
		detail.Descendants = detail.Descendants[:len(detail.Descendants)-1]
	}
}

// slowestEntry is one span, or the same-name spans under one parent taken together.
type slowestEntry struct {
	longest   int32
	spanCount uint64
	ownTime   uint64
	errCount  uint64
}

// ranksBefore orders entries by own time, the largest first, and by span order between equals,
// so that every page cuts the same ranking.
func (e slowestEntry) ranksBefore(other slowestEntry) bool {
	if e.ownTime != other.ownTime {
		return e.ownTime > other.ownTime
	}
	return e.longest < other.longest
}

// slowestHeap holds the best-ranked entries seen so far, the last of them on top.
type slowestHeap []slowestEntry

func (h slowestHeap) Len() int           { return len(h) }
func (h slowestHeap) Less(i, j int) bool { return h[j].ranksBefore(h[i]) }
func (h slowestHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *slowestHeap) Push(x any)        { *h = append(*h, x.(slowestEntry)) }

func (h *slowestHeap) Pop() any {
	old := *h
	last := old[len(old)-1]
	*h = old[:len(old)-1]
	return last
}

// errorOrigins lists the error spans with no error span among their children, in start time order.
func (s *TraceSkeleton) errorOrigins() []int32 {
	origins := make([]int32, 0)
	for i := range int32(s.Len()) {
		if !s.HasError(i) {
			continue
		}
		hasErrorChild := false
		for _, child := range s.Children(i) {
			if s.HasError(child) {
				hasErrorChild = true
				break
			}
		}
		if !hasErrorChild {
			origins = append(origins, i)
		}
	}
	return origins
}

// unmarkedFailureReason reads the response status column, which holds an HTTP status or a gRPC status.
func unmarkedFailureReason(responseStatusCode string, hasExceptionEvent bool) (UnmarkedFailureReason, bool) {
	if code, err := strconv.Atoi(responseStatusCode); err == nil {
		switch {
		case code >= 400 && code < 500:
			return UnmarkedFailureHTTP4xx, true
		case code >= 1 && code <= 16:
			return UnmarkedFailureGRPCStatus, true
		}
	}
	if hasExceptionEvent {
		return UnmarkedFailureExceptionEvent, true
	}
	return UnmarkedFailureReason{}, false
}

func (s *TraceSkeleton) tree(limit int) *TraceTree {
	tree := &TraceTree{Total: uint64(s.Len()), Complete: s.Len() <= limit}
	shown := make(map[int32]struct{}, min(limit, s.Len()))
	for level := s.roots; len(level) > 0 && len(shown) < limit; {
		level = level[:min(len(level), limit-len(shown))]
		next := make([]int32, 0)
		for _, i := range level {
			shown[i] = struct{}{}
			next = append(next, s.Children(i)...)
		}
		// Positions are in start time order; sorting puts the children of different parents in time order.
		slices.Sort(next)
		level = next
	}

	// The shown spans are returned in tree order: a span is followed by the spans below it.
	tree.Spans = make([]SpanSummary, 0, len(shown))
	for _, i := range s.preorder {
		if _, ok := shown[i]; ok {
			tree.Spans = append(tree.Spans, s.Summary(i))
		}
	}
	return tree
}

// parentSummary returns the short form of span i's direct parent; nil for a root or a missing parent.
func (s *TraceSkeleton) parentSummary(i int32) *SpanSummary {
	parent := s.Parents[i]
	if parent == noParent {
		return nil
	}
	summary := s.Summary(parent)
	return &summary
}

// nextListCursor returns the cursor of the page after the one starting at offset; empty on the last page.
func nextListCursor(list string, offset, total int) string {
	if offset+inspectListSize >= total {
		return ""
	}
	return encodeCursor(overviewCursor{List: list, Offset: offset + inspectListSize})
}

func pageOf[T any](items []T, offset, limit int) []T {
	if offset >= len(items) {
		return nil
	}
	return items[offset:min(offset+limit, len(items))]
}

func jsonChars(value any) int {
	data, _ := json.Marshal(value)
	return len(data)
}

func floatValue(value *float64) float64 {
	if value == nil {
		return 0
	}
	return *value
}
