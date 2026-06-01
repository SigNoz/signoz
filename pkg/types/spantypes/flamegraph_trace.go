package spantypes

import (
	"sort"
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

func NewFlamegraphTraceFromStorable(spans []StorableSpan) *FlamegraphTrace {
	t := &FlamegraphTrace{
		nodeByID: make(map[string]*FlamegraphSpan, len(spans)),
	}
	for i := range spans {
		node := NewFlamegraphSpanFromStorable(&spans[i], 0) // level is set later by BFS
		t.updateTimeRange(node.Timestamp, node.DurationNano)
		t.nodeByID[node.SpanID] = node
	}
	t.buildSpanTree()
	return t
}

func (t *FlamegraphTrace) GetAllLevels() [][]*FlamegraphSpan {
	var result [][]*FlamegraphSpan

	type entry struct {
		node  *FlamegraphSpan
		depth int64
	}

	for _, root := range t.roots {
		levelMap := make(map[int64][]*FlamegraphSpan)
		maxDepth := int64(-1)

		queue := []entry{{root, 0}}
		for len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]
			curr.node.Level = curr.depth
			levelMap[curr.depth] = append(levelMap[curr.depth], curr.node)
			if curr.depth > maxDepth {
				maxDepth = curr.depth
			}
			for _, child := range curr.node.Children {
				queue = append(queue, entry{child, curr.depth + 1})
			}
		}

		for depth := int64(0); depth <= maxDepth; depth++ {
			if spans, ok := levelMap[depth]; ok {
				result = append(result, spans)
			}
		}
	}

	for _, node := range t.nodeByID {
		node.Children = nil
	}
	return result
}

// GetSelectedLevels returns a window of sampled view of levels around selectedSpanID.
func (t *FlamegraphTrace) GetSelectedLevels(selectedSpanID string, levelLimit, spansPerLevel, topLatencyCount, bucketCount int) []FlamegraphLevel {
	allLevels := t.GetAllLevels()

	selectedIndex := getLevelIndex(allLevels, selectedSpanID)

	beforeSelectedLevel := int(float64(levelLimit) * 0.4)
	startLevel := max(0, selectedIndex-beforeSelectedLevel)
	endLevel := min(len(allLevels), startLevel+levelLimit)

	result := make([]FlamegraphLevel, 0, endLevel-startLevel)
	for i := startLevel; i < endLevel; i++ {
		spans := allLevels[i]
		sampled := spans
		if len(spans) > spansPerLevel {
			sampled = sampleFlamegraphLevel(spans, selectedSpanID, i == selectedIndex,
				t.startTime, t.endTime, topLatencyCount, bucketCount)
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

func (t *FlamegraphTrace) EnrichSelectedSpans(selectedSpans []FlamegraphLevel, fullSpans []StorableSpan) [][]*FlamegraphSpan {
	fullByID := make(map[string]*StorableSpan, len(fullSpans))
	for i := range fullSpans {
		fullByID[fullSpans[i].SpanID] = &fullSpans[i]
	}

	result := make([][]*FlamegraphSpan, len(selectedSpans))
	for i, lvl := range selectedSpans {
		result[i] = make([]*FlamegraphSpan, 0, len(lvl.SpanIDs))
		for _, spanID := range lvl.SpanIDs {
			if full, ok := fullByID[spanID]; ok {
				result[i] = append(result[i], NewFlamegraphSpanFromStorable(full, lvl.Level))
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
				missing := &FlamegraphSpan{
					SpanID:       node.ParentSpanID,
					Name:         "Missing Span",
					Timestamp:    node.Timestamp,
					DurationNano: node.DurationNano,
					Children:     []*FlamegraphSpan{node},
				}
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

func sampleFlamegraphLevel(
	spans []*FlamegraphSpan,
	selectedSpanID string,
	isSelectedLevel bool,
	startTime, endTime uint64,
	topLatencyCount, bucketCount int,
) []*FlamegraphSpan {
	sorted := make([]*FlamegraphSpan, len(spans))
	copy(sorted, spans)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].DurationNano > sorted[j].DurationNano
	})

	var sampled []*FlamegraphSpan

	topK := min(topLatencyCount, len(sorted))
	sampled = append(sampled, sorted[:topK]...)

	if isSelectedLevel {
		for _, span := range sorted {
			if span.SpanID == selectedSpanID {
				sampled = append(sampled, span)
				break
			}
		}
	}

	bucketSize := (endTime - startTime) / uint64(bucketCount)
	if bucketSize == 0 {
		bucketSize = 1
	}
	buckets := make([][]*FlamegraphSpan, bucketCount)
	for _, span := range sorted {
		if span.Timestamp < startTime || span.Timestamp > endTime {
			continue
		}
		idx := int((span.Timestamp - startTime) / bucketSize)
		if idx < 0 {
			idx = 0
		} else if idx >= bucketCount {
			idx = bucketCount - 1
		}
		buckets[idx] = append(buckets[idx], span)
	}
	for i := range buckets {
		if len(buckets[i]) > 2 {
			buckets[i] = buckets[i][:2]
		}
	}
	for _, bucket := range buckets {
		sampled = append(sampled, bucket...)
	}

	return sampled
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
		if s != nil && s.SpanID == spanID {
			return i
		}
	}
	return -1
}
