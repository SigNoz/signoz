// Package tracedetail tests — waterfall
//
// # Background
//
// The waterfall view renders a trace as a scrollable list of spans in
// pre-order (parent before children, siblings left-to-right). Because a trace
// can have thousands of spans, only a window of ~500 is returned per request.
// The window is centred on the selected span.
//
// # Key concepts
//
// uncollapsedSpans
//
//	The set of span IDs the user has manually expanded in the UI.
//	Only the direct children of an uncollapsed span are included in the
//	output; grandchildren stay hidden until their parent is also uncollapsed.
//	When multiple spans are uncollapsed their children are all visible at once.
//
// selectedSpanID
//
//	The span currently focused — set when the user clicks a span in the
//	waterfall or selects one from the flamegraph.  The output window is always
//	centred on this span.  The path from the trace root down to the selected
//	span is automatically uncollapsed so ancestors are visible even if they are
//	not in uncollapsedSpans.
//
// isSelectedSpanIDUnCollapsed
//
//	Controls whether the selected span's own children are shown:
//	  true  — user expanded the span (click-to-open in waterfall or flamegraph);
//	          direct children of the selected span are included.
//	  false — user selected without expanding;
//	          the span is visible but its children remain hidden.
//
// traceRoots
//
//	Root spans of the trace — spans with no parent in the current dataset.
//	Normally one, but multiple roots are common when upstream services are
//	not instrumented or their spans were not sampled/exported.

package tracedetail

import (
	"fmt"
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/stretchr/testify/assert"
)

// Pre-order traversal is preserved: parent before children, siblings left-to-right.
func TestGetSelectedSpans_PreOrderTraversal(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("child1", "svc", mkSpan("grandchild", "svc")),
		mkSpan("child2", "svc"),
	)
	spanMap := buildSpanMap(root)
	spans, _, _, _ := GetSelectedSpans([]string{"root", "child1"}, "root", []*model.Span{root}, spanMap, false)

	assert.Equal(t, []string{"root", "child1", "grandchild", "child2"}, spanIDs(spans))
}

// Multiple roots: both trees are flattened into a single pre-order list with
// root1's subtree before root2's. Service/entry-point come from the first root.
//
//	root1 svc-a          ← selected
//	  └─ child1
//	root2 svc-b
//	  └─ child2
//
// Expected output order: root1 → child1 → root2 → child2
func TestGetSelectedSpans_MultipleRoots(t *testing.T) {
	root1 := mkSpan("root1", "svc-a", mkSpan("child1", "svc-a"))
	root2 := mkSpan("root2", "svc-b", mkSpan("child2", "svc-b"))
	spanMap := buildSpanMap(root1, root2)

	spans, _, svcName, entryPoint := GetSelectedSpans([]string{"root1", "root2"}, "root1", []*model.Span{root1, root2}, spanMap, false)

	assert.Equal(t, []string{"root1", "child1", "root2", "child2"}, spanIDs(spans), "root1 subtree must precede root2 subtree")
	assert.Equal(t, "svc-a", svcName, "metadata comes from first root")
	assert.Equal(t, "root1-op", entryPoint, "metadata comes from first root")
}

// isSelectedSpanIDUnCollapsed=true opens only the selected span's direct children,
// not deeper descendants.
//
//	root → selected (expanded)
//	          ├─ child1 ✓
//	          │    └─ grandchild ✗  (only one level opened)
//	          └─ child2 ✓
func TestGetSelectedSpans_ExpandedSelectedSpan(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("selected", "svc",
			mkSpan("child1", "svc", mkSpan("grandchild", "svc")),
			mkSpan("child2", "svc"),
		),
	)
	spanMap := buildSpanMap(root)
	spans, _, _, _ := GetSelectedSpans([]string{}, "selected", []*model.Span{root}, spanMap, true)

	// root and selected are on the auto-uncollapsed path; child1/child2 are direct
	// children of the expanded selected span; grandchild stays hidden.
	assert.Equal(t, []string{"root", "selected", "child1", "child2"}, spanIDs(spans))
}

// Multiple spans uncollapsed simultaneously: children of all uncollapsed spans
// are visible at once.
//
//	root
//	  ├─ childA (uncollapsed) → grandchildA ✓
//	  └─ childB (uncollapsed) → grandchildB ✓
func TestGetSelectedSpans_MultipleUncollapsed(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("childA", "svc", mkSpan("grandchildA", "svc")),
		mkSpan("childB", "svc", mkSpan("grandchildB", "svc")),
	)
	spanMap := buildSpanMap(root)
	spans, _, _, _ := GetSelectedSpans([]string{"root", "childA", "childB"}, "root", []*model.Span{root}, spanMap, false)

	assert.Equal(t, []string{"root", "childA", "grandchildA", "childB", "grandchildB"}, spanIDs(spans))
}

