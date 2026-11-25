package spantypes

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type skeletonSpec struct {
	id, parent, name, service string
	startMs, durationMs       int64
	hasError, hasException    bool
	hasLink                   bool
	usage                     *AISpanUsage
	statusCode                string
	references                string
}

// buildSkeleton adds the spans in the given order, which stands for the store's start time order.
func buildSkeleton(specs ...skeletonSpec) *TraceSkeleton {
	builder := NewTraceSkeletonBuilder("trace", len(specs))
	for _, spec := range specs {
		span := &SkeletonSpan{
			Span: Span{
				SpanID:             spec.id,
				ParentSpanID:       spec.parent,
				DurationNano:       uint64(spec.durationMs) * uint64(time.Millisecond),
				HasError:           spec.hasError,
				Name:               spec.name,
				KindString:         "Internal",
				ResponseStatusCode: spec.statusCode,
			},
			StartTime:         time.Unix(100, 0).Add(time.Duration(spec.startMs) * time.Millisecond),
			ServiceName:       spec.service,
			HasExceptionEvent: spec.hasException,
			HasLink:           spec.hasLink,
			OtherReferences:   spec.references,
		}
		if spec.usage != nil {
			span.AIUsage = *spec.usage
		}
		builder.Add(span)
	}
	return builder.Build()
}

func spanIDsOf(skeleton *TraceSkeleton, positions []int32) []string {
	spanIDs := make([]string, 0, len(positions))
	for _, i := range positions {
		spanIDs = append(spanIDs, skeleton.spanID(i))
	}
	return spanIDs
}

func positionOf(t *testing.T, skeleton *TraceSkeleton, spanID string) int32 {
	t.Helper()
	for i := range int32(skeleton.len()) {
		if skeleton.spanID(i) == spanID {
			return i
		}
	}
	require.FailNow(t, "span not in skeleton", spanID)
	return noParent
}

func TestTraceSkeletonOwnTime(t *testing.T) {
	testCases := []struct {
		name     string
		specs    []skeletonSpec
		expected int64
	}{
		{
			// time (ms)    0    10        30        50             80        100
			// root         |-------------------------------------------------|    100 ms
			// a                 |---------|                                       20 ms
			// b                                     |--------------|              30 ms
			name: "SequentialChildren_SubtractsEach",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 100},
				{id: "a", parent: "root", startMs: 10, durationMs: 20},
				{id: "b", parent: "root", startMs: 50, durationMs: 30},
			},
			expected: 50,
		},
		{
			// Calls fanned out at once, such as parallel queries. Together they cover 10 to 60.
			// time (ms)    0    10   20   30   40   50   60                  100
			// root         |-------------------------------------------------|    100 ms
			// a                 |-------------------|                             40 ms
			// b                      |-------------------|                        40 ms
			// c                           |----|                                  10 ms
			name: "ParallelChildren_CountsOverlapOnce",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 100},
				{id: "a", parent: "root", startMs: 10, durationMs: 40},
				{id: "b", parent: "root", startMs: 20, durationMs: 40},
				{id: "c", parent: "root", startMs: 30, durationMs: 10},
			},
			expected: 50,
		},
		{
			// Work the parent starts and does not wait for, such as a background job.
			// time (ms)    0                                       80        100
			// root         |-------------------------------------------------|         100 ms
			// a                                                    |-------------->    500 ms, 20 of them inside root
			name: "ChildOutlivesParent_ClipsToParentEnd",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 100},
				{id: "a", parent: "root", startMs: 80, durationMs: 500},
			},
			expected: 80,
		},
		{
			// Clock skew: the child's host clock runs behind the parent's.
			// time (ms)    0    10        30                                      110
			// early        |--------------|                                            30 ms, 20 of them inside root
			// root              |-------------------------------------------------|    100 ms
			name: "ChildStartsBeforeParent_ClipsToParentStart",
			specs: []skeletonSpec{
				{id: "early", parent: "root", startMs: 0, durationMs: 30},
				{id: "root", startMs: 10, durationMs: 100},
			},
			expected: 80,
		},
		{
			// Clock skew again, with a child that also runs past the parent's end.
			// time (ms)    0    10                                                110
			// early        |----------------------------------------------------------->    500 ms
			// root              |-------------------------------------------------|         100 ms
			name: "ChildCoversParent_LeavesZero",
			specs: []skeletonSpec{
				{id: "early", parent: "root", startMs: 0, durationMs: 500},
				{id: "root", startMs: 10, durationMs: 100},
			},
			expected: 0,
		},
		{
			// Only direct children count: a1 is taken from the time of a, not of root.
			// time (ms)    0    10        30                            90   100
			// root         |-------------------------------------------------|    100 ms
			// a                 |---------|                                       20 ms
			// a1                   |------------------------------------|         75 ms, child of a
			name: "Grandchild_NotSubtracted",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 100},
				{id: "a", parent: "root", startMs: 10, durationMs: 20},
				{id: "a1", parent: "a", startMs: 15, durationMs: 75},
			},
			expected: 80,
		},
		{
			name: "NoChildren_EqualsDuration",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 70},
			},
			expected: 70,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			skeleton := buildSkeleton(testCase.specs...)
			assert.Equal(t, uint64(testCase.expected)*uint64(time.Millisecond), skeleton.ownTime[positionOf(t, skeleton, "root")])
		})
	}
}

