// Package impltracedetail tests — waterfall
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
//
// traceRoots
//
//	Root spans of the trace — spans with no parent in the current dataset.
//	Normally one, but multiple roots are common when upstream services are
//	not instrumented or their spans were not sampled/exported.

package impltracedetail

import (
	"fmt"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/tracedetailtypes"
	"github.com/stretchr/testify/assert"
)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

func mkSpan(id, service string, children ...*tracedetailtypes.WaterfallSpan) *tracedetailtypes.WaterfallSpan {
	return &tracedetailtypes.WaterfallSpan{
		SpanID:      id,
		ServiceName: service,
		Name:        id + "-op",
		Children:    children,
	}
}

func spanIDs(spans []*tracedetailtypes.WaterfallSpan) []string {
	ids := make([]string, len(spans))
	for i, s := range spans {
		ids[i] = s.SpanID
	}
	return ids
}

func buildSpanMap(roots ...*tracedetailtypes.WaterfallSpan) map[string]*tracedetailtypes.WaterfallSpan {
	m := map[string]*tracedetailtypes.WaterfallSpan{}
	var walk func(*tracedetailtypes.WaterfallSpan)
	walk = func(s *tracedetailtypes.WaterfallSpan) {
		m[s.SpanID] = s
		for _, c := range s.Children {
			walk(c)
		}
	}
	for _, r := range roots {
		r.SortChildren()
		r.GetSubtreeNodeCount()
		walk(r)
	}
	return m
}

