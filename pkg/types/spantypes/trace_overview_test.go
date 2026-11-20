package spantypes

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func summaryIDs(summaries []SpanSummary) []string {
	ids := make([]string, 0, len(summaries))
	for _, summary := range summaries {
		ids = append(ids, summary.SpanID)
	}
	return ids
}

// nextOffset reads the offset out of a list's nextCursor, as a request carrying it would.
func nextOffset(t *testing.T, list, cursor string) int {
	t.Helper()
	query, err := NewTraceOverviewQuery(&InspectTraceParams{Cursor: cursor})
	require.NoError(t, err)
	require.Equal(t, list, query.List)
	return query.Offset
}

func TestErrorPage(t *testing.T) {
	t.Run("ErrorCarriedUpToRoot_ListsWhereItStarted", func(t *testing.T) {
		specs := []skeletonSpec{{id: "level-0", startMs: 0, durationMs: 100, hasError: true}}
		for depth := 1; depth <= 12; depth++ {
			specs = append(specs, skeletonSpec{id: fmt.Sprintf("level-%d", depth), parent: fmt.Sprintf("level-%d", depth-1), startMs: int64(depth), durationMs: 50, hasError: true})
		}
		specs = append(specs, skeletonSpec{id: "healthy", parent: "level-0", startMs: 60, durationMs: 5})
		skeleton := buildSkeleton(specs...)

		list, spanIDs := skeleton.ErrorPage(0)

		assert.Equal(t, uint64(1), list.Total)
		assert.Equal(t, []string{"level-12"}, spanIDs)
		require.Len(t, list.Items, 1)
		assert.Equal(t, uint32(12), list.Items[0].ErrorAncestorCount)
		require.NotNil(t, list.Items[0].Parent)
		assert.Equal(t, "level-11", list.Items[0].Parent.SpanID)
		assert.Empty(t, list.NextCursor)
	})

	t.Run("ParentFailsOnItsOwn_ListsChildOnly", func(t *testing.T) {
		skeleton := buildSkeleton(
			skeletonSpec{id: "root", startMs: 0, durationMs: 100},
			skeletonSpec{id: "parent", parent: "root", startMs: 1, durationMs: 50, hasError: true},
			skeletonSpec{id: "child", parent: "parent", startMs: 2, durationMs: 10, hasError: true},
			skeletonSpec{id: "other", parent: "root", startMs: 60, durationMs: 10, hasError: true},
		)

		list, spanIDs := skeleton.ErrorPage(0)

		assert.Equal(t, uint64(2), list.Total)
		assert.Equal(t, []string{"child", "other"}, spanIDs)
	})

	t.Run("MoreThanOnePage_PagesByCursorInStartOrder", func(t *testing.T) {
		specs := []skeletonSpec{{id: "root", startMs: 0, durationMs: 1000}}
		for i := range 23 {
			specs = append(specs, skeletonSpec{id: fmt.Sprintf("err-%02d", i), parent: "root", startMs: int64(i + 1), durationMs: 1, hasError: true})
		}
		skeleton := buildSkeleton(specs...)

		seen := make([]string, 0, 23)
		offset := 0
		for range 3 {
			list, spanIDs := skeleton.ErrorPage(offset)
			assert.Equal(t, uint64(23), list.Total)
			seen = append(seen, spanIDs...)
			if list.NextCursor == "" {
				break
			}
			offset = nextOffset(t, OverviewListErrors, list.NextCursor)
		}

		require.Len(t, seen, 23)
		assert.Equal(t, "err-00", seen[0])
		assert.Equal(t, "err-10", seen[10])
		assert.Equal(t, "err-22", seen[22])
	})

	t.Run("RootError_HasNoParentAndItsMessageIsCut", func(t *testing.T) {
		skeleton := buildSkeleton(skeletonSpec{id: "root", startMs: 0, durationMs: 10, hasError: true})
		list, _ := skeleton.ErrorPage(0)
		message := ""
		for range 60 {
			message += "0123456789"
		}

		list.SetStatusMessages(map[string]string{"root": message})

		assert.Nil(t, list.Items[0].Parent)
		assert.Len(t, []rune(list.Items[0].StatusMessage), spanRecordValueChars+1)
	})
}

