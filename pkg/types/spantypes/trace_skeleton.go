package spantypes

import (
	"encoding/json"
	"slices"
	"sort"
	"time"
)

const (
	skeletonFlagError uint8 = 1 << iota
	skeletonFlagExceptionEvent
	skeletonFlagMissingParent
)

const noParent int32 = -1

// SkeletonSpan is the ClickHouse scan struct for the columns a TraceSkeleton is built from.
type SkeletonSpan struct {
	SpanID             string    `ch:"span_id"`
	ParentSpanID       string    `ch:"parent_span_id"`
	StartTime          time.Time `ch:"timestamp"`
	DurationNano       uint64    `ch:"duration_nano"`
	HasError           bool      `ch:"has_error"`
	Name               string    `ch:"name"`
	ServiceName        string    `ch:"resource_string_service$$name"`
	KindString         string    `ch:"kind_string"`
	ResponseStatusCode string    `ch:"response_status_code"`
	HasExceptionEvent  bool      `ch:"has_exception_event"`
}

// AISpanUsage is the token and cost usage of one gen_ai span.
type AISpanUsage struct {
	SpanID           string   `ch:"span_id"`
	IsModelCall      bool     `ch:"is_model_call"`
	IsToolCall       bool     `ch:"is_tool_call"`
	InputTokens      *float64 `ch:"input_tokens_value"`
	OutputTokens     *float64 `ch:"output_tokens_value"`
	CacheReadTokens  *float64 `ch:"cache_read_tokens_value"`
	CacheWriteTokens *float64 `ch:"cache_write_tokens_value"`
	ReasoningTokens  *float64 `ch:"reasoning_tokens_value"`
	Cost             *float64 `ch:"total_cost_value"`
}

// LinkedSpan is a span that links to other spans, in its own trace or another one.
type LinkedSpan struct {
	SpanID string
	Links  []Link
}

// TraceSkeleton holds the tree of a trace as parallel arrays indexed by span position, in start
// time order. It is read-only once built.
type TraceSkeleton struct {
	TraceID string

	// SpanIDs holds every span id back to back; span i is SpanIDs[IDOffsets[i]:IDOffsets[i+1]].
	SpanIDs   string
	IDOffsets []uint32
	// Parents holds the position of each span's parent, or -1 for a root.
	Parents      []int32
	StartNano    []int64
	DurationNano []uint64
	Flags        []uint8
	// Names, Services, Kinds and StatusCodes index into Strings.
	Names       []uint32
	Services    []uint32
	Kinds       []uint32
	StatusCodes []uint32
	Strings     []string

	AISpans []AISpanUsage
	// LinkedSpans holds the spans with links, in span order.
	LinkedSpans []LinkedSpan

	// Children of span i are childList[childStart[i]:childStart[i+1]], in span order.
	childStart []int32
	childList  []int32
	roots      []int32
	// preorder lists span positions depth first, roots and siblings in span order.
	preorder []int32
	level    []uint32
	// subtree counts the spans below each span, the span itself excluded.
	subtree []uint32
	ownTime []uint64
	// idOrder lists span positions sorted by span id, for lookups by id.
	idOrder  []int32
	startNs  int64
	endNs    int64
	errCount uint64
}

// TraceSkeletonBuilder collects spans in (start time, name, span id) order.
type TraceSkeletonBuilder struct {
	skeleton  *TraceSkeleton
	ids       []byte
	parentIDs []string
	interned  map[string]uint32
}

// NewLinkedSpan reads the links out of a span's stored references; ok is false when it has none.
func NewLinkedSpan(spanID, references string) (LinkedSpan, bool) {
	refs := []OtelSpanRef{}
	if err := json.Unmarshal([]byte(references), &refs); err != nil {
		return LinkedSpan{}, false
	}
	linked := LinkedSpan{SpanID: spanID, Links: make([]Link, 0, len(refs))}
	for _, ref := range refs {
		// The parent is stored as a CHILD_OF reference beside the links.
		if ref.RefType != "CHILD_OF" {
			linked.Links = append(linked.Links, Link{TraceID: ref.TraceId, SpanID: ref.SpanId})
		}
	}
	return linked, len(linked.Links) > 0
}