// makeChain builds a linear trace: span0 → span1 → … → span(n-1).
func makeChain(n int) (*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan, []string) {
	spans := make([]*tracedetailtypes.WaterfallSpan, n)
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

func getWaterfallTrace(roots []*tracedetailtypes.WaterfallSpan, spanMap map[string]*tracedetailtypes.WaterfallSpan) *tracedetailtypes.WaterfallTrace {
	return tracedetailtypes.NewWaterfallTrace(0, 0, uint64(len(spanMap)), 0, spanMap, nil, roots, false)
}

// ─────────────────────────────────────────────────────────────────────────────
// GetSelectedSpans — span ordering and visibility
// ─────────────────────────────────────────────────────────────────────────────

func TestGetSelectedSpans_SpanOrdering(t *testing.T) {
	tests := []struct {
		name             string
		buildRoots       func() ([]*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan)
		uncollapsedSpans []string
		selectedSpanID   string
		wantSpanIDs      []string
	}{
		{
			// Pre-order traversal is preserved: parent before children, siblings left-to-right.
			name: "pre_order_traversal",
			buildRoots: func() ([]*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("child1", "svc", mkSpan("grandchild", "svc")),
					mkSpan("child2", "svc"),
				)
				return []*tracedetailtypes.WaterfallSpan{root}, buildSpanMap(root)
			},
			uncollapsedSpans: []string{"root", "child1"},
			selectedSpanID:   "root",
			wantSpanIDs:      []string{"root", "child1", "grandchild", "child2"},
		},
		{
			// Multiple spans uncollapsed simultaneously: children of all uncollapsed spans are visible at once.
			//
			//	root
			//	  ├─ childA (uncollapsed) → grandchildA ✓
			//	  └─ childB (uncollapsed) → grandchildB ✓
			name: "multiple_uncollapsed",
			buildRoots: func() ([]*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("childA", "svc", mkSpan("grandchildA", "svc")),
					mkSpan("childB", "svc", mkSpan("grandchildB", "svc")),
				)
				return []*tracedetailtypes.WaterfallSpan{root}, buildSpanMap(root)
			},
			uncollapsedSpans: []string{"root", "childA", "childB"},
			selectedSpanID:   "root",
			wantSpanIDs:      []string{"root", "childA", "grandchildA", "childB", "grandchildB"},
		},
		{
			// Collapsing a span with other uncollapsed spans.
			//
			// root
			// ├─ childA  (previously expanded — in uncollapsedSpans)
			// │    ├─ grandchild1 ✓
			// │    │    └─ greatGrandchild ✗  (grandchild1 not in uncollapsedSpans)
			// │    └─ grandchild2 ✓
			// └─ childB                        ← selected (not expanded)
			name: "manual_uncollapse",
			buildRoots: func() ([]*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("childA", "svc",
						mkSpan("grandchild1", "svc", mkSpan("greatGrandchild", "svc")),
						mkSpan("grandchild2", "svc"),
					),
					mkSpan("childB", "svc"),
				)
				return []*tracedetailtypes.WaterfallSpan{root}, buildSpanMap(root)
			},
			uncollapsedSpans: []string{"childA"},
			selectedSpanID:   "childB",
			wantSpanIDs:      []string{"root", "childA", "grandchild1", "grandchild2", "childB"},
		},
		{
			// A collapsed span hides all children.
			name: "collapsed_span_hides_children",
			buildRoots: func() ([]*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("child1", "svc"),
					mkSpan("child2", "svc"),
				)
				return []*tracedetailtypes.WaterfallSpan{root}, buildSpanMap(root)
			},
			uncollapsedSpans: []string{},
			selectedSpanID:   "root",
			wantSpanIDs:      []string{"root"},
		},
		{
			// Selecting a span auto-uncollpases the path from root to that span so it is visible.
			//
			//	root → parent → selected
			name: "path_to_selected_is_uncollapsed",
			buildRoots: func() ([]*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("parent", "svc",
						mkSpan("selected", "svc"),
					),
				)
				return []*tracedetailtypes.WaterfallSpan{root}, buildSpanMap(root)
			},
			uncollapsedSpans: []string{},
			selectedSpanID:   "selected",
			wantSpanIDs:      []string{"root", "parent", "selected"},
		},
		{
			// Siblings of ancestors are rendered as collapsed nodes but their subtrees must NOT be expanded.
			//
			//	root
			//	  ├─ unrelated → unrelated-child (✗)
			//	  └─ parent → selected
			name: "siblings_not_expanded",
			buildRoots: func() ([]*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("unrelated", "svc", mkSpan("unrelated-child", "svc")),
					mkSpan("parent", "svc",
						mkSpan("selected", "svc"),
					),
				)
				return []*tracedetailtypes.WaterfallSpan{root}, buildSpanMap(root)
			},
			uncollapsedSpans: []string{},
			selectedSpanID:   "selected",
			// children of root sort alphabetically: parent < unrelated; unrelated-child stays hidden
			wantSpanIDs: []string{"root", "parent", "selected", "unrelated"},
		},
		{
			// An unknown selectedSpanID must not panic; returns a window from index 0.
			name: "unknown_selected_span",
			buildRoots: func() ([]*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc", mkSpan("child", "svc"))
				return []*tracedetailtypes.WaterfallSpan{root}, buildSpanMap(root)
			},
			uncollapsedSpans: []string{},
			selectedSpanID:   "nonexistent",
			wantSpanIDs:      []string{"root"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			roots, spanMap := tc.buildRoots()
			trace := getWaterfallTrace(roots, spanMap)
			spans, _ := trace.GetSelectedSpans(tc.uncollapsedSpans, tc.selectedSpanID, 500, 5)
			assert.Equal(t, tc.wantSpanIDs, spanIDs(spans))
		})
	}
}

// Multiple roots: both trees are flattened into a single pre-order list with
// root1's subtree before root2's. Service/entry-point come from the first root.
//
//	root1 svc-a          ← selected
//	  └─ child1
//	root2 svc-b
//	  └─ child2
//
// Expected output order: root1 → child1 → root2 → child2.
func TestGetSelectedSpans_MultipleRoots(t *testing.T) {
	root1 := mkSpan("root1", "svc-a", mkSpan("child1", "svc-a"))
	root2 := mkSpan("root2", "svc-b", mkSpan("child2", "svc-b"))
	spanMap := buildSpanMap(root1, root2)

	trace := getWaterfallTrace([]*tracedetailtypes.WaterfallSpan{root1, root2}, spanMap)
	spans, _ := trace.GetSelectedSpans([]string{"root1", "root2"}, "root1", 500, 5)

	traceRespnose := tracedetailtypes.NewGettableWaterfallTrace(trace, spans, nil, false)

	assert.Equal(t, []string{"root1", "child1", "root2", "child2"}, spanIDs(spans), "root1 subtree must precede root2 subtree")
	assert.Equal(t, "svc-a", traceRespnose.RootServiceName, "metadata comes from first root")
	assert.Equal(t, "root1-op", traceRespnose.RootServiceEntryPoint, "metadata comes from first root")
}