func TestUnmarkedFailurePage(t *testing.T) {
	skeleton := buildSkeleton(
		skeletonSpec{id: "root", startMs: 0, durationMs: 100, statusCode: "200"},
		skeletonSpec{id: "not-found", parent: "root", startMs: 1, durationMs: 1, statusCode: "404"},
		skeletonSpec{id: "flagged-4xx", parent: "root", startMs: 2, durationMs: 1, statusCode: "409", hasError: true},
		skeletonSpec{id: "grpc-ok", parent: "root", startMs: 3, durationMs: 1, statusCode: "0"},
		skeletonSpec{id: "grpc-not-found", parent: "root", startMs: 4, durationMs: 1, statusCode: "5"},
		skeletonSpec{id: "handled-exception", parent: "root", startMs: 5, durationMs: 1, hasException: true},
		skeletonSpec{id: "server-error", parent: "root", startMs: 6, durationMs: 1, statusCode: "503"},
		skeletonSpec{id: "json-rpc", parent: "root", startMs: 7, durationMs: 1, statusCode: "-32601"},
	)

	list := skeleton.UnmarkedFailurePage(0)

	require.Len(t, list.Items, 3)
	assert.Equal(t, uint64(3), list.Total)
	assert.Equal(t, "not-found", list.Items[0].Span.SpanID)
	assert.Equal(t, UnmarkedFailureHTTP4xx, list.Items[0].Reason)
	require.NotNil(t, list.Items[0].Parent)
	assert.Equal(t, "root", list.Items[0].Parent.SpanID)
	assert.Equal(t, "grpc-not-found", list.Items[1].Span.SpanID)
	assert.Equal(t, UnmarkedFailureGRPCStatus, list.Items[1].Reason)
	assert.Equal(t, "handled-exception", list.Items[2].Span.SpanID)
	assert.Equal(t, UnmarkedFailureExceptionEvent, list.Items[2].Reason)
}

func TestLinkPage(t *testing.T) {
	specs := []skeletonSpec{{id: "root", startMs: 0, durationMs: 1000}}
	linkedSpans := make([]LinkedSpan, 0, 14)
	for i := range 13 {
		id := fmt.Sprintf("consumer-%02d", i)
		specs = append(specs, skeletonSpec{id: id, parent: "root", startMs: int64(i + 1), durationMs: 1})
		// Given in reverse so the page order has to come from the spans, not from the input.
		linkedSpans = append([]LinkedSpan{{SpanID: id, Links: []Link{{TraceID: "producer-trace", SpanID: id + "-producer"}}}}, linkedSpans...)
	}
	batch := LinkedSpan{SpanID: "consumer-00"}
	for i := range 8 {
		batch.Links = append(batch.Links, Link{TraceID: fmt.Sprintf("producer-trace-%d", i), SpanID: "producer"})
	}
	linkedSpans[len(linkedSpans)-1] = batch
	linkedSpans = append(linkedSpans, LinkedSpan{SpanID: "not-loaded", Links: []Link{{TraceID: "t", SpanID: "s"}}})
	skeleton := buildSkeleton(specs...).WithLinkedSpans(linkedSpans)

	first := skeleton.LinkPage(0)

	assert.Equal(t, uint64(13), first.Total)
	require.Len(t, first.Items, inspectListSize)
	assert.Equal(t, "consumer-00", first.Items[0].Span.SpanID)
	require.NotNil(t, first.Items[0].Parent)
	assert.Equal(t, "root", first.Items[0].Parent.SpanID)
	assert.Equal(t, uint64(8), first.Items[0].LinkCount)
	assert.Len(t, first.Items[0].Links, inspectLinkTargets)
	assert.Equal(t, "consumer-09", first.Items[9].Span.SpanID)

	second := skeleton.LinkPage(nextOffset(t, OverviewListLinks, first.NextCursor))
	require.Len(t, second.Items, 3)
	assert.Equal(t, "consumer-12", second.Items[2].Span.SpanID)
	assert.Empty(t, second.NextCursor)

	empty := buildSkeleton(skeletonSpec{id: "root", startMs: 0, durationMs: 1}).LinkPage(0)
	assert.Equal(t, uint64(0), empty.Total)
	assert.Empty(t, empty.Items)
}