// Collapsing a span with other uncollapsed spans
//
// root
// ├─ childA  (previously expanded — in uncollapsedSpans)
// │    ├─ grandchild1 ✓
// │    │    └─ greatGrandchild ✗  (grandchild1 not in uncollapsedSpans)
// │    └─ grandchild2 ✓
// └─ childB                        ← selected (not expanded)
func TestGetSelectedSpans_ManualUncollapse(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("childA", "svc",
			mkSpan("grandchild1", "svc", mkSpan("greatGrandchild", "svc")),
			mkSpan("grandchild2", "svc"),
		),
		mkSpan("childB", "svc"),
	)
	spanMap := buildSpanMap(root)
	// childA was expanded in a previous interaction; childB is now selected without expanding
	spans, _, _, _ := GetSelectedSpans([]string{"childA"}, "childB", []*model.Span{root}, spanMap, false)

	// path to childB auto-uncollpases root → childA and childB appear; childA is in
	// uncollapsedSpans so its children appear; greatGrandchild stays hidden.
	assert.Equal(t, []string{"root", "childA", "grandchild1", "grandchild2", "childB"}, spanIDs(spans))
}

// A collapsed span hides all children.
func TestGetSelectedSpans_CollapsedSpan(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("child1", "svc"),
		mkSpan("child2", "svc"),
	)
	spanMap := buildSpanMap(root)
	spans, _, _, _ := GetSelectedSpans([]string{}, "root", []*model.Span{root}, spanMap, false)

	assert.Equal(t, []string{"root"}, spanIDs(spans))
}

// Selecting a span auto-uncollpases the path from root to that span so it is visible.
//
//	root → parent → selected
func TestGetSelectedSpans_PathToSelectedIsUncollapsed(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("parent", "svc",
			mkSpan("selected", "svc"),
		),
	)
	spanMap := buildSpanMap(root)
	// no manually uncollapsed spans — path should still be opened
	spans, _, _, _ := GetSelectedSpans([]string{}, "selected", []*model.Span{root}, spanMap, false)

	assert.Equal(t, []string{"root", "parent", "selected"}, spanIDs(spans))
}

// The path-to-selected spans are returned in updatedUncollapsedSpans.
func TestGetSelectedSpans_PathReturnedInUncollapsed(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("parent", "svc",
			mkSpan("selected", "svc"),
		),
	)
	spanMap := buildSpanMap(root)
	spans, uncollapsed, _, _ := GetSelectedSpans([]string{}, "selected", []*model.Span{root}, spanMap, false)

	assert.Equal(t, []string{"root", "parent"}, uncollapsed)
	assert.Equal(t, []string{"root", "parent", "selected"}, spanIDs(spans))
}

// Siblings of ancestors are rendered as collapsed nodes but their subtrees
// must NOT be expanded.
//
//	root
//	  ├─ unrelated → unrelated-child (✗)
//	  └─ parent → selected
func TestGetSelectedSpans_SiblingsNotExpanded(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("unrelated", "svc", mkSpan("unrelated-child", "svc")),
		mkSpan("parent", "svc",
			mkSpan("selected", "svc"),
		),
	)
	spanMap := buildSpanMap(root)
	spans, uncollapsed, _, _ := GetSelectedSpans([]string{}, "selected", []*model.Span{root}, spanMap, false)

	// children of root sort alphabetically: parent < unrelated; unrelated-child stays hidden
	assert.Equal(t, []string{"root", "parent", "selected", "unrelated"}, spanIDs(spans))
	// only the path nodes are tracked as uncollapsed — unrelated is not
	assert.Equal(t, []string{"root", "parent"}, uncollapsed)
}

// An unknown selectedSpanID must not panic; returns a window from index 0.
func TestGetSelectedSpans_UnknownSelectedSpan(t *testing.T) {
	root := mkSpan("root", "svc", mkSpan("child", "svc"))
	spanMap := buildSpanMap(root)
	spans, _, _, _ := GetSelectedSpans([]string{}, "nonexistent", []*model.Span{root}, spanMap, false)
	assert.Equal(t, []string{"root"}, spanIDs(spans))
}

