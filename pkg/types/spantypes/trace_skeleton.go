package spantypes

import (
	"cmp"
	"encoding/json"
	"slices"
	"strconv"
	"strings"
	"time"
)

const (
	noParent int32 = -1

	refTypeChildOf = "CHILD_OF"
)

// SkeletonSpan is one row of the query a TraceSkeleton is built from.
type SkeletonSpan struct {
	Span
	// StartTime keeps the nanoseconds own time is computed from; TimeUnix is in milliseconds.
	StartTime         time.Time
	ServiceName       string
	HasExceptionEvent bool
	HasLink           bool
	// OtherReferences is empty for a span whose only reference is the one to its parent.
	OtherReferences string
	// AIUsage is kept when it has a value, pointers included: every row needs its own.
	AIUsage AISpanUsage
}

// AISpanUsage is the gen_ai token and cost usage of one span; a nil value is absent on the span.
type AISpanUsage struct {
	InputTokens      *float64
	OutputTokens     *float64
	CacheReadTokens  *float64
	CacheWriteTokens *float64
	ReasoningTokens  *float64
	Cost             *float64
}

// TraceSkeleton is the tree of a trace. A span is known by its position, its index in start time
// order, and every slice below holds one value per span at that position. It is read-only once built.
type TraceSkeleton struct {
	traceID string

	// spanIDs holds every span id back to back; span i is spanIDs[idOffsets[i]:idOffsets[i+1]].
	spanIDs   string
	idOffsets []uint32
	// parents holds the position of each span's parent, or noParent for a root.
	parents           []int32
	startNano         []int64
	durationNano      []uint64
	hasError          []bool
	hasExceptionEvent []bool
	hasLink           []bool
	// Each distinct string is stored once in stringTable; these hold its index there.
	names               []uint32
	services            []uint32
	kinds               []uint32
	responseStatusCodes []uint32
	statusCodeStrings   []uint32
	statusMessages      []uint32
	stringTable         []string
	// references holds the stored references of a span that has more than the one to its parent.
	references map[int32]string
	// storedParentIDs holds the parent id of a root that has one: its parent is missing or on a loop.
	storedParentIDs map[int32]string
	// aiUsage holds the usage of the spans that carry any, by span position.
	aiUsage map[int32]AISpanUsage

	// The children of span i are childList[childStart[i]:childStart[i+1]], in start time order.
	childStart []int32
	childList  []int32
	roots      []int32
	// treeOrder lists the spans as a waterfall shows them: a span, then everything below it.
	treeOrder []int32
	level     []uint32
	// descendantCount is the number of spans below each span, at any depth.
	descendantCount []uint32
	ownTime         []uint64
	// groupOf is the index in groups of the group a span belongs to.
	groupOf []int32
	groups  []siblingGroup
}

// TraceSkeletonBuilder collects the rows of a trace. They must be added in start time order.
type TraceSkeletonBuilder struct {
	skeleton    *TraceSkeleton
	ids         []byte
	parentIDs   []string
	stringIndex map[string]uint32
}

func NewTraceSkeletonBuilder(traceID string, sizeHint int) *TraceSkeletonBuilder {
	return &TraceSkeletonBuilder{
		skeleton: &TraceSkeleton{
			traceID:             traceID,
			idOffsets:           make([]uint32, 1, sizeHint+1),
			parents:             make([]int32, 0, sizeHint),
			startNano:           make([]int64, 0, sizeHint),
			durationNano:        make([]uint64, 0, sizeHint),
			hasError:            make([]bool, 0, sizeHint),
			hasExceptionEvent:   make([]bool, 0, sizeHint),
			hasLink:             make([]bool, 0, sizeHint),
			names:               make([]uint32, 0, sizeHint),
			services:            make([]uint32, 0, sizeHint),
			kinds:               make([]uint32, 0, sizeHint),
			responseStatusCodes: make([]uint32, 0, sizeHint),
			statusCodeStrings:   make([]uint32, 0, sizeHint),
			statusMessages:      make([]uint32, 0, sizeHint),
			references:          make(map[int32]string),
			storedParentIDs:     make(map[int32]string),
			aiUsage:             make(map[int32]AISpanUsage),
		},
		ids:         make([]byte, 0, sizeHint*16),
		parentIDs:   make([]string, 0, sizeHint),
		stringIndex: make(map[string]uint32),
	}
}