func TestSlowestPage(t *testing.T) {
	t.Run("SameNameUnderOneParent_CountsAsOneEntry", func(t *testing.T) {
		specs := []skeletonSpec{
			{id: "root", name: "POST /graphql", service: "api", startMs: 0, durationMs: 10_000},
			{id: "resolve", parent: "root", name: "resolve_plans", service: "api", startMs: 1, durationMs: 9_000},
			{id: "slow-single", parent: "root", name: "render", service: "api", startMs: 9_100, durationMs: 300},
		}
		for i := range 416 {
			specs = append(specs, skeletonSpec{id: fmt.Sprintf("cost-%03d", i), parent: "resolve", name: "calculate_annual_cost", service: "pricing", startMs: int64(2 + i*20), durationMs: int64(10 + i%3), hasError: i < 3})
		}
		skeleton := buildSkeleton(specs...)

		list := skeleton.SlowestPage(0)

		require.NotEmpty(t, list.Items)
		assert.Equal(t, uint64(4), list.Total)
		assert.Empty(t, list.NextCursor)
		group := list.Items[0]
		assert.Equal(t, "calculate_annual_cost", group.Span.Name)
		assert.Equal(t, uint64(416), group.SpanCount)
		assert.Equal(t, uint64(3), group.ErrorSpanCount)
		assert.Equal(t, uint64(12*time.Millisecond), group.Span.DurationNano)
		require.NotNil(t, group.Parent)
		assert.Equal(t, "resolve", group.Parent.SpanID)
		assert.Equal(t, "resolve", list.Items[1].Span.SpanID)
		assert.Equal(t, uint64(1), list.Items[1].SpanCount)
	})

	t.Run("SameNameUnderDifferentParents_StaysSeparate", func(t *testing.T) {
		skeleton := buildSkeleton(
			skeletonSpec{id: "root", name: "root", service: "api", startMs: 0, durationMs: 107},
			skeletonSpec{id: "left", parent: "root", name: "branch", service: "api", startMs: 0, durationMs: 40},
			skeletonSpec{id: "left-query", parent: "left", name: "SELECT", service: "db", startMs: 1, durationMs: 30},
			skeletonSpec{id: "right", parent: "root", name: "branch", service: "worker", startMs: 50, durationMs: 40},
			skeletonSpec{id: "right-query", parent: "right", name: "SELECT", service: "db", startMs: 51, durationMs: 15},
		)

		list := skeleton.SlowestPage(0)

		assert.Equal(t, uint64(5), list.Total)
		assert.Equal(t, []string{"left-query", "root", "right", "right-query", "left"}, []string{
			list.Items[0].Span.SpanID, list.Items[1].Span.SpanID, list.Items[2].Span.SpanID, list.Items[3].Span.SpanID, list.Items[4].Span.SpanID,
		})
	})

	t.Run("MoreThanOnePage_PagesOneRankingByCursor", func(t *testing.T) {
		specs := []skeletonSpec{{id: "root", name: "root", service: "api", startMs: 0, durationMs: 1}}
		for i := range 30 {
			specs = append(specs, skeletonSpec{id: fmt.Sprintf("op-%02d", i), parent: "root", name: fmt.Sprintf("op-%02d", i), service: "api", startMs: 10, durationMs: int64(100 + i)})
		}
		skeleton := buildSkeleton(specs...)

		seen := make([]string, 0, 31)
		offset := 0
		for range 5 {
			list := skeleton.SlowestPage(offset)
			assert.Equal(t, uint64(31), list.Total)
			for _, item := range list.Items {
				seen = append(seen, item.Span.SpanID)
			}
			if list.NextCursor == "" {
				break
			}
			offset = nextOffset(t, OverviewListSlowest, list.NextCursor)
		}

		require.Len(t, seen, 31)
		assert.Equal(t, "op-29", seen[0])
		assert.Equal(t, "op-20", seen[9])
		assert.Equal(t, "op-19", seen[10])
		assert.Equal(t, "op-00", seen[29])
		assert.Equal(t, "root", seen[30])
	})

	t.Run("EqualOwnTime_PagesInSpanOrder", func(t *testing.T) {
		specs := []skeletonSpec{{id: "root", name: "root", service: "api", startMs: 0, durationMs: 1}}
		for i := range 25 {
			specs = append(specs, skeletonSpec{id: fmt.Sprintf("op-%02d", i), parent: "root", name: fmt.Sprintf("op-%02d", i), service: "api", startMs: int64(10 + i), durationMs: 5})
		}
		skeleton := buildSkeleton(specs...)

		first, second, third := skeleton.SlowestPage(0), skeleton.SlowestPage(10), skeleton.SlowestPage(20)

		assert.Equal(t, "op-00", first.Items[0].Span.SpanID)
		assert.Equal(t, "op-09", first.Items[9].Span.SpanID)
		assert.Equal(t, "op-10", second.Items[0].Span.SpanID)
		assert.Equal(t, "op-19", second.Items[9].Span.SpanID)
		require.Len(t, third.Items, 6)
		assert.Equal(t, "op-24", third.Items[4].Span.SpanID)
		assert.Equal(t, "root", third.Items[5].Span.SpanID)
		assert.Empty(t, skeleton.SlowestPage(40).Items)
	})
}