func NewTraceSkeletonBuilder(traceID string, sizeHint int) *TraceSkeletonBuilder {
	return &TraceSkeletonBuilder{
		skeleton: &TraceSkeleton{
			TraceID:      traceID,
			IDOffsets:    make([]uint32, 1, sizeHint+1),
			Parents:      make([]int32, 0, sizeHint),
			StartNano:    make([]int64, 0, sizeHint),
			DurationNano: make([]uint64, 0, sizeHint),
			Flags:        make([]uint8, 0, sizeHint),
			Names:        make([]uint32, 0, sizeHint),
			Services:     make([]uint32, 0, sizeHint),
			Kinds:        make([]uint32, 0, sizeHint),
			StatusCodes:  make([]uint32, 0, sizeHint),
			AISpans:      []AISpanUsage{},
			LinkedSpans:  []LinkedSpan{},
		},
		ids:       make([]byte, 0, sizeHint*16),
		parentIDs: make([]string, 0, sizeHint),
		interned:  make(map[string]uint32),
	}
}

func (b *TraceSkeletonBuilder) Add(span *SkeletonSpan) {
	s := b.skeleton
	b.ids = append(b.ids, span.SpanID...)
	s.IDOffsets = append(s.IDOffsets, uint32(len(b.ids)))
	b.parentIDs = append(b.parentIDs, span.ParentSpanID)
	s.StartNano = append(s.StartNano, span.StartTime.UnixNano())
	s.DurationNano = append(s.DurationNano, span.DurationNano)
	var flags uint8
	if span.HasError {
		flags |= skeletonFlagError
	}
	if span.HasExceptionEvent {
		flags |= skeletonFlagExceptionEvent
	}
	s.Flags = append(s.Flags, flags)
	s.Names = append(s.Names, b.intern(span.Name))
	s.Services = append(s.Services, b.intern(span.ServiceName))
	s.Kinds = append(s.Kinds, b.intern(span.KindString))
	s.StatusCodes = append(s.StatusCodes, b.intern(span.ResponseStatusCode))
}

func (b *TraceSkeletonBuilder) Len() int {
	return len(b.parentIDs)
}

// Build links each span to its parent and computes the tree fields. The builder cannot be reused.
func (b *TraceSkeletonBuilder) Build() *TraceSkeleton {
	s := b.skeleton
	s.SpanIDs = string(b.ids)
	s.buildIDOrder()

	n := len(b.parentIDs)
	s.Parents = s.Parents[:0]
	for i := range n {
		parent := noParent
		if parentID := b.parentIDs[i]; parentID != "" {
			if idx, ok := s.Index(parentID); ok && idx != int32(i) {
				parent = idx
			} else {
				s.Flags[i] |= skeletonFlagMissingParent
			}
		}
		s.Parents = append(s.Parents, parent)
	}
	b.parentIDs, b.interned, b.ids = nil, nil, nil
	s.derive()
	return s
}

func (s *TraceSkeleton) Len() int {
	return len(s.Parents)
}

func (s *TraceSkeleton) SpanID(i int32) string {
	return s.SpanIDs[s.IDOffsets[i]:s.IDOffsets[i+1]]
}

// Index returns the position of the span with the given id.
func (s *TraceSkeleton) Index(spanID string) (int32, bool) {
	pos, found := sort.Find(len(s.idOrder), func(k int) int {
		id := s.SpanID(s.idOrder[k])
		switch {
		case spanID < id:
			return -1
		case spanID > id:
			return 1
		}
		return 0
	})
	if !found {
		return 0, false
	}
	return s.idOrder[pos], true
}

func (s *TraceSkeleton) Children(i int32) []int32 {
	return s.childList[s.childStart[i]:s.childStart[i+1]]
}

func (s *TraceSkeleton) HasError(i int32) bool {
	return s.Flags[i]&skeletonFlagError != 0
}