func (builder *TraceSkeletonBuilder) Add(span *SkeletonSpan) {
	skeleton := builder.skeleton
	if span.AIUsage.hasValue() {
		skeleton.aiUsage[int32(len(builder.parentIDs))] = span.AIUsage
	}
	if span.OtherReferences != "" {
		skeleton.references[int32(len(builder.parentIDs))] = span.OtherReferences
	}
	builder.ids = append(builder.ids, span.SpanID...)
	skeleton.idOffsets = append(skeleton.idOffsets, uint32(len(builder.ids)))
	builder.parentIDs = append(builder.parentIDs, span.ParentSpanID)
	skeleton.startNano = append(skeleton.startNano, span.StartTime.UnixNano())
	skeleton.durationNano = append(skeleton.durationNano, span.DurationNano)
	skeleton.hasError = append(skeleton.hasError, span.HasError)
	skeleton.hasExceptionEvent = append(skeleton.hasExceptionEvent, span.HasExceptionEvent)
	skeleton.hasLink = append(skeleton.hasLink, span.HasLink)
	skeleton.names = append(skeleton.names, builder.intern(span.Name))
	skeleton.services = append(skeleton.services, builder.intern(span.ServiceName))
	skeleton.kinds = append(skeleton.kinds, builder.intern(span.KindString))
	skeleton.responseStatusCodes = append(skeleton.responseStatusCodes, builder.intern(span.ResponseStatusCode))
	skeleton.statusCodeStrings = append(skeleton.statusCodeStrings, builder.intern(span.StatusCodeString))
	skeleton.statusMessages = append(skeleton.statusMessages, builder.intern(span.StatusMessage))
}

// Build turns the added rows into the tree. The builder cannot be reused.
func (builder *TraceSkeletonBuilder) Build() *TraceSkeleton {
	skeleton := builder.skeleton
	skeleton.spanIDs = string(builder.ids)
	n := len(builder.parentIDs)

	// A span whose parent is not in the trace, or is the span itself, becomes a root.
	positions := make(map[string]int32, n)
	for i := range n {
		positions[skeleton.spanID(int32(i))] = int32(i)
	}
	for i, parentID := range builder.parentIDs {
		parent, ok := positions[parentID]
		if !ok || parent == int32(i) {
			parent = noParent
			if parentID != "" {
				skeleton.storedParentIDs[int32(i)] = parentID
			}
		}
		skeleton.parents = append(skeleton.parents, parent)
	}
	builder.parentIDs, builder.stringIndex, builder.ids = nil, nil, nil

	skeleton.linkChildren()
	if skeleton.walkFromRoots() < n {
		skeleton.cutParentLoops()
		skeleton.linkChildren()
		skeleton.walkFromRoots()
	}

	// Walking the tree order backwards reaches every span after all the spans below it.
	skeleton.descendantCount = make([]uint32, n)
	for k := n - 1; k >= 0; k-- {
		i := skeleton.treeOrder[k]
		if parent := skeleton.parents[i]; parent != noParent {
			skeleton.descendantCount[parent] += skeleton.descendantCount[i] + 1
		}
	}

	skeleton.ownTime = make([]uint64, n)
	for i := range n {
		skeleton.ownTime[i] = skeleton.durationNano[i] - skeleton.timeCoveredByChildren(int32(i))
	}

	skeleton.groupSameNameSiblings()
	return skeleton
}

func (skeleton *TraceSkeleton) len() int {
	return len(skeleton.parents)
}

func (skeleton *TraceSkeleton) spanID(i int32) string {
	return skeleton.spanIDs[skeleton.idOffsets[i]:skeleton.idOffsets[i+1]]
}

func (skeleton *TraceSkeleton) children(i int32) []int32 {
	return skeleton.childList[skeleton.childStart[i]:skeleton.childStart[i+1]]
}

func (skeleton *TraceSkeleton) parentSpanID(i int32) string {
	if parent := skeleton.parents[i]; parent != noParent {
		return skeleton.spanID(parent)
	}
	return skeleton.storedParentIDs[i]
}

