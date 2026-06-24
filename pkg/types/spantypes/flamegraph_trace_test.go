package spantypes

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// mkMinimal builds a MinimalSpan. timestamp and duration are in nanoseconds.
func mkMinimal(id, parentID string, timestamp, duration uint64) MinimalSpan {
	return MinimalSpan{
		SpanID:       id,
		ParentSpanID: parentID,
		StartTime:    time.Unix(0, int64(timestamp)),
		DurationNano: duration,
	}
}

// levelIDs extracts span IDs level-by-level from GetAllLevels output.
func levelIDs(levels [][]*FlamegraphSpan) [][]string {
	out := make([][]string, len(levels))
	for i, lvl := range levels {
		ids := make([]string, len(lvl))
		for j, s := range lvl {
			ids[j] = s.SpanID
		}
		out[i] = ids
	}
	return out
}

// makeChainFG builds a linear trace of n spans: span0 → span1 → … → span(n-1).
func makeChainFG(n int) *FlamegraphTrace {
	spans := make([]MinimalSpan, n)
	for i := range n {
		parent := ""
		if i > 0 {
			parent = fmt.Sprintf("span%d", i-1)
		}
		spans[i] = mkMinimal(fmt.Sprintf("span%d", i), parent, uint64(i*100), 100)
	}
	return NewFlamegraphTraceFromMinimal(spans)
}

// makeBroadTrace builds a trace: root → N children (wide, one level deep).
func makeBroadTrace(n int) *FlamegraphTrace {
	spans := make([]MinimalSpan, n+1)
	spans[0] = mkMinimal("root", "", 0, uint64(n*100))
	for i := range n {
		spans[i+1] = mkMinimal(fmt.Sprintf("child%d", i), "root", uint64(i*100), 100)
	}
	return NewFlamegraphTraceFromMinimal(spans)
}

// ─────────────────────────────────────────────────────────────────────────────
// buildSpanTree / GetAllLevels
// ─────────────────────────────────────────────────────────────────────────────