func TestTree(t *testing.T) {
	t.Run("TraceWithinLimit_ListsEverySpanInTreeOrder", func(t *testing.T) {
		skeleton := buildSkeleton(
			skeletonSpec{id: "root", startMs: 0, durationMs: 100},
			skeletonSpec{id: "a", parent: "root", startMs: 1, durationMs: 40},
			skeletonSpec{id: "b", parent: "root", startMs: 50, durationMs: 40},
			skeletonSpec{id: "a-child", parent: "a", startMs: 60, durationMs: 1},
		)

		tree := skeleton.tree(4)

		assert.True(t, tree.Complete)
		assert.Equal(t, uint64(4), tree.Total)
		assert.Equal(t, []string{"root", "a", "a-child", "b"}, summaryIDs(tree.Spans))
	})

	t.Run("WideLevelOverLimit_ShowsItsFirstSpansInTimeOrder", func(t *testing.T) {
		specs := []skeletonSpec{{id: "root", startMs: 0, durationMs: 1000}}
		for i := range 200 {
			spec := skeletonSpec{id: fmt.Sprintf("s-%03d", i), parent: "root", startMs: int64(i), durationMs: 1}
			// A late error and a late long span do not change which spans are shown.
			switch i {
			case 150:
				spec.hasError = true
			case 170:
				spec.durationMs = 900
			}
			specs = append(specs, spec)
		}

		tree := buildSkeleton(specs...).Tree()

		assert.False(t, tree.Complete)
		assert.Equal(t, uint64(201), tree.Total)
		ids := summaryIDs(tree.Spans)
		require.Len(t, ids, inspectTreeSpans)
		assert.Equal(t, "root", ids[0])
		assert.Equal(t, "s-000", ids[1])
		assert.Equal(t, "s-048", ids[49])
		assert.Equal(t, uint32(200), tree.Spans[0].ChildCount)
	})

	t.Run("NarrowTopLevels_DescendsUntilLimit", func(t *testing.T) {
		specs := []skeletonSpec{
			{id: "root", startMs: 0, durationMs: 1000},
			{id: "gateway", parent: "root", startMs: 1, durationMs: 900},
			{id: "handler", parent: "gateway", startMs: 2, durationMs: 800},
		}
		for i := range 150 {
			specs = append(specs, skeletonSpec{id: fmt.Sprintf("q-%03d", i), parent: "handler", startMs: int64(3 + i), durationMs: 1})
		}

		tree := buildSkeleton(specs...).tree(10)

		assert.Equal(t, []string{"root", "gateway", "handler", "q-000", "q-001", "q-002", "q-003", "q-004", "q-005", "q-006"}, summaryIDs(tree.Spans))
		assert.Equal(t, uint32(150), tree.Spans[2].ChildCount)
	})

	t.Run("LevelCutAcrossParents_KeepsTreeOrder", func(t *testing.T) {
		skeleton := buildSkeleton(
			skeletonSpec{id: "root", startMs: 0, durationMs: 100},
			skeletonSpec{id: "a", parent: "root", startMs: 1, durationMs: 40},
			skeletonSpec{id: "b", parent: "root", startMs: 50, durationMs: 40},
			skeletonSpec{id: "a-1", parent: "a", startMs: 2, durationMs: 1},
			skeletonSpec{id: "a-2", parent: "a", startMs: 3, durationMs: 1},
			skeletonSpec{id: "b-1", parent: "b", startMs: 51, durationMs: 1},
		)

		tree := skeleton.tree(5)

		assert.False(t, tree.Complete)
		assert.Equal(t, []string{"root", "a", "a-1", "a-2", "b"}, summaryIDs(tree.Spans))
	})

	t.Run("LevelCutAcrossParents_TakesItsEarliestSpans", func(t *testing.T) {
		skeleton := buildSkeleton(
			skeletonSpec{id: "root", startMs: 0, durationMs: 1000},
			skeletonSpec{id: "first", parent: "root", startMs: 1, durationMs: 900},
			skeletonSpec{id: "second", parent: "root", startMs: 2, durationMs: 900},
			skeletonSpec{id: "second-early", parent: "second", startMs: 10, durationMs: 1},
			skeletonSpec{id: "second-next", parent: "second", startMs: 20, durationMs: 1},
			skeletonSpec{id: "first-late", parent: "first", startMs: 500, durationMs: 1},
		)

		tree := skeleton.tree(5)

		assert.Equal(t, []string{"root", "first", "second", "second-early", "second-next"}, summaryIDs(tree.Spans))
	})
}