func TestTraceSkeletonTree(t *testing.T) {
	// root          0 to 100
	//   a           10 to 40
	//     a1        15 to 20, error
	//   b           50 to 60
	// orphan        60 to 70; its parent is not in the trace, so it is a second root
	skeleton := buildSkeleton(
		skeletonSpec{id: "root", name: "GET /", service: "web", startMs: 0, durationMs: 100},
		skeletonSpec{id: "a", parent: "root", name: "a", service: "web", startMs: 10, durationMs: 30},
		skeletonSpec{id: "a1", parent: "a", name: "a1", service: "db", startMs: 15, durationMs: 5, hasError: true},
		skeletonSpec{id: "b", parent: "root", name: "b", service: "web", startMs: 50, durationMs: 10},
		skeletonSpec{id: "orphan", parent: "gone", name: "orphan", service: "worker", startMs: 60, durationMs: 10},
	)

	assert.Equal(t, []string{"root", "a", "a1", "b", "orphan"}, spanIDsOf(skeleton, skeleton.treeOrder))
	assert.Equal(t, []string{"root", "orphan"}, spanIDsOf(skeleton, skeleton.roots))
	// root: two children, three spans below it, and 100 less the 30 of a and the 10 of b.
	assert.Equal(t, SpanTreeStats{Level: 0, ChildCount: 2, SubtreeSpanCount: 3, OwnTimeNano: uint64(60 * time.Millisecond)}, skeleton.treeStats(positionOf(t, skeleton, "root")))
	assert.Equal(t, SpanTreeStats{Level: 2, OwnTimeNano: uint64(5 * time.Millisecond)}, skeleton.treeStats(positionOf(t, skeleton, "a1")))
	assert.Equal(t, SpanTreeStats{Level: 0, OwnTimeNano: uint64(10 * time.Millisecond)}, skeleton.treeStats(positionOf(t, skeleton, "orphan")))
}

func TestTraceSkeletonTreeStats(t *testing.T) {
	// root            error
	//   handler       error
	//     q1          SELECT, 10 ms
	//     q2          SELECT, 30 ms, error
	//     cache
	//       evict     error
	//     q3          SELECT, 20 ms
	skeleton := buildSkeleton(
		skeletonSpec{id: "root", name: "GET /", startMs: 0, durationMs: 100, hasError: true},
		skeletonSpec{id: "handler", parent: "root", name: "handler", startMs: 0, durationMs: 90, hasError: true},
		skeletonSpec{id: "q1", parent: "handler", name: "SELECT", startMs: 0, durationMs: 10},
		skeletonSpec{id: "q2", parent: "handler", name: "SELECT", startMs: 10, durationMs: 30, hasError: true},
		skeletonSpec{id: "cache", parent: "handler", name: "GET cache", startMs: 40, durationMs: 5},
		skeletonSpec{id: "evict", parent: "cache", name: "evict", startMs: 41, durationMs: 2, hasError: true},
		skeletonSpec{id: "q3", parent: "handler", name: "SELECT", startMs: 50, durationMs: 20},
	)

	// q2 has two error spans above it, and shares its name with q1 and q3.
	stats := skeleton.treeStats(positionOf(t, skeleton, "q2"))
	assert.Equal(t, uint32(2), stats.ErrorAncestorCount)
	require.NotNil(t, stats.SameNameSiblings)
	assert.Equal(t, SameNameSiblingStats{SpanCount: 3, OwnTimeNano: uint64(60 * time.Millisecond), ErrorSpanCount: 1}, *stats.SameNameSiblings)

	cache := skeleton.treeStats(positionOf(t, skeleton, "cache"))
	assert.Nil(t, cache.SameNameSiblings)
	assert.Equal(t, uint32(2), cache.ErrorAncestorCount)

	// The count stops at the first ancestor that is not an error: cache, the parent of evict.
	assert.Equal(t, uint32(0), skeleton.treeStats(positionOf(t, skeleton, "evict")).ErrorAncestorCount)
}