func (s *TraceSkeleton) HasExceptionEvent(i int32) bool {
	return s.Flags[i]&skeletonFlagExceptionEvent != 0
}

func (s *TraceSkeleton) HasMissingParent(i int32) bool {
	return s.Flags[i]&skeletonFlagMissingParent != 0
}

func (s *TraceSkeleton) ResponseStatusCode(i int32) string {
	return s.Strings[s.StatusCodes[i]]
}

func (s *TraceSkeleton) HasMissingSpans() bool {
	for _, root := range s.roots {
		if s.HasMissingParent(root) {
			return true
		}
	}
	return false
}

// PrimaryRoot is the earliest span without a parent, or the earliest orphan when every root's
// parent is missing.
func (s *TraceSkeleton) PrimaryRoot() (int32, bool) {
	if len(s.roots) == 0 {
		return 0, false
	}
	for _, root := range s.roots {
		if !s.HasMissingParent(root) {
			return root, true
		}
	}
	return s.roots[0], true
}

// Ancestors lists the positions above span i, the parent first.
func (s *TraceSkeleton) Ancestors(i int32) []int32 {
	ancestors := make([]int32, 0, s.level[i])
	for p := s.Parents[i]; p != noParent; p = s.Parents[p] {
		ancestors = append(ancestors, p)
	}
	return ancestors
}

// Summary returns the short form of span i.
func (s *TraceSkeleton) Summary(i int32) SpanSummary {
	name := s.Strings[s.Names[i]]
	if cut, _, ok := cutString(name, inspectNameChars); ok {
		name = cut
	}
	summary := SpanSummary{
		SpanID:             s.SpanID(i),
		Name:               name,
		ServiceName:        s.Strings[s.Services[i]],
		Kind:               s.Strings[s.Kinds[i]],
		StartOffsetNano:    uint64(s.StartNano[i] - s.startNs),
		DurationNano:       s.DurationNano[i],
		OwnTimeNano:        s.ownTime[i],
		ResponseStatusCode: s.ResponseStatusCode(i),
		HasError:           s.HasError(i),
		Level:              s.level[i],
		ChildCount:         uint32(s.childStart[i+1] - s.childStart[i]),
		SubtreeSpanCount:   s.subtree[i],
	}
	if parent := s.Parents[i]; parent != noParent {
		summary.ParentSpanID = s.SpanID(parent)
	}
	return summary
}

// WithAISpans returns a copy of the skeleton carrying the usage of its gen_ai spans.
func (s *TraceSkeleton) WithAISpans(aiSpans []AISpanUsage) *TraceSkeleton {
	cp := *s
	cp.AISpans = aiSpans
	if cp.AISpans == nil {
		cp.AISpans = []AISpanUsage{}
	}
	return &cp
}

// WithLinkedSpans returns a copy of the skeleton carrying its spans that have links, in span order.
func (s *TraceSkeleton) WithLinkedSpans(linkedSpans []LinkedSpan) *TraceSkeleton {
	type positioned struct {
		index  int32
		linked LinkedSpan
	}
	known := make([]positioned, 0, len(linkedSpans))
	for _, linked := range linkedSpans {
		if idx, ok := s.Index(linked.SpanID); ok {
			known = append(known, positioned{index: idx, linked: linked})
		}
	}
	slices.SortFunc(known, func(a, b positioned) int { return int(a.index) - int(b.index) })

	cp := *s
	cp.LinkedSpans = make([]LinkedSpan, 0, len(known))
	for _, item := range known {
		cp.LinkedSpans = append(cp.LinkedSpans, item.linked)
	}
	return &cp
}

func (b *TraceSkeletonBuilder) intern(value string) uint32 {
	if idx, ok := b.interned[value]; ok {
		return idx
	}
	idx := uint32(len(b.skeleton.Strings))
	b.skeleton.Strings = append(b.skeleton.Strings, value)
	b.interned[value] = idx
	return idx
}