func (skeleton *TraceSkeleton) spanReferences(i int32) []OtelSpanRef {
	stored, ok := skeleton.references[i]
	if !ok {
		return []OtelSpanRef{{TraceId: skeleton.traceID, SpanId: skeleton.parentSpanID(i), RefType: refTypeChildOf}}
	}
	refs := []OtelSpanRef{}
	if err := json.Unmarshal([]byte(stored), &refs); err != nil {
		return []OtelSpanRef{} // skip malformed values
	}
	return refs
}

// unmarkedFailureKind is set for a span that reports a failure without the error flag. The response
// status column holds an HTTP status or a gRPC status.
func (skeleton *TraceSkeleton) unmarkedFailureKind(i int32) UnmarkedFailureKind {
	if skeleton.hasError[i] {
		return ""
	}
	if code, err := strconv.Atoi(skeleton.stringTable[skeleton.responseStatusCodes[i]]); err == nil {
		switch {
		case code >= 400 && code < 500:
			return UnmarkedFailureHTTP4xx
		case code >= 500 && code < 600:
			return UnmarkedFailureHTTP5xx
		case code >= 1 && code <= 16:
			return UnmarkedFailureGRPCStatus
		}
	}
	if skeleton.hasExceptionEvent[i] {
		return UnmarkedFailureExceptionEvent
	}
	return ""
}

func (skeleton *TraceSkeleton) treeStats(i int32) SpanTreeStats {
	stats := SpanTreeStats{
		Level:            skeleton.level[i],
		ChildCount:       uint32(len(skeleton.children(i))),
		SubtreeSpanCount: skeleton.descendantCount[i],
		OwnTimeNano:      skeleton.ownTime[i],
	}
	for p := skeleton.parents[i]; p != noParent && skeleton.hasError[p]; p = skeleton.parents[p] {
		stats.ErrorAncestorCount++
	}
	if group := skeleton.groups[skeleton.groupOf[i]]; group.spanCount > 1 {
		stats.SameNameSiblings = &SameNameSiblingStats{SpanCount: group.spanCount, OwnTimeNano: group.ownTime, ErrorSpanCount: group.errCount}
	}
	return stats
}

// serviceStats totals the spans of each service, the service with the most own time first.
func (skeleton *TraceSkeleton) serviceStats() []TraceServiceStats {
	byService := make(map[uint32]*TraceServiceStats)
	for i := range int32(skeleton.len()) {
		service, ok := byService[skeleton.services[i]]
		if !ok {
			service = &TraceServiceStats{ServiceName: skeleton.stringTable[skeleton.services[i]]}
			byService[skeleton.services[i]] = service
		}
		service.SpanCount++
		service.OwnTimeNano += skeleton.ownTime[i]
		if skeleton.hasError[i] {
			service.ErrorSpanCount++
		}
	}
	services := make([]TraceServiceStats, 0, len(byService))
	for _, service := range byService {
		services = append(services, *service)
	}
	slices.SortFunc(services, func(a, b TraceServiceStats) int {
		return cmp.Or(cmp.Compare(b.OwnTimeNano, a.OwnTimeNano), strings.Compare(a.ServiceName, b.ServiceName))
	})
	return services
}

// siblingGroup totals the spans that share a name and a parent; a root is a group of its own.
type siblingGroup struct {
	// longest is the position of the span with the highest duration in the group.
	longest   int32
	spanCount uint64
	ownTime   uint64
	errCount  uint64
}

func (usage AISpanUsage) hasValue() bool {
	return usage.InputTokens != nil || usage.OutputTokens != nil || usage.CacheReadTokens != nil ||
		usage.CacheWriteTokens != nil || usage.ReasoningTokens != nil || usage.Cost != nil
}

// intern returns the index of value in the string table, adding it on first sight.
func (builder *TraceSkeletonBuilder) intern(value string) uint32 {
	if idx, ok := builder.stringIndex[value]; ok {
		return idx
	}
	idx := uint32(len(builder.skeleton.stringTable))
	builder.skeleton.stringTable = append(builder.skeleton.stringTable, value)
	builder.stringIndex[value] = idx
	return idx
}

