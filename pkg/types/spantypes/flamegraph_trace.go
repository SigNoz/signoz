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

// GetAllLevels return level wise spans using BFS on trace.
func (t *FlamegraphTrace) GetAllLevels() [][]*FlamegraphSpan {
	var result [][]*FlamegraphSpan
	for _, root := range t.roots {
		currentLevel := []*FlamegraphSpan{root}
		for depth := int64(0); len(currentLevel) > 0; depth++ {
			var nextLevel []*FlamegraphSpan
			for _, node := range currentLevel {
				node.Level = depth
				nextLevel = append(nextLevel, node.Children...)
				node.Children = nil // release tree reference
			}
			result = append(result, currentLevel)
			currentLevel = nextLevel
		}
	}

	return result
}

// GetSelectedLevels returns the window of levels around selectedSpanID with sampling applied to dense levels.
func (t *FlamegraphTrace) GetSelectedLevels(selectedSpanID string, levelLimit, spansPerLevel, topLatencyCount, bucketCount int) []FlamegraphLevel {
	allLevels := t.GetAllLevels()

	selectedIndex := getLevelIndex(allLevels, selectedSpanID)

	// 40% window above level with selected span and 60% below that
	beforeSelectedLevel := int(float64(levelLimit) * 0.4)
	startLevel := max(0, selectedIndex-beforeSelectedLevel)
	endLevel := min(len(allLevels), startLevel+levelLimit)
	startLevel = max(0, endLevel-levelLimit) // utilize the page size if endLevel is clamped

	result := make([]FlamegraphLevel, 0, endLevel-startLevel)
	for i := startLevel; i < endLevel; i++ {
		spans := allLevels[i]
		sampled := spans
		if len(spans) > spansPerLevel {
			sampled = t.sampleLevel(spans, selectedSpanID, i == selectedIndex, topLatencyCount, bucketCount)
		}
		if len(sampled) == 0 {
			continue
		}
		spanIDs := make([]string, len(sampled))
		for j, s := range sampled {
			spanIDs[j] = s.SpanID
		}
		result = append(result, FlamegraphLevel{Level: spans[0].Level, SpanIDs: spanIDs})
	}

	return result
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

func (t *FlamegraphTrace) sampleLevel(spans []*FlamegraphSpan, selectedSpanID string, isSelectedLevel bool, topLatencyCount, bucketCount int) []*FlamegraphSpan {
	sorted := make([]*FlamegraphSpan, len(spans))
	copy(sorted, spans)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].DurationNano > sorted[j].DurationNano
	})

	sampled := make(map[string]*FlamegraphSpan, topLatencyCount+1)

	topK := min(topLatencyCount, len(sorted))
	for _, span := range sorted[:topK] {
		sampled[span.SpanID] = span
	}

	// include the selected span.
	if isSelectedLevel {
		for _, span := range sorted {
			if span.SpanID == selectedSpanID {
				sampled[span.SpanID] = span
				break
			}
		}
	}

	for _, span := range t.bucketSampleSpans(sorted, bucketCount, sampled) {
		sampled[span.SpanID] = span
	}

	result := make([]*FlamegraphSpan, 0, len(sampled))
	for _, span := range sampled {
		result = append(result, span)
	}
	return result
}

func (t *FlamegraphTrace) bucketSampleSpans(sorted []*FlamegraphSpan, bucketCount int, exclude map[string]*FlamegraphSpan) []*FlamegraphSpan {
	bucketSize := (t.endTime - t.startTime) / uint64(bucketCount)
	if bucketSize == 0 {
		bucketSize = 1
	}
	buckets := make([][]*FlamegraphSpan, bucketCount)
	for _, span := range sorted {
		if _, ok := exclude[span.SpanID]; ok {
			continue
		}
		if span.Timestamp < t.startTime || span.Timestamp > t.endTime {
			continue
		}
		idx := min(int((span.Timestamp-t.startTime)/bucketSize), bucketCount-1)
		if len(buckets[idx]) < 2 {
			buckets[idx] = append(buckets[idx], span)
		}
	}
	var result []*FlamegraphSpan
	for _, bucket := range buckets {
		result = append(result, bucket...)
	}
	return result
}

func getLevelIndex(levels [][]*FlamegraphSpan, spanID string) int {
	for i, lvl := range levels {
		for _, span := range lvl {
			if span.SpanID == spanID {
				return i
			}
		}
	}
	return 0
}

func flamegraphSpanIndex(spans []*FlamegraphSpan, spanID string) int {
	for i, s := range spans {
		if s.SpanID == spanID {
			return i
		}
	}
	return -1
}
