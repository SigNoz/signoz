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
	allLevels := t.buildAllLevels()
	for _, node := range t.nodeByID {
		node.Children = nil // children not required after building tree
	}
	return allLevels
}

// GetSelectedLevels returns the window of levels around selectedSpanID with sampling applied to dense levels.
func (t *FlamegraphTrace) GetSelectedLevels(selectedSpanID string, levelLimit, spansPerLevel, topLatencyCount, bucketCount int) []FlamegraphLevel {
	allLevels := t.buildAllLevels()
	for _, node := range t.nodeByID {
		node.Children = nil
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

	result := make([]FlamegraphLevel, 0, upperLimit-lowerLimit)
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
		result = append(result, FlamegraphLevel{
			Level:   sampled[0].Level,
			SpanIDs: spanIDs,
		})
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

func flamegraphSpanIndex(spans []*FlamegraphSpan, spanID string) int {
	for i, s := range spans {
		if s.SpanID == spanID {
			return i
		}
	}
	return -1
}
