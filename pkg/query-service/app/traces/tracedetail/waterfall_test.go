package tracedetail

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/stretchr/testify/assert"
)

func TestGetAllSpans_SingleRoot(t *testing.T) {
	root := mkSpan("root", "svc-a")
	spans, svcName, entryPoint := GetAllSpans([]*model.Span{root})

	assert.Equal(t, []string{"root"}, spanIDs(spans))
	assert.Equal(t, "svc-a", svcName)
	assert.Equal(t, "root-op", entryPoint)
}

// Pre-order traversal order is preserved down a chain.
func TestGetAllSpans_LinearChain(t *testing.T) {
	root := mkSpan("root", "svc-a",
		mkSpan("child", "svc-b",
			mkSpan("grandchild", "svc-c"),
		),
	)
	spans, _, _ := GetAllSpans([]*model.Span{root})
	assert.Equal(t, []string{"root", "child", "grandchild"}, spanIDs(spans))
}

// Two roots (broken trace): both trees are flattened; service/entry-point come
// from the first root only.
func TestGetAllSpans_MultipleRoots(t *testing.T) {
	root1 := mkSpan("root1", "svc-a", mkSpan("child1", "svc-a"))
	root2 := mkSpan("root2", "svc-b", mkSpan("child2", "svc-b"))

	spans, svcName, entryPoint := GetAllSpans([]*model.Span{root1, root2})

	assert.Equal(t, []string{"root1", "child1", "root2", "child2"}, spanIDs(spans))
	assert.Equal(t, "svc-a", svcName)
	assert.Equal(t, "root1-op", entryPoint)
}

// Level, HasChildren, HasSiblings are populated correctly.
func TestGetAllSpans_LevelMetadata(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("child1", "svc", mkSpan("grandchild", "svc")),
		mkSpan("child2", "svc"),
	)
	spans, _, _ := GetAllSpans([]*model.Span{root})

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
}

// ─────────────────────────────────────────────────────────────────────────────
// auto-expand depth (maxDepthForSelectedSpanChildren = 5)
// ─────────────────────────────────────────────────────────────────────────────

// Uncollapsing the selected span auto-expands its children up to depth 5
// across all branches. Each level has two children: one that goes deeper and
// one leaf sibling — both must be included up to depth 5; depth 6 is excluded.
//
//	root (selected)
//	  ├─ l1a                        depth 1 ✓
//	  │    ├─ l2a                   depth 2 ✓
//	  │    │    ├─ l3a              depth 3 ✓
//	  │    │    │    ├─ l4a         depth 4 ✓
//	  │    │    │    │    ├─ l5a    depth 5 ✓
//	  │    │    │    │    │    └─ l6a  depth 6 ✗
//	  │    │    │    │    └─ l5b    depth 5 ✓
//	  │    │    │    └─ l4b         depth 4 ✓
//	  │    │    └─ l3b              depth 3 ✓
//	  │    └─ l2b                   depth 2 ✓
//	  └─ l1b                        depth 1 ✓
func TestGetSelectedSpans_AutoExpandDepth(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("l1a", "svc",
			mkSpan("l2a", "svc",
				mkSpan("l3a", "svc",
					mkSpan("l4a", "svc",
						mkSpan("l5a", "svc",
							mkSpan("l6a", "svc"), // depth 6 — excluded
						),
						mkSpan("l5b", "svc"), // depth 5 — included
					),
					mkSpan("l4b", "svc"), // depth 4 — included
				),
				mkSpan("l3b", "svc"), // depth 3 — included
			),
			mkSpan("l2b", "svc"), // depth 2 — included
		),
		mkSpan("l1b", "svc"), // depth 1 — included
	)

	spanMap := buildSpanMap(root)
	spans, uncollapsed, _, _ := GetSelectedSpans([]string{}, "root", []*model.Span{root}, spanMap, true)

	ids := spanIDs(spans)
	// all nodes at depth 1–5 across both branches must be present
	for _, id := range []string{"l1a", "l1b", "l2a", "l2b", "l3a", "l3b", "l4a", "l4b", "l5a", "l5b"} {
		assert.Contains(t, ids, id)
	}
	assert.NotContains(t, ids, "l6a", "depth 6 is beyond maxDepthForSelectedSpanChildren")
	assert.Contains(t, uncollapsed, "root")
}

// Collapsing the selected span suppresses auto-expand — children stay hidden.
func TestGetSelectedSpans_CollapsedSelectedSpan(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("child", "svc",
			mkSpan("grandchild", "svc"),
		),
	)
	spanMap := buildSpanMap(root)
	spans, _, _, _ := GetSelectedSpans([]string{}, "root", []*model.Span{root}, spanMap, false)

	ids := spanIDs(spans)
	assert.Contains(t, ids, "root")
	assert.NotContains(t, ids, "child")
}