func TestTraceSkeletonUnmarkedFailureKind(t *testing.T) {
	testCases := []struct {
		name     string
		spec     skeletonSpec
		expected UnmarkedFailureKind
	}{
		{name: "HTTP400_LowestClientError", spec: skeletonSpec{statusCode: "400"}, expected: UnmarkedFailureHTTP4xx},
		{name: "HTTP499_HighestClientError", spec: skeletonSpec{statusCode: "499"}, expected: UnmarkedFailureHTTP4xx},
		{name: "HTTP200_NotAFailure", spec: skeletonSpec{statusCode: "200"}},
		// Instrumentation should flag a 5xx as an error; proxies and hand-written spans often do not.
		{name: "HTTP500_LowestServerError", spec: skeletonSpec{statusCode: "500"}, expected: UnmarkedFailureHTTP5xx},
		{name: "HTTP599_HighestServerError", spec: skeletonSpec{statusCode: "599"}, expected: UnmarkedFailureHTTP5xx},
		{name: "HTTP600_NotAFailure", spec: skeletonSpec{statusCode: "600"}},
		{name: "GRPC1_LowestFailure", spec: skeletonSpec{statusCode: "1"}, expected: UnmarkedFailureGRPCStatus},
		{name: "GRPC16_HighestFailure", spec: skeletonSpec{statusCode: "16"}, expected: UnmarkedFailureGRPCStatus},
		{name: "GRPC0_OK", spec: skeletonSpec{statusCode: "0"}},
		{name: "ExceptionEvent_WithoutStatusCode", spec: skeletonSpec{hasException: true}, expected: UnmarkedFailureExceptionEvent},
		{name: "ExceptionEvent_WithSuccessStatusCode", spec: skeletonSpec{statusCode: "200", hasException: true}, expected: UnmarkedFailureExceptionEvent},
		{name: "StatusCodeAndExceptionEvent_ReportsStatusCode", spec: skeletonSpec{statusCode: "404", hasException: true}, expected: UnmarkedFailureHTTP4xx},
		{name: "ErrorFlag_NeverUnmarked", spec: skeletonSpec{statusCode: "404", hasException: true, hasError: true}},
		{name: "NoSignal_NotAFailure", spec: skeletonSpec{}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			testCase.spec.id = "span"
			skeleton := buildSkeleton(testCase.spec)
			assert.Equal(t, testCase.expected, skeleton.unmarkedFailureKind(0))
		})
	}
}

// No valid trace has a parent loop; it comes from instrumentation that reuses span ids. Every span
// must still be listed once.
func TestTraceSkeletonParentLoop(t *testing.T) {
	testCases := []struct {
		name              string
		specs             []skeletonSpec
		expectedRoots     []string
		expectedTreeOrder []string
	}{
		{
			// x is the earliest span of the loop, so it becomes a root; y and under-y stay below it.
			name: "TwoSpansPointAtEachOther",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 10},
				{id: "x", parent: "y", startMs: 1, durationMs: 5},
				{id: "y", parent: "x", startMs: 2, durationMs: 5},
				{id: "under-y", parent: "y", startMs: 3, durationMs: 1},
			},
			expectedRoots:     []string{"root", "x"},
			expectedTreeOrder: []string{"root", "x", "y", "under-y"},
		},
		{
			name: "SpanIsItsOwnParent",
			specs: []skeletonSpec{
				{id: "self", parent: "self", startMs: 0, durationMs: 10},
				{id: "child", parent: "self", startMs: 1, durationMs: 5},
			},
			expectedRoots:     []string{"self"},
			expectedTreeOrder: []string{"self", "child"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			skeleton := buildSkeleton(testCase.specs...)
			assert.Equal(t, testCase.expectedRoots, spanIDsOf(skeleton, skeleton.roots))
			assert.Equal(t, testCase.expectedTreeOrder, spanIDsOf(skeleton, skeleton.treeOrder))
		})
	}
}

func TestTraceSkeletonSpan_ParentAndReferences(t *testing.T) {
	skeleton := buildSkeleton(
		skeletonSpec{id: "root"},
		skeletonSpec{id: "child", parent: "root"},
		skeletonSpec{id: "linked", parent: "root", references: `[{"traceId":"trace","spanId":"root","refType":"CHILD_OF"},{"traceId":"other","spanId":"far","refType":"FOLLOWS_FROM"}]`},
		skeletonSpec{id: "orphan", parent: "gone"},
		// a and b are each other's parent; a, the earliest, becomes a root.
		skeletonSpec{id: "a", parent: "b"},
		skeletonSpec{id: "b", parent: "a"},
	)

	testCases := []struct {
		name         string
		spanID       string
		parentSpanID string
		references   []OtelSpanRef
	}{
		{name: "NoStoredReferences_RebuiltFromTheParent", spanID: "child", parentSpanID: "root", references: []OtelSpanRef{{TraceId: "trace", SpanId: "root", RefType: "CHILD_OF"}}},
		{name: "StoredReferences_ReturnedAsStored", spanID: "linked", parentSpanID: "root", references: []OtelSpanRef{{TraceId: "trace", SpanId: "root", RefType: "CHILD_OF"}, {TraceId: "other", SpanId: "far", RefType: "FOLLOWS_FROM"}}},
		{name: "MissingParent_KeepsTheStoredParentID", spanID: "orphan", parentSpanID: "gone", references: []OtelSpanRef{{TraceId: "trace", SpanId: "gone", RefType: "CHILD_OF"}}},
		{name: "ParentLoop_KeepsTheStoredParentID", spanID: "a", parentSpanID: "b", references: []OtelSpanRef{{TraceId: "trace", SpanId: "b", RefType: "CHILD_OF"}}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			span := skeleton.span(positionOf(t, skeleton, testCase.spanID))
			assert.Equal(t, testCase.parentSpanID, span.ParentSpanID)
			assert.Equal(t, testCase.references, span.References)
		})
	}
}