func (s *TraceSkeleton) buildIDOrder() {
	n := len(s.IDOffsets) - 1
	s.idOrder = make([]int32, n)
	for i := range s.idOrder {
		s.idOrder[i] = int32(i)
	}
	slices.SortFunc(s.idOrder, func(a, b int32) int {
		idA, idB := s.SpanID(a), s.SpanID(b)
		switch {
		case idA < idB:
			return -1
		case idA > idB:
			return 1
		}
		return 0
	})
}

func (s *TraceSkeleton) derive() {
	n := s.Len()
	s.startNs, s.endNs, s.errCount = 0, 0, 0
	for i := range n {
		if i == 0 || s.StartNano[i] < s.startNs {
			s.startNs = s.StartNano[i]
		}
		s.endNs = max(s.endNs, s.StartNano[i]+int64(s.DurationNano[i]))
		if s.Flags[i]&skeletonFlagError != 0 {
			s.errCount++
		}
	}

	s.buildChildren()
	// A span left unvisited sits on a parent cycle; cutting its parent link makes it a root.
	if s.walk() < n {
		visited := make([]bool, n)
		for _, i := range s.preorder {
			visited[i] = true
		}
		for i := range n {
			if visited[i] {
				continue
			}
			s.Parents[i] = noParent
			s.Flags[i] |= skeletonFlagMissingParent
			stack := []int32{int32(i)}
			for len(stack) > 0 {
				top := stack[len(stack)-1]
				stack = stack[:len(stack)-1]
				if visited[top] {
					continue
				}
				visited[top] = true
				stack = append(stack, s.Children(top)...)
			}
		}
		s.buildChildren()
		s.walk()
	}

	s.subtree = make([]uint32, n)
	for k := n - 1; k >= 0; k-- {
		i := s.preorder[k]
		if parent := s.Parents[i]; parent != noParent {
			s.subtree[parent] += s.subtree[i] + 1
		}
	}

	s.ownTime = make([]uint64, n)
	for i := range n {
		s.ownTime[i] = s.DurationNano[i] - s.childrenCoverNano(int32(i))
	}
}

func (s *TraceSkeleton) buildChildren() {
	n := s.Len()
	s.childStart = make([]int32, n+1)
	s.roots = s.roots[:0]
	for i := range n {
		if parent := s.Parents[i]; parent != noParent {
			s.childStart[parent+1]++
		} else {
			s.roots = append(s.roots, int32(i))
		}
	}
	for i := range n {
		s.childStart[i+1] += s.childStart[i]
	}
	s.childList = make([]int32, s.childStart[n])
	next := slices.Clone(s.childStart[:n])
	for i := range n {
		if parent := s.Parents[i]; parent != noParent {
			s.childList[next[parent]] = int32(i)
			next[parent]++
		}
	}
}

// walk fills preorder and level from the roots and returns the number of spans reached.
func (s *TraceSkeleton) walk() int {
	n := s.Len()
	s.preorder = make([]int32, 0, n)
	s.level = make([]uint32, n)
	stack := make([]int32, 0, 64)
	for r := len(s.roots) - 1; r >= 0; r-- {
		stack = append(stack, s.roots[r])
	}
	for len(stack) > 0 {
		i := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		s.preorder = append(s.preorder, i)
		children := s.Children(i)
		for c := len(children) - 1; c >= 0; c-- {
			s.level[children[c]] = s.level[i] + 1
			stack = append(stack, children[c])
		}
	}
	return len(s.preorder)
}

// childrenCoverNano is the time of span i its children cover, overlapping children counted once.
func (s *TraceSkeleton) childrenCoverNano(i int32) uint64 {
	start := s.StartNano[i]
	end := start + int64(s.DurationNano[i])
	covered, cursor := int64(0), start
	for _, child := range s.Children(i) {
		childStart := max(s.StartNano[child], cursor)
		childEnd := min(s.StartNano[child]+int64(s.DurationNano[child]), end)
		if childEnd <= childStart {
			continue
		}
		covered += childEnd - childStart
		cursor = childEnd
	}
	return uint64(covered)
}