// Manually uncollapsing a span shows ALL its direct children, not just the
// first one. Grandchildren stay hidden because their parents are not in
// uncollapsedSpans.
//
//	root (manually uncollapsed)
//	  ├─ child1 → grandchild1 (✗)
//	  └─ child2 → grandchild2 (✗)
func TestGetSelectedSpans_ManualUncollapse(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("child1", "svc", mkSpan("grandchild1", "svc")),
		mkSpan("child2", "svc", mkSpan("grandchild2", "svc")),
	)
	spanMap := buildSpanMap(root)
	spans, _, _, _ := GetSelectedSpans([]string{"root"}, "root", []*model.Span{root}, spanMap, false)

	ids := spanIDs(spans)
	assert.Contains(t, ids, "child1", "all direct children must appear when parent is uncollapsed")
	assert.Contains(t, ids, "child2", "all direct children must appear when parent is uncollapsed")
	assert.NotContains(t, ids, "grandchild1", "grandchild's parent not in uncollapsedSpans")
	assert.NotContains(t, ids, "grandchild2", "grandchild's parent not in uncollapsedSpans")
}

// Auto-expanded span IDs from ALL branches are returned in
// updatedUncollapsedSpans. Only internal nodes (spans with children) are
// tracked — leaf spans are never added.
//
//	root (selected)
//	  ├─ childA (internal ✓)
//	  │    └─ grandchildA (internal ✓)
//	  │         └─ leafA (leaf ✗)
//	  └─ childB (internal ✓)
//	       └─ grandchildB (internal ✓)
//	            └─ leafB (leaf ✗)
func TestGetSelectedSpans_AutoExpandedSpansReturnedInUncollapsed(t *testing.T) {
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
	spanMap := buildSpanMap(root)
	_, uncollapsed, _, _ := GetSelectedSpans([]string{}, "root", []*model.Span{root}, spanMap, true)

	// all internal nodes across both branches must be tracked
	assert.Contains(t, uncollapsed, "root")
	assert.Contains(t, uncollapsed, "childA", "internal node depth 1, branch A")
	assert.Contains(t, uncollapsed, "childB", "internal node depth 1, branch B")
	assert.Contains(t, uncollapsed, "grandchildA", "internal node depth 2, branch A")
	assert.Contains(t, uncollapsed, "grandchildB", "internal node depth 2, branch B")
	// leaves have no children to show — never added to uncollapsedSpans
	assert.NotContains(t, uncollapsed, "leafA", "leaf spans are never added to uncollapsedSpans")
	assert.NotContains(t, uncollapsed, "leafB", "leaf spans are never added to uncollapsedSpans")
}

// ─────────────────────────────────────────────────────────────────────────────
// maxDepthForSelectedSpanChildren boundary tests
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
	spans, _, _, _ := GetSelectedSpans([]string{}, "selected", []*model.Span{root}, spanMap, true)
	ids := spanIDs(spans)

	assert.Contains(t, ids, "root", "ancestor shown via path-to-root")
	assert.Contains(t, ids, "A", "ancestor shown via path-to-root")
	for _, id := range []string{"d1a", "d1b", "d2a", "d2b", "d3a", "d3b", "d4a", "d4b", "d5a", "d5b"} {
		assert.Contains(t, ids, id, "depth ≤ 5 — must be included")
	}
	assert.NotContains(t, ids, "d6a", "depth 6 > limit — excluded")
}



// Siblings of the selected span's ancestors are rendered as collapsed nodes,
// but their own subtrees must NOT be auto-expanded.
//
//	root
//	  ├─ unrelated → unrelated-child(✗)
//	  └─ parent → selected → child(✓)
func TestGetSelectedSpans_SiblingsNotAutoExpanded(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("unrelated", "svc", mkSpan("unrelated-child", "svc")),
		mkSpan("parent", "svc",
			mkSpan("selected", "svc", mkSpan("child", "svc")),
		),
	)

	spanMap := buildSpanMap(root)
	spans, uncollapsed, _, _ := GetSelectedSpans([]string{}, "selected", []*model.Span{root}, spanMap, true)
	ids := spanIDs(spans)

	// spans: sibling is visible but collapsed; selected's subtree is expanded
	assert.Contains(t, ids, "unrelated", "sibling of parent — visible as collapsed node")
	assert.NotContains(t, ids, "unrelated-child", "sibling's subtree must not auto-expand")
	assert.Contains(t, ids, "child", "selected span's child is auto-expanded")

	// uncollapsedSpans: only spans on the path to selected + auto-expanded below it
	assert.Contains(t, uncollapsed, "parent", "parent is on the path to selected — must be tracked")
	assert.Contains(t, uncollapsed, "selected", "selected itself is uncollapsed")
	assert.NotContains(t, uncollapsed, "unrelated", "sibling is visible but not uncollapsed — its children must stay hidden")
}

// A span already in uncollapsedSpans must not be duplicated when it is also
// the selected span being uncollapsed. This covers the case where the frontend
// sends back the same uncollapsedSpans it received and the user re-expands the
// same span.
func TestGetSelectedSpans_NoDuplicatesInUncollapsed(t *testing.T) {
	root := mkSpan("root", "svc",
		mkSpan("selected", "svc", mkSpan("child", "svc")),
	)
	spanMap := buildSpanMap(root)
	_, uncollapsed, _, _ := GetSelectedSpans(
		[]string{"selected"}, // selected already present in uncollapsedSpans
		"selected",
		[]*model.Span{root}, spanMap,
		true,
	)

	seen := map[string]int{}
	for _, id := range uncollapsed {
		seen[id]++
	}
	for id, count := range seen {
		assert.Equal(t, 1, count, "span %q appears %d times in uncollapsedSpans, want 1", id, count)
	}
}

// mkSpan builds a span node. Variadic children keep nesting readable.
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