func TestFitOverview(t *testing.T) {
	// A root with 99 children that each fail with a 404; a long service name makes every line large.
	traceWith := func(service string) *TraceSkeleton {
		specs := []skeletonSpec{{id: "root", name: "root", service: service, startMs: 0, durationMs: 1000}}
		for i := range 99 {
			specs = append(specs, skeletonSpec{id: fmt.Sprintf("span-%03d", i), parent: "root", name: fmt.Sprintf("operation %03d", i), service: service, startMs: int64(i), durationMs: 1, statusCode: "404"})
		}
		return buildSkeleton(specs...)
	}
	newOverview := func(skeleton *TraceSkeleton) *TraceOverview {
		overview := &TraceOverview{Identity: skeleton.Identity(), UnmarkedFailures: skeleton.UnmarkedFailurePage(0), Slowest: skeleton.SlowestPage(0), Tree: skeleton.Tree()}
		overview.Tree.Records = []SpanRecord{{SpanID: "root"}}
		return overview
	}

	t.Run("OverviewOverSizeLimit_DropsRecordsThenShortensTheTree", func(t *testing.T) {
		skeleton := traceWith(strings.Repeat("checkout-", 40))
		overview := newOverview(skeleton)
		require.Greater(t, jsonChars(overview), inspectMaxResponseChars)

		skeleton.FitOverview(overview)

		// The tree is cut to what fits and no further: two more spans would pass the limit.
		assert.LessOrEqual(t, jsonChars(overview), inspectMaxResponseChars)
		assert.Greater(t, jsonChars(overview), inspectMaxResponseChars-2*jsonChars(overview.Tree.Spans[1]))
		assert.Nil(t, overview.Tree.Records)
		assert.Less(t, len(overview.Tree.Spans), inspectTreeSpans)
		assert.False(t, overview.Tree.Complete)
		assert.Equal(t, uint64(100), overview.Tree.Total)
		assert.Equal(t, "root", overview.Tree.Spans[0].SpanID)
		assert.Len(t, overview.Slowest.Items, inspectListSize)
	})

	t.Run("OverviewWithinSizeLimit_IsLeftAsItIs", func(t *testing.T) {
		skeleton := traceWith("checkout")
		overview := newOverview(skeleton)
		require.LessOrEqual(t, jsonChars(overview), inspectMaxResponseChars)

		skeleton.FitOverview(overview)

		assert.Len(t, overview.Tree.Spans, inspectTreeSpans)
		assert.NotNil(t, overview.Tree.Records)
	})
}