// ─────────────────────────────────────────────────────────────────────────────
// GetSelectedSpans — uncollapsed span tracking
// ─────────────────────────────────────────────────────────────────────────────

func TestGetSelectedSpans_UncollapsedTracking(t *testing.T) {
	tests := []struct {
		name             string
		buildRoot        func() (*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan)
		uncollapsedSpans []string
		selectedSpanID   string
		wantSpanIDs      []string
		checkUncollapsed func(t *testing.T, uncollapsed []string)
	}{
		{
			// The path-to-selected spans are returned in updatedUncollapsedSpans.
			name: "path_returned_in_uncollapsed",
			buildRoot: func() (*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("parent", "svc",
						mkSpan("selected", "svc"),
					),
				)
				return root, buildSpanMap(root)
			},
			uncollapsedSpans: []string{},
			selectedSpanID:   "selected",
			wantSpanIDs:      []string{"root", "parent", "selected"},
			checkUncollapsed: func(t *testing.T, uncollapsed []string) {
				assert.ElementsMatch(t, []string{"root", "parent"}, uncollapsed)
			},
		},
		{
			// Siblings of ancestors are not tracked as uncollapsed.
			name: "siblings_not_in_uncollapsed",
			buildRoot: func() (*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("unrelated", "svc", mkSpan("unrelated-child", "svc")),
					mkSpan("parent", "svc",
						mkSpan("selected", "svc"),
					),
				)
				return root, buildSpanMap(root)
			},
			uncollapsedSpans: []string{},
			selectedSpanID:   "selected",
			wantSpanIDs:      []string{"root", "parent", "selected", "unrelated"},
			checkUncollapsed: func(t *testing.T, uncollapsed []string) {
				assert.ElementsMatch(t, []string{"root", "parent"}, uncollapsed)
			},
		},
		{
			// Auto-expanded span IDs from ALL branches are returned in updatedUncollapsedSpans.
			// Only internal nodes (spans with children) are tracked — leaf spans are never added.
			// root is in uncollapsedSpans, so its children are auto-expanded.
			//
			//	root (selected, expanded)
			//	  ├─ childA (internal ✓)
			//	  │    └─ grandchildA (internal ✓)
			//	  │         └─ leafA (leaf ✗)
			//	  └─ childB (internal ✓)
			//	       └─ grandchildB (internal ✓)
			//	            └─ leafB (leaf ✗)
			name: "auto_expanded_spans_returned",
			buildRoot: func() (*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("childA", "svc",
						mkSpan("grandchildA", "svc",
							mkSpan("leafA", "svc"),
						),
					),
					mkSpan("childB", "svc",
						mkSpan("grandchildB", "svc",
							mkSpan("leafB", "svc"),
						),
					),
				)
				return root, buildSpanMap(root)
			},
			uncollapsedSpans: []string{"root"},
			selectedSpanID:   "root",
			checkUncollapsed: func(t *testing.T, uncollapsed []string) {
				assert.Contains(t, uncollapsed, "root")
				assert.Contains(t, uncollapsed, "childA", "internal node depth 1, branch A")
				assert.Contains(t, uncollapsed, "childB", "internal node depth 1, branch B")
				assert.Contains(t, uncollapsed, "grandchildA", "internal node depth 2, branch A")
				assert.Contains(t, uncollapsed, "grandchildB", "internal node depth 2, branch B")
				assert.NotContains(t, uncollapsed, "leafA", "leaf spans are never added to uncollapsedSpans")
				assert.NotContains(t, uncollapsed, "leafB", "leaf spans are never added to uncollapsedSpans")
			},
		},
		{
			// If the selected span is already in uncollapsedSpans,
			// it should appear exactly once in the result.
			name: "duplicate_in_uncollapsed",
			buildRoot: func() (*tracedetailtypes.WaterfallSpan, map[string]*tracedetailtypes.WaterfallSpan) {
				root := mkSpan("root", "svc",
					mkSpan("selected", "svc", mkSpan("child", "svc")),
				)
				return root, buildSpanMap(root)
			},
			uncollapsedSpans: []string{"selected"}, // already present
			selectedSpanID:   "selected",
			checkUncollapsed: func(t *testing.T, uncollapsed []string) {
				count := 0
				for _, id := range uncollapsed {
					if id == "selected" {
						count++
					}
				}
				assert.Equal(t, 1, count, "should appear once")
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			root, spanMap := tc.buildRoot()
			trace := getWaterfallTrace([]*tracedetailtypes.WaterfallSpan{root}, spanMap)
			spans, uncollapsed := trace.GetSelectedSpans(tc.uncollapsedSpans, tc.selectedSpanID, 500, 5)
			if tc.wantSpanIDs != nil {
				assert.Equal(t, tc.wantSpanIDs, spanIDs(spans))
			}
			if tc.checkUncollapsed != nil {
				tc.checkUncollapsed(t, uncollapsed)
			}
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetSelectedSpans — span metadata
// ─────────────────────────────────────────────────────────────────────────────

// Test to check if Level, HasChildren, and SubTreeNodeCount are populated correctly.
//
//	root          level=0, hasChildren=true,  subTree=4
//	  child1      level=1, hasChildren=true,  subTree=2
//	    grandchild level=2, hasChildren=false, subTree=1
//	  child2      level=1, hasChildren=false, subTree=1
func TestGetSelectedSpans_SpanMetadata(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("child1", "svc", mkSpan("grandchild", "svc")),
		mkSpan("child2", "svc"),
	)
	spanMap := buildSpanMap(root)
	trace := getWaterfallTrace([]*tracedetailtypes.WaterfallSpan{root}, spanMap)
	spans, _ := trace.GetSelectedSpans([]string{"root", "child1"}, "root", 500, 5)

	byID := map[string]*tracedetailtypes.WaterfallSpan{}
	for _, s := range spans {
		byID[s.SpanID] = s
	}

	tests := []struct {
		spanID          string
		wantLevel       uint64
		wantHasChildren bool
		wantSubTree     uint64
	}{
		{"root", 0, true, 4},
		{"child1", 1, true, 2},
		{"child2", 1, false, 1},
		{"grandchild", 2, false, 1},
	}

	for _, tc := range tests {
		t.Run(tc.spanID, func(t *testing.T) {
			s := byID[tc.spanID]
			assert.Equal(t, tc.wantLevel, s.Level)
			assert.Equal(t, tc.wantHasChildren, s.HasChildren)
			assert.Equal(t, tc.wantSubTree, s.SubTreeNodeCount)
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetSelectedSpans — windowing
// ─────────────────────────────────────────────────────────────────────────────

func TestGetSelectedSpans_Window(t *testing.T) {
	tests := []struct {
		name            string
		selectedSpanID  string
		wantLen         int
		wantFirst       string
		wantLast        string
		wantSelectedPos int
	}{
		{
			// The selected span is centred: 200 spans before it, 300 after (0.4 / 0.6 split).
			name:            "centred_on_selected",
			selectedSpanID:  "span300",
			wantLen:         500,
			wantFirst:       "span100",
			wantLast:        "span599",
			wantSelectedPos: 200,
		},
		{
			// When the selected span is near the start, the window shifts right so no
			// negative index is used — the result is still 500 spans.
			name:            "shifts_at_start",
			selectedSpanID:  "span10",
			wantLen:         500,
			wantFirst:       "span0",
			wantSelectedPos: 10,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			root, spanMap, uncollapsed := makeChain(600)
			trace := getWaterfallTrace([]*tracedetailtypes.WaterfallSpan{root}, spanMap)
			spans, _ := trace.GetSelectedSpans(uncollapsed, tc.selectedSpanID, 500, 5)

			assert.Equal(t, tc.wantLen, len(spans), "window size")
			assert.Equal(t, tc.wantFirst, spans[0].SpanID, "first span in window")
			if tc.wantLast != "" {
				assert.Equal(t, tc.wantLast, spans[len(spans)-1].SpanID, "last span in window")
			}
			assert.Equal(t, tc.selectedSpanID, spans[tc.wantSelectedPos].SpanID, "selected span position")
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetSelectedSpans — depth limit
// ─────────────────────────────────────────────────────────────────────────────

// Depth is measured from the selected span, not the trace root.
// Ancestors appear via the path-to-root logic, not the depth limit.
// Each depth level has two children to confirm the limit is enforced on all
// branches, not just the first.
//
//	root
//	  └─ A                           ancestor ✓ (path-to-root)
//	       └─ selected
//	            ├─ d1a               depth 1 ✓
//	            │    ├─ d2a          depth 2 ✓
//	            │    │    ├─ d3a     depth 3 ✓
//	            │    │    │    ├─ d4a   depth 4 ✓
//	            │    │    │    │    ├─ d5a  depth 5 ✓
//	            │    │    │    │    │    └─ d6a  depth 6 ✗
//	            │    │    │    │    └─ d5b  depth 5 ✓
//	            │    │    │    └─ d4b   depth 4 ✓
//	            │    │    └─ d3b     depth 3 ✓
//	            │    └─ d2b          depth 2 ✓
//	            └─ d1b               depth 1 ✓
func TestGetSelectedSpans_DepthCountedFromSelectedSpan(t *testing.T) {
	selected := mkSpan("selected", "svc",
		mkSpan("d1a", "svc",
			mkSpan("d2a", "svc",
				mkSpan("d3a", "svc",
					mkSpan("d4a", "svc",
						mkSpan("d5a", "svc",
							mkSpan("d6a", "svc"), // depth 6 — excluded
						),
						mkSpan("d5b", "svc"), // depth 5 — included
					),
					mkSpan("d4b", "svc"), // depth 4 — included
				),
				mkSpan("d3b", "svc"), // depth 3 — included
			),
			mkSpan("d2b", "svc"), // depth 2 — included
		),
		mkSpan("d1b", "svc"), // depth 1 — included
	)
	root := mkSpan("root", "svc", mkSpan("A", "svc", selected))

	spanMap := buildSpanMap(root)
	trace := getWaterfallTrace([]*tracedetailtypes.WaterfallSpan{root}, spanMap)
	spans, _ := trace.GetSelectedSpans([]string{"selected"}, "selected", 500, 5)
	ids := spanIDs(spans)

	assert.Contains(t, ids, "root", "ancestor shown via path-to-root")
	assert.Contains(t, ids, "A", "ancestor shown via path-to-root")
	for _, id := range []string{"d1a", "d1b", "d2a", "d2b", "d3a", "d3b", "d4a", "d4b", "d5a", "d5b"} {
		assert.Contains(t, ids, id, "depth ≤ 5 — must be included")
	}
	assert.NotContains(t, ids, "d6a", "depth 6 > limit — excluded")
}

// ─────────────────────────────────────────────────────────────────────────────
// GetAllSpans
// ─────────────────────────────────────────────────────────────────────────────

func TestGetAllSpans(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("childA", "svc",
			mkSpan("grandchildA", "svc",
				mkSpan("leafA", "svc2"),
			),
		),
		mkSpan("childB", "svc3",
			mkSpan("grandchildB", "svc",
				mkSpan("leafB", "svc2"),
			),
		),
	)
	trace := getWaterfallTrace([]*tracedetailtypes.WaterfallSpan{root}, nil)
	spans := trace.GetAllSpans()
	traceResponse := tracedetailtypes.NewGettableWaterfallTrace(trace, spans, nil, true)
	assert.ElementsMatch(t, spanIDs(spans), []string{"root", "childA", "grandchildA", "leafA", "childB", "grandchildB", "leafB"})
	assert.Equal(t, "svc", traceResponse.RootServiceName)
	assert.Equal(t, "root-op", traceResponse.RootServiceEntryPoint)
}