// Test to check if Level, HasChildren, HasSiblings, and SubTreeNodeCount are populated correctly.
//
//	root          level=0, hasChildren=true,  hasSiblings=false, subTree=4
//	  child1      level=1, hasChildren=true,  hasSiblings=true,  subTree=2
//	    grandchild level=2, hasChildren=false, hasSiblings=false, subTree=1
//	  child2      level=1, hasChildren=false, hasSiblings=false, subTree=1
func TestGetSelectedSpans_SpanMetadata(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("child1", "svc", mkSpan("grandchild", "svc")),
		mkSpan("child2", "svc"),
	)
	spanMap := buildSpanMap(root)
	spans, _, _, _ := GetSelectedSpans([]string{"root", "child1"}, "root", []*model.Span{root}, spanMap, false)

	byID := map[string]*model.Span{}
	for _, s := range spans {
		byID[s.SpanID] = s
	}

	assert.Equal(t, uint64(0), byID["root"].Level)
	assert.Equal(t, uint64(1), byID["child1"].Level)
	assert.Equal(t, uint64(1), byID["child2"].Level)
	assert.Equal(t, uint64(2), byID["grandchild"].Level)

	assert.True(t, byID["root"].HasChildren)
	assert.True(t, byID["child1"].HasChildren)
	assert.False(t, byID["child2"].HasChildren)
	assert.False(t, byID["grandchild"].HasChildren)

	assert.False(t, byID["root"].HasSiblings, "root has no siblings")
	assert.True(t, byID["child1"].HasSiblings, "child1 has sibling child2")
	assert.False(t, byID["child2"].HasSiblings, "child2 is the last child")
	assert.False(t, byID["grandchild"].HasSiblings, "grandchild has no siblings")

	assert.Equal(t, uint64(4), byID["root"].SubTreeNodeCount)
	assert.Equal(t, uint64(2), byID["child1"].SubTreeNodeCount)
	assert.Equal(t, uint64(1), byID["grandchild"].SubTreeNodeCount)
	assert.Equal(t, uint64(1), byID["child2"].SubTreeNodeCount)
}

// If the selected span is already in uncollapsedSpans AND isSelectedSpanIDUnCollapsed=true,
func TestGetSelectedSpans_DuplicateInUncollapsed(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("selected", "svc", mkSpan("child", "svc")),
	)
	spanMap := buildSpanMap(root)
	_, uncollapsed, _, _ := GetSelectedSpans(
		[]string{"selected"}, // already present
		"selected",
		[]*model.Span{root}, spanMap,
		true,
	)

	count := 0
	for _, id := range uncollapsed {
		if id == "selected" {
			count++
		}
	}
	assert.Equal(t, 1, count, "should appear once")
}

// makeChain builds a linear trace: span0 → span1 → … → span(n-1).
// All span IDs are "span0", "span1", … so the caller can reference them by index.
func makeChain(n int) (*model.Span, map[string]*model.Span, []string) {
	spans := make([]*model.Span, n)
	for i := n - 1; i >= 0; i-- {
		if i == n-1 {
			spans[i] = mkSpan(fmt.Sprintf("span%d", i), "svc")
		} else {
			spans[i] = mkSpan(fmt.Sprintf("span%d", i), "svc", spans[i+1])
		}
	}
	uncollapsed := make([]string, n)
	for i := range spans {
		uncollapsed[i] = fmt.Sprintf("span%d", i)
	}
	return spans[0], buildSpanMap(spans[0]), uncollapsed
}

// The selected span is centred: 200 spans before it, 300 after (0.4 / 0.6 split).
func TestGetSelectedSpans_WindowCentredOnSelected(t *testing.T) {
	root, spanMap, uncollapsed := makeChain(600)
	spans, _, _, _ := GetSelectedSpans(uncollapsed, "span300", []*model.Span{root}, spanMap, false)

	assert.Equal(t, 500, len(spans), "window should be 500 spans")
	// window is [100, 600): span300 lands at position 200 (300 - 100)
	assert.Equal(t, "span100", spans[0].SpanID, "window starts 200 before selected")
	assert.Equal(t, "span300", spans[200].SpanID, "selected span at position 200 in window")
	assert.Equal(t, "span599", spans[499].SpanID, "window ends 300 after selected")
}

// When the selected span is near the start, the window shifts right so no
// negative index is used — the result is still 500 spans.
func TestGetSelectedSpans_WindowShiftsAtStart(t *testing.T) {
	root, spanMap, uncollapsed := makeChain(600)
	spans, _, _, _ := GetSelectedSpans(uncollapsed, "span10", []*model.Span{root}, spanMap, false)

	assert.Equal(t, 500, len(spans))
	assert.Equal(t, "span0", spans[0].SpanID, "window clamped to start of trace")
	assert.Equal(t, "span10", spans[10].SpanID, "selected span still in window")
}

func mkSpan(id, service string, children ...*model.Span) *model.Span {
	return &model.Span{
		SpanID:      id,
		ServiceName: service,
		Name:        id + "-op",
		Children:    children,
	}
}

// spanIDs returns SpanIDs in order.
func spanIDs(spans []*model.Span) []string {
	ids := make([]string, len(spans))
	for i, s := range spans {
		ids[i] = s.SpanID
	}
	return ids
}

// buildSpanMap indexes every span in a set of trees by SpanID.
func buildSpanMap(roots ...*model.Span) map[string]*model.Span {
	m := map[string]*model.Span{}
	var walk func(*model.Span)
	walk = func(s *model.Span) {
		m[s.SpanID] = s
		for _, c := range s.Children {
			walk(c)
		}
	}
	for _, r := range roots {
		walk(r)
	}
	return m
}