func TestSpanDetail(t *testing.T) {
	specs := []skeletonSpec{
		{id: "root", startMs: 0, durationMs: 1000},
		{id: "l1", parent: "root", startMs: 1, durationMs: 900},
		{id: "l2", parent: "l1", startMs: 2, durationMs: 800},
		{id: "l3", parent: "l2", startMs: 3, durationMs: 700},
		{id: "target", parent: "l3", startMs: 4, durationMs: 600},
	}
	for i := range 30 {
		specs = append(specs, skeletonSpec{id: fmt.Sprintf("child-%02d", i), parent: "target", startMs: int64(5 + i), durationMs: 2})
		specs = append(specs, skeletonSpec{id: fmt.Sprintf("grandchild-%02d", i), parent: fmt.Sprintf("child-%02d", i), startMs: int64(5 + i), durationMs: 1})
	}
	specs = append(specs, skeletonSpec{id: "great-grandchild", parent: "grandchild-00", startMs: 5, durationMs: 1})
	skeleton := buildSkeleton(specs...)
	position := func(spanID string) int32 {
		idx, ok := skeleton.Index(spanID)
		require.True(t, ok, spanID)
		return idx
	}

	t.Run("DeepSpan_ReturnsNearestAncestorsThenRootAndTheLevelsBelow", func(t *testing.T) {
		detail := skeleton.SpanDetail(position("target"), 2)

		assert.Equal(t, "target", detail.Summary.SpanID)
		assert.Equal(t, []string{"l3", "l2", "root"}, summaryIDs(detail.Ancestors))
		assert.Equal(t, uint64(4), detail.AncestorCount)
		require.Len(t, detail.Descendants, 2)
		assert.Equal(t, uint32(1), detail.Descendants[0].Level)
		assert.Equal(t, uint64(30), detail.Descendants[0].Total)
		// A level shows its first 20 spans in time order.
		require.Len(t, detail.Descendants[0].Spans, inspectLevelSize)
		assert.Equal(t, "child-00", detail.Descendants[0].Spans[0].SpanID)
		assert.Equal(t, "child-19", detail.Descendants[0].Spans[19].SpanID)
		assert.Equal(t, uint64(30), detail.Descendants[1].Total)
		assert.Equal(t, "grandchild-00", detail.Descendants[1].Spans[0].SpanID)
	})

	t.Run("DepthCoversEveryAncestor_ListsThemOnce", func(t *testing.T) {
		detail := skeleton.SpanDetail(position("target"), 4)

		assert.Equal(t, []string{"l3", "l2", "l1", "root"}, summaryIDs(detail.Ancestors))
		require.Len(t, detail.Descendants, 3)
		assert.Equal(t, uint64(1), detail.Descendants[2].Total)
	})

	t.Run("RootSpan_HasNoAncestors", func(t *testing.T) {
		detail := skeleton.SpanDetail(position("root"), 1)

		assert.Empty(t, detail.Ancestors)
		assert.Equal(t, uint64(0), detail.AncestorCount)
		require.Len(t, detail.Descendants, 1)
		assert.Equal(t, []string{"l1"}, summaryIDs(detail.Descendants[0].Spans))
	})

	t.Run("LeafSpan_HasNoLevelsBelow", func(t *testing.T) {
		detail := skeleton.SpanDetail(position("great-grandchild"), 2)

		assert.Empty(t, detail.Descendants)
		assert.Equal(t, uint64(7), detail.AncestorCount)
	})

	t.Run("LevelBelowAcrossParents_IsInTimeOrder", func(t *testing.T) {
		twoBranches := buildSkeleton(
			skeletonSpec{id: "top", startMs: 0, durationMs: 1000},
			skeletonSpec{id: "first", parent: "top", startMs: 1, durationMs: 900},
			skeletonSpec{id: "second", parent: "top", startMs: 2, durationMs: 900},
			skeletonSpec{id: "second-early", parent: "second", startMs: 10, durationMs: 1},
			skeletonSpec{id: "first-late", parent: "first", startMs: 500, durationMs: 1},
		)

		detail := twoBranches.SpanDetail(0, 2)

		require.Len(t, detail.Descendants, 2)
		assert.Equal(t, []string{"second-early", "first-late"}, summaryIDs(detail.Descendants[1].Spans))
	})
}

