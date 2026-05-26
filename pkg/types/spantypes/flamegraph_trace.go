package spantypes

import (
	"sort"
)

// FlamegraphTrace holds the level wise tree
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
		if t.startTime == 0 || node.Timestamp < t.startTime {
			t.startTime = node.Timestamp
		}
		if end := node.Timestamp + node.DurationNano; end > t.endTime {
			t.endTime = end
		}
		t.nodeByID[node.SpanID] = node
	}

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

	return t
}

// SelectWindow builds all BFS levels, counts total spans, then either returns all
// levels unchanged (totalSpans <= effectiveLimit) or applies a level window with
// sampling for large traces. The bool return is true when windowing was applied.
// Children are cleared after traversal so the tree can be GC'd.
func (t *FlamegraphTrace) SelectWindow(
	selectedSpanID string,
	effectiveLimit uint,
	levelLimit, spansPerLevel, topLatencyCount, bucketCount int,
) ([]FlamegraphWindowLevel, bool) {
	allLevels := t.buildAllLevels()

	for _, node := range t.nodeByID {
		node.Children = nil
	}

	var totalSpans uint
	for _, lvl := range allLevels {
		totalSpans += uint(len(lvl))
	}

	if totalSpans <= effectiveLimit {
		result := make([]FlamegraphWindowLevel, 0, len(allLevels))
		for _, lvl := range allLevels {
			if len(lvl) == 0 {
				continue
			}
			spanIDs := make([]string, len(lvl))
			for i, s := range lvl {
				spanIDs[i] = s.SpanID
			}
			result = append(result, FlamegraphWindowLevel{
				Level:   lvl[0].Level,
				SpanIDs: spanIDs,
			})
		}
		return result, false
	}

	selectedIndex := 0
	if selectedSpanID != "" {
	outer:
		for i, lvl := range allLevels {
			for _, span := range lvl {
				if span.SpanID == selectedSpanID {
					selectedIndex = i
					break outer
				}
			}
		}
	}

	lowerLimit := selectedIndex - int(float64(levelLimit)*0.4)
	upperLimit := selectedIndex + int(float64(levelLimit)*0.6)

	if lowerLimit < 0 {
		upperLimit -= lowerLimit
		lowerLimit = 0
	}
	if upperLimit > len(allLevels) {
		lowerLimit -= upperLimit - len(allLevels)
		upperLimit = len(allLevels)
	}
	if lowerLimit < 0 {
		lowerLimit = 0
	}

	result := make([]FlamegraphWindowLevel, 0, upperLimit-lowerLimit)
	for i := lowerLimit; i < upperLimit; i++ {
		lvl := allLevels[i]
		if len(lvl) == 0 {
			continue
		}
		var sampled []*FlamegraphSpan
		if len(lvl) > spansPerLevel {
			sampled = sampleFlamegraphLevel(lvl, selectedSpanID, i == selectedIndex,
				t.startTime, t.endTime, topLatencyCount, bucketCount)
		} else {
			sampled = lvl
		}
		if len(sampled) == 0 {
			continue
		}
		spanIDs := make([]string, len(sampled))
		for j, s := range sampled {
			spanIDs[j] = s.SpanID
		}
		result = append(result, FlamegraphWindowLevel{
			Level:   sampled[0].Level,
			SpanIDs: spanIDs,
		})
	}

	return result, true
}

// buildAllLevels performs per-root BFS, appending each root's levels sequentially.
// This preserves the sequential-root semantics of the legacy GetAllSpansForFlamegraph.
func (t *FlamegraphTrace) buildAllLevels() [][]*FlamegraphSpan {
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

	return result
}

// sampleFlamegraphLevel down-samples a dense level using latency-top + timestamp bucketing.
// Mirrors the legacy getLatencyAndTimestampBucketedSpans behavior exactly.
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

	topK := topLatencyCount
	if topK > len(sorted) {
		topK = len(sorted)
	}
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

// GetNode returns the lean tree node for spanID, if it exists.
// Useful for recovering synthesized "Missing Span" placeholders that are in the
// window but will never be returned by GetTraceSpansByIDs.
func (t *FlamegraphTrace) GetNode(spanID string) (*FlamegraphSpan, bool) {
	node, ok := t.nodeByID[spanID]
	return node, ok
}

func flamegraphSpanIndex(spans []*FlamegraphSpan, spanID string) int {
	for i, s := range spans {
		if s != nil && s.SpanID == spanID {
			return i
		}
	}
	return -1
}