func TestGetAllLevels(t *testing.T) {
	tests := []struct {
		name  string
		spans []MinimalSpan
		check func(t *testing.T, levels [][]*FlamegraphSpan)
	}{
		{
			// root → child → grandchild: three levels, one span each.
			name: "linear_chain",
			spans: []MinimalSpan{
				mkMinimal("root", "", 100, 300),
				mkMinimal("child", "root", 150, 200),
				mkMinimal("grandchild", "child", 200, 100),
			},
			check: func(t *testing.T, levels [][]*FlamegraphSpan) {
				assert.Equal(t, [][]string{{"root"}, {"child"}, {"grandchild"}}, levelIDs(levels))
			},
		},
		{
			// root → [A, B]: level 0 has root, level 1 has both children.
			name: "two_siblings",
			spans: []MinimalSpan{
				mkMinimal("root", "", 100, 300),
				mkMinimal("A", "root", 150, 100),
				mkMinimal("B", "root", 200, 100),
			},
			check: func(t *testing.T, levels [][]*FlamegraphSpan) {
				assert.Equal(t, []string{"root"}, levelIDs(levels)[0])
				assert.ElementsMatch(t, []string{"A", "B"}, levelIDs(levels)[1])
			},
		},
		{
			// child references a non-existent parent → synthetic "Missing Span" root at level 0.
			name: "missing_parent",
			spans: []MinimalSpan{
				mkMinimal("child", "ghost", 100, 100),
			},
			check: func(t *testing.T, levels [][]*FlamegraphSpan) {
				assert.Len(t, levels, 2)
				assert.Equal(t, "ghost", levels[0][0].SpanID)
				assert.Equal(t, "Missing Span", levels[0][0].Name)
				assert.Equal(t, "child", levels[1][0].SpanID)
			},
		},
		{
			// Children must be nil after BFS so the tree does not stay live in memory.
			name: "children_nilled_after_bfs",
			spans: []MinimalSpan{
				mkMinimal("root", "", 100, 200),
				mkMinimal("child", "root", 150, 100),
			},
			check: func(t *testing.T, levels [][]*FlamegraphSpan) {
				for _, lvl := range levels {
					for _, s := range lvl {
						assert.Nil(t, s.Children)
					}
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tc.check(t, NewFlamegraphTraceFromMinimal(tc.spans).GetAllLevels())
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetSelectedLevels
// ─────────────────────────────────────────────────────────────────────────────

func TestGetSelectedLevels(t *testing.T) {
	tests := []struct {
		name          string
		buildTrace    func() *FlamegraphTrace
		selectedSpan  string
		levelLimit    int
		spansPerLevel int
		topK          int
		bucketCount   int
		check         func(t *testing.T, levels []FlamegraphLevel)
	}{
		{
			// Middle: 40% above (20 levels) + 60% below (30 levels) = 50 total.
			name:          "window_middle",
			buildTrace:    func() *FlamegraphTrace { return makeChainFG(100) },
			selectedSpan:  "span50",
			levelLimit:    50,
			spansPerLevel: 1000,
			topK:          5,
			bucketCount:   50,
			check: func(t *testing.T, levels []FlamegraphLevel) {
				assert.Equal(t, 50, len(levels))
				assert.Equal(t, "span30", levels[0].SpanIDs[0])
			},
		},
		{
			// Near start: clamp at 0, redistribute budget downward — still 50 levels.
			name:          "window_near_start",
			buildTrace:    func() *FlamegraphTrace { return makeChainFG(100) },
			selectedSpan:  "span5",
			levelLimit:    50,
			spansPerLevel: 1000,
			topK:          5,
			bucketCount:   50,
			check: func(t *testing.T, levels []FlamegraphLevel) {
				assert.Equal(t, 50, len(levels))
				assert.Equal(t, "span0", levels[0].SpanIDs[0])
			},
		},
		{
			// Near end: clamp at total, redistribute budget upward — still 50 levels.
			name:          "window_near_end",
			buildTrace:    func() *FlamegraphTrace { return makeChainFG(100) },
			selectedSpan:  "span95",
			levelLimit:    50,
			spansPerLevel: 1000,
			topK:          5,
			bucketCount:   50,
			check: func(t *testing.T, levels []FlamegraphLevel) {
				assert.Equal(t, 50, len(levels))
				assert.Equal(t, "span50", levels[0].SpanIDs[0])
			},
		},
		{
			// Unknown span ID falls back to level 0.
			name:          "unknown_span_defaults_to_level_zero",
			buildTrace:    func() *FlamegraphTrace { return makeChainFG(10) },
			selectedSpan:  "nonexistent",
			levelLimit:    5,
			spansPerLevel: 1000,
			topK:          5,
			bucketCount:   50,
			check: func(t *testing.T, levels []FlamegraphLevel) {
				assert.Equal(t, "span0", levels[0].SpanIDs[0])
			},
		},
		{
			// Dense levels are sampled down to approximately spansPerLevel.
			name:          "sampling_respects_cap",
			buildTrace:    func() *FlamegraphTrace { return makeBroadTrace(200) },
			selectedSpan:  "root",
			levelLimit:    10,
			spansPerLevel: 10,
			topK:          3,
			bucketCount:   5,
			check: func(t *testing.T, levels []FlamegraphLevel) {
				for _, lvl := range levels {
					assert.LessOrEqual(t, len(lvl.SpanIDs), 10+3+5*2)
				}
			},
		},
		{
			// Selected span always survives sampling even when not in topK.
			name:          "selected_span_always_included",
			buildTrace:    func() *FlamegraphTrace { return makeBroadTrace(200) },
			selectedSpan:  "child99",
			levelLimit:    10,
			spansPerLevel: 5,
			topK:          3,
			bucketCount:   5,
			check: func(t *testing.T, levels []FlamegraphLevel) {
				found := false
				for _, lvl := range levels {
					for _, id := range lvl.SpanIDs {
						if id == "child99" {
							found = true
						}
					}
				}
				assert.True(t, found, "selected span must survive sampling")
			},
		},
		{
			// Selected span is also the highest-latency span (lands in topK) — must not appear twice.
			name: "no_duplicate_span_ids",
			buildTrace: func() *FlamegraphTrace {
				spans := make([]MinimalSpan, 201)
				spans[0] = mkMinimal("root", "", 0, 10000)
				for i := range 200 {
					spans[i+1] = mkMinimal(fmt.Sprintf("child%d", i), "root", uint64(i*50), uint64(200-i)*10)
				}
				return NewFlamegraphTraceFromMinimal(spans)
			},
			selectedSpan:  "child0",
			levelLimit:    10,
			spansPerLevel: 5,
			topK:          3,
			bucketCount:   10,
			check: func(t *testing.T, levels []FlamegraphLevel) {
				for _, lvl := range levels {
					seen := map[string]bool{}
					for _, id := range lvl.SpanIDs {
						assert.False(t, seen[id], "duplicate span ID %q at level %d", id, lvl.Level)
						seen[id] = true
					}
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// fresh trace per subtest: GetAllLevels is destructive (nils Children)
			levels := tc.buildTrace().GetSelectedLevels(tc.selectedSpan, tc.levelLimit, tc.spansPerLevel, tc.topK, tc.bucketCount)
			tc.check(t, levels)
		})
	}
}
