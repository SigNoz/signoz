package spantypes

import (
	"sort"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// FlamegraphTrace holds the level wise tree built from minimal spans.
type FlamegraphTrace struct {
	roots     []*FlamegraphSpan
	nodeByID  map[string]*FlamegraphSpan
	startTime uint64
	endTime   uint64
}

func NewFlamegraphTraceFromMinimal(spans []MinimalSpan) *FlamegraphTrace {
	t := &FlamegraphTrace{
		nodeByID: make(map[string]*FlamegraphSpan, len(spans)),
	}
	for i := range spans {
		node := spans[i].ToFlamegraphSpan()
		t.updateTimeRange(node.Timestamp, node.DurationNano)
		t.nodeByID[node.SpanID] = node
	}
	t.buildSpanTree()
	return t
}

func NewFlamegraphTraceFromStorable(spans []StorableSpan, selectFields []telemetrytypes.TelemetryFieldKey) *FlamegraphTrace {
	t := &FlamegraphTrace{
		nodeByID: make(map[string]*FlamegraphSpan, len(spans)),
	}
	for i := range spans {
		node := NewFlamegraphSpanFromStorable(&spans[i], 0, selectFields) // level is set later by BFS
		t.updateTimeRange(node.Timestamp, node.DurationNano)
		t.nodeByID[node.SpanID] = node
	}
	t.buildSpanTree()
	return t
}

func (t *FlamegraphTrace) GetAllLevels() [][]*FlamegraphSpan {
	return nil
}

// GetSelectedLevels returns the window of levels around selectedSpanID with sampling applied to dense levels.
func (t *FlamegraphTrace) GetSelectedLevels(selectedSpanID string, levelLimit, spansPerLevel, topLatencyCount, bucketCount int) []FlamegraphLevel {
	return nil
}

func (t *FlamegraphTrace) EnrichSelectedSpans(selectedSpans []FlamegraphLevel, fullSpans []StorableSpan, selectFields []telemetrytypes.TelemetryFieldKey) [][]*FlamegraphSpan {
	fullByID := make(map[string]*StorableSpan, len(fullSpans))
	for i := range fullSpans {
		fullByID[fullSpans[i].SpanID] = &fullSpans[i]
	}

	result := make([][]*FlamegraphSpan, len(selectedSpans))
	for i, lvl := range selectedSpans {
		result[i] = make([]*FlamegraphSpan, 0, len(lvl.SpanIDs))
		for _, spanID := range lvl.SpanIDs {
			if full, ok := fullByID[spanID]; ok {
				result[i] = append(result[i], NewFlamegraphSpanFromStorable(full, lvl.Level, selectFields))
			} else if lean, ok := t.nodeByID[spanID]; ok {
				result[i] = append(result[i], lean)
			}
		}
	}
	return result
}

func (t *FlamegraphTrace) updateTimeRange(timestamp, durationNano uint64) {
	if t.startTime == 0 || timestamp < t.startTime {
		t.startTime = timestamp
	}
	if end := timestamp + durationNano; end > t.endTime {
		t.endTime = end
	}
}

func (t *FlamegraphTrace) buildSpanTree() {
	for _, node := range t.nodeByID {
		if node.ParentSpanID != "" {
			if parent, ok := t.nodeByID[node.ParentSpanID]; ok {
				parent.Children = append(parent.Children, node)
			} else {
				missing := NewMissingParentFlamegraphSpan(node)
				t.nodeByID[missing.SpanID] = missing
				t.roots = append(t.roots, missing)
			}
		} else if flamegraphSpanIndex(t.roots, node.SpanID) == -1 {
			t.roots = append(t.roots, node)
		}
	}

	sort.Slice(t.roots, func(i, j int) bool {
		if t.roots[i].Timestamp == t.roots[j].Timestamp {
			return t.roots[i].SpanID < t.roots[j].SpanID
		}
		return t.roots[i].Timestamp < t.roots[j].Timestamp
	})
}

func flamegraphSpanIndex(spans []*FlamegraphSpan, spanID string) int {
	for i, s := range spans {
		if s.SpanID == spanID {
			return i
		}
	}
	return -1
}