// linkChildren fills roots, childStart and childList from parents: it counts the children of
// every span, turns the counts into start offsets, then places each child.
func (skeleton *TraceSkeleton) linkChildren() {
	n := skeleton.len()
	skeleton.childStart = make([]int32, n+1)
	skeleton.roots = skeleton.roots[:0]
	for i := range n {
		if parent := skeleton.parents[i]; parent != noParent {
			skeleton.childStart[parent+1]++
		} else {
			skeleton.roots = append(skeleton.roots, int32(i))
		}
	}
	for i := range n {
		skeleton.childStart[i+1] += skeleton.childStart[i]
	}
	skeleton.childList = make([]int32, skeleton.childStart[n])
	next := slices.Clone(skeleton.childStart[:n])
	for i := range n {
		if parent := skeleton.parents[i]; parent != noParent {
			skeleton.childList[next[parent]] = int32(i)
			next[parent]++
		}
	}
}

// walkFromRoots fills treeOrder and level, and returns the number of spans it reached.
func (skeleton *TraceSkeleton) walkFromRoots() int {
	n := skeleton.len()
	skeleton.treeOrder = make([]int32, 0, n)
	skeleton.level = make([]uint32, n)
	// Pushed in reverse, the earliest root and the earliest child are popped first.
	stack := make([]int32, 0, 64)
	for r := len(skeleton.roots) - 1; r >= 0; r-- {
		stack = append(stack, skeleton.roots[r])
	}
	for len(stack) > 0 {
		i := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		skeleton.treeOrder = append(skeleton.treeOrder, i)
		children := skeleton.children(i)
		for c := len(children) - 1; c >= 0; c-- {
			skeleton.level[children[c]] = skeleton.level[i] + 1
			stack = append(stack, children[c])
		}
	}
	return len(skeleton.treeOrder)
}

// cutParentLoops handles spans no root reaches: they sit on a loop of parents (a under b, b under
// a) or below one. The earliest unreached span of each loop becomes a root.
func (skeleton *TraceSkeleton) cutParentLoops() {
	reached := make([]bool, skeleton.len())
	for _, i := range skeleton.treeOrder {
		reached[i] = true
	}
	for i := range int32(skeleton.len()) {
		if reached[i] {
			continue
		}
		skeleton.storedParentIDs[i] = skeleton.spanID(skeleton.parents[i])
		skeleton.parents[i] = noParent
		stack := []int32{i}
		for len(stack) > 0 {
			top := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			if !reached[top] {
				reached[top] = true
				stack = append(stack, skeleton.children(top)...)
			}
		}
	}
}

// timeCoveredByChildren is the time of span i during which a child was running. Overlapping
// children count once, and child time outside the span does not count.
func (skeleton *TraceSkeleton) timeCoveredByChildren(i int32) uint64 {
	start := skeleton.startNano[i]
	end := start + int64(skeleton.durationNano[i])
	covered, cursor := int64(0), start
	for _, child := range skeleton.children(i) {
		childStart := max(skeleton.startNano[child], cursor)
		childEnd := min(skeleton.startNano[child]+int64(skeleton.durationNano[child]), end)
		if childEnd <= childStart {
			continue
		}
		covered += childEnd - childStart
		cursor = childEnd
	}
	return uint64(covered)
}

// groupSameNameSiblings fills groups and groupOf: one group per name among the children of a span.
func (skeleton *TraceSkeleton) groupSameNameSiblings() {
	n := skeleton.len()
	skeleton.groupOf = make([]int32, n)
	skeleton.groups = make([]siblingGroup, 0, n)
	addGroup := func(members []int32) {
		group := siblingGroup{longest: members[0]}
		for _, i := range members {
			skeleton.groupOf[i] = int32(len(skeleton.groups))
			group.spanCount++
			group.ownTime += skeleton.ownTime[i]
			if skeleton.hasError[i] {
				group.errCount++
			}
			if skeleton.durationNano[i] > skeleton.durationNano[group.longest] {
				group.longest = i
			}
		}
		skeleton.groups = append(skeleton.groups, group)
	}

	for r := range skeleton.roots {
		addGroup(skeleton.roots[r : r+1])
	}
	var siblings []int32
	for parent := range int32(n) {
		// Sorting by name puts same-name siblings side by side; the stable sort keeps their time order.
		siblings = append(siblings[:0], skeleton.children(parent)...)
		slices.SortStableFunc(siblings, func(a, b int32) int { return int(skeleton.names[a]) - int(skeleton.names[b]) })
		for first := 0; first < len(siblings); {
			end := first + 1
			for end < len(siblings) && skeleton.names[siblings[end]] == skeleton.names[siblings[first]] {
				end++
			}
			addGroup(siblings[first:end])
			first = end
		}
	}
}