func TestFitSpan(t *testing.T) {
	summary := SpanSummary{SpanID: "span", Name: strings.Repeat("operation ", 40)}
	level := func(n uint32) TraceSpanLevel {
		spans := make([]SpanSummary, inspectLevelSize)
		for i := range spans {
			spans[i] = summary
		}
		return TraceSpanLevel{Level: n, Total: inspectLevelSize, Spans: spans}
	}
	detail := &TraceSpanDetail{Summary: summary, Descendants: []TraceSpanLevel{level(1), level(2), level(3), level(4), level(5), level(6), level(7), level(8)}}
	require.Greater(t, jsonChars(detail), inspectMaxResponseChars)

	FitSpan(detail)

	// The deepest levels go first, and no more of them than needed.
	assert.LessOrEqual(t, jsonChars(detail), inspectMaxResponseChars)
	assert.Greater(t, jsonChars(detail)+jsonChars(level(9)), inspectMaxResponseChars)
	require.NotEmpty(t, detail.Descendants)
	assert.Equal(t, uint32(1), detail.Descendants[0].Level)
}

func TestIdentity(t *testing.T) {
	inputTokens, outputTokens, cost := 1200.0, 300.0, 0.02
	skeleton := buildSkeleton(
		skeletonSpec{id: "root", name: "POST /chat", service: "web", startMs: 0, durationMs: 100, statusCode: "200"},
		skeletonSpec{id: "agent", parent: "root", name: "invoke_agent", service: "agent", startMs: 10, durationMs: 80},
		skeletonSpec{id: "model", parent: "agent", name: "chat gpt", service: "agent", startMs: 20, durationMs: 50, hasError: true},
		skeletonSpec{id: "tool", parent: "agent", name: "execute_tool lookup", service: "agent", startMs: 75, durationMs: 10},
	).WithAISpans([]AISpanUsage{
		{SpanID: "model", IsModelCall: true, InputTokens: &inputTokens, OutputTokens: &outputTokens, Cost: &cost},
		{SpanID: "tool", IsToolCall: true},
		{SpanID: "agent"},
	})

	identity := skeleton.Identity()

	assert.Equal(t, uint64(100_000), identity.StartTimestampMillis)
	assert.Equal(t, uint64(100*time.Millisecond), identity.DurationNano)
	require.NotNil(t, identity.Root)
	assert.Equal(t, "POST /chat", identity.Root.Name)
	assert.Equal(t, uint64(4), identity.SpanCount)
	assert.Equal(t, uint64(1), identity.ErrorSpanCount)
	assert.Equal(t, uint64(2), identity.ServiceCount)
	assert.Equal(t, []TraceServiceStats{
		{ServiceName: "agent", SpanCount: 3, ErrorSpanCount: 1, OwnTimeNano: uint64(80 * time.Millisecond)},
		{ServiceName: "web", SpanCount: 1, ErrorSpanCount: 0, OwnTimeNano: uint64(20 * time.Millisecond)},
	}, identity.Services)
	require.NotNil(t, identity.AI)
	assert.Equal(t, uint64(1), identity.AI.ModelCallCount)
	assert.Equal(t, uint64(1), identity.AI.ToolCallCount)
	assert.Equal(t, uint64(1200), identity.AI.Tokens.Input)
	require.NotNil(t, identity.AI.TotalCost)
	assert.InDelta(t, 0.02, *identity.AI.TotalCost, 1e-9)

	assert.Nil(t, buildSkeleton(skeletonSpec{id: "plain", startMs: 0, durationMs: 1}).Identity().AI)
}

func TestExpensivePage(t *testing.T) {
	t.Run("WithCost_RanksByCost", func(t *testing.T) {
		cheap, costly, manyTokens := 0.01, 0.5, 9000.0
		skeleton := buildSkeleton(
			skeletonSpec{id: "root", startMs: 0, durationMs: 100},
			skeletonSpec{id: "cheap", parent: "root", startMs: 1, durationMs: 10},
			skeletonSpec{id: "costly", parent: "root", startMs: 2, durationMs: 10},
		).WithAISpans([]AISpanUsage{
			{SpanID: "cheap", IsModelCall: true, InputTokens: &manyTokens, Cost: &cheap},
			{SpanID: "costly", IsModelCall: true, Cost: &costly},
		})

		expensive := skeleton.ExpensivePage(0)

		require.NotNil(t, expensive)
		assert.Equal(t, uint64(2), expensive.Total)
		assert.Equal(t, []string{"costly", "cheap"}, []string{expensive.Items[0].Span.SpanID, expensive.Items[1].Span.SpanID})
		require.NotNil(t, expensive.Items[0].Parent)
		assert.Equal(t, "root", expensive.Items[0].Parent.SpanID)
		assert.Equal(t, uint64(9000), expensive.Items[1].InputTokens)
	})

	t.Run("WithoutCost_RanksByTokens", func(t *testing.T) {
		few, many := 10.0, 9000.0
		skeleton := buildSkeleton(
			skeletonSpec{id: "small", startMs: 0, durationMs: 10},
			skeletonSpec{id: "large", startMs: 1, durationMs: 10},
		).WithAISpans([]AISpanUsage{
			{SpanID: "small", IsModelCall: true, InputTokens: &few},
			{SpanID: "large", IsModelCall: true, InputTokens: &many},
			{SpanID: "not-loaded", IsModelCall: true, InputTokens: &many},
		})

		expensive := skeleton.ExpensivePage(0)

		assert.Equal(t, uint64(2), expensive.Total)
		assert.Equal(t, []string{"large", "small"}, []string{expensive.Items[0].Span.SpanID, expensive.Items[1].Span.SpanID})
		assert.Nil(t, expensive.Items[0].Cost)
	})

	t.Run("MoreThanOnePage_PagesEqualCostsInSpanOrder", func(t *testing.T) {
		cost := 0.25
		specs := []skeletonSpec{{id: "root", startMs: 0, durationMs: 1000}}
		usage := make([]AISpanUsage, 0, 14)
		for i := range 14 {
			id := fmt.Sprintf("call-%02d", i)
			specs = append(specs, skeletonSpec{id: id, parent: "root", startMs: int64(i + 1), durationMs: 1})
			// Given in reverse so the page order has to come from the spans, not from the input.
			usage = append([]AISpanUsage{{SpanID: id, IsModelCall: true, Cost: &cost}}, usage...)
		}
		skeleton := buildSkeleton(specs...).WithAISpans(usage)

		first := skeleton.ExpensivePage(0)
		second := skeleton.ExpensivePage(nextOffset(t, OverviewListExpensive, first.NextCursor))

		assert.Equal(t, uint64(14), first.Total)
		assert.Equal(t, "call-00", first.Items[0].Span.SpanID)
		assert.Equal(t, "call-09", first.Items[9].Span.SpanID)
		require.Len(t, second.Items, 4)
		assert.Equal(t, "call-13", second.Items[3].Span.SpanID)
		assert.Empty(t, second.NextCursor)
	})

	t.Run("NoGenAISpans_ReturnsNothing", func(t *testing.T) {
		assert.Nil(t, buildSkeleton(skeletonSpec{id: "plain", startMs: 0, durationMs: 1}).ExpensivePage(0))
	})
}
