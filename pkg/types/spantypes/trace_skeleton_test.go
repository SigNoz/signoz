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
	statusCode                string
}

// buildSkeleton adds the spans in the given order, which stands for the store's start time order.
func buildSkeleton(specs ...skeletonSpec) *TraceSkeleton {
	builder := NewTraceSkeletonBuilder("trace", len(specs))
	for _, spec := range specs {
		builder.Add(&SkeletonSpan{
			SpanID:             spec.id,
			ParentSpanID:       spec.parent,
			StartTime:          time.Unix(100, 0).Add(time.Duration(spec.startMs) * time.Millisecond),
			DurationNano:       uint64(spec.durationMs) * uint64(time.Millisecond),
			HasError:           spec.hasError,
			Name:               spec.name,
			ServiceName:        spec.service,
			KindString:         "Internal",
			ResponseStatusCode: spec.statusCode,
			HasExceptionEvent:  spec.hasException,
		})
	}
	return builder.Build()
}

func ownTimeMs(t *testing.T, skeleton *TraceSkeleton, spanID string) int64 {
	t.Helper()
	idx, ok := skeleton.Index(spanID)
	require.True(t, ok, "span %s", spanID)
	return int64(skeleton.ownTime[idx] / uint64(time.Millisecond))
}

func TestTraceSkeletonOwnTime(t *testing.T) {
	testCases := []struct {
		name     string
		specs    []skeletonSpec
		expected int64
	}{
		{
			name: "SequentialChildren_SubtractsEach",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 100},
				{id: "a", parent: "root", startMs: 10, durationMs: 20},
				{id: "b", parent: "root", startMs: 50, durationMs: 30},
			},
			expected: 50,
		},
		{
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
			name: "ChildOutlivesParent_ClipsToParentEnd",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 100},
				{id: "a", parent: "root", startMs: 80, durationMs: 500},
			},
			expected: 80,
		},
		{
			name: "ChildStartsBeforeParent_ClipsToParentStart",
			specs: []skeletonSpec{
				{id: "early", parent: "root", startMs: 0, durationMs: 30},
				{id: "root", startMs: 10, durationMs: 100},
			},
			expected: 80,
		},
		{
			name: "ChildCoversParent_LeavesZero",
			specs: []skeletonSpec{
				{id: "early", parent: "root", startMs: 0, durationMs: 500},
				{id: "root", startMs: 10, durationMs: 100},
			},
			expected: 0,
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
			assert.Equal(t, testCase.expected, ownTimeMs(t, skeleton, "root"))
		})
	}
}

func TestTraceSkeletonTree(t *testing.T) {
	skeleton := buildSkeleton(
		skeletonSpec{id: "root", name: "GET /", service: "web", startMs: 0, durationMs: 100},
		skeletonSpec{id: "a", parent: "root", name: "a", service: "web", startMs: 10, durationMs: 30},
		skeletonSpec{id: "a1", parent: "a", name: "a1", service: "db", startMs: 15, durationMs: 5, hasError: true},
		skeletonSpec{id: "b", parent: "root", name: "b", service: "web", startMs: 50, durationMs: 10},
		skeletonSpec{id: "orphan", parent: "gone", name: "orphan", service: "worker", startMs: 60, durationMs: 10},
	)

	order := make([]string, 0, skeleton.Len())
	for _, i := range skeleton.preorder {
		order = append(order, skeleton.SpanID(i))
	}
	assert.Equal(t, []string{"root", "a", "a1", "b", "orphan"}, order)
	assert.Len(t, skeleton.roots, 2)
	assert.True(t, skeleton.HasMissingSpans())
	assert.Equal(t, uint64(1), skeleton.errCount)

	root, ok := skeleton.PrimaryRoot()
	require.True(t, ok)
	rootSummary := skeleton.Summary(root)
	assert.Equal(t, "root", rootSummary.SpanID)
	assert.Equal(t, uint32(2), rootSummary.ChildCount)
	assert.Equal(t, uint32(3), rootSummary.SubtreeSpanCount)

	leaf, ok := skeleton.Index("a1")
	require.True(t, ok)
	leafSummary := skeleton.Summary(leaf)
	assert.Equal(t, uint32(2), leafSummary.Level)
	assert.Equal(t, "a", leafSummary.ParentSpanID)
	assert.Equal(t, uint64(15*time.Millisecond), leafSummary.StartOffsetNano)
	assert.True(t, leafSummary.HasError)
	assert.Equal(t, "db", leafSummary.ServiceName)

	_, ok = skeleton.Index("gone")
	assert.False(t, ok)
}

func TestTraceSkeletonPrimaryRoot(t *testing.T) {
	testCases := []struct {
		name     string
		specs    []skeletonSpec
		expected string
	}{
		{
			name: "OrphanStartsFirst_PrefersSpanWithoutParent",
			specs: []skeletonSpec{
				{id: "orphan", parent: "gone", startMs: 0, durationMs: 10},
				{id: "root", startMs: 5, durationMs: 100},
			},
			expected: "root",
		},
		{
			name: "OnlyOrphans_TakesEarliest",
			specs: []skeletonSpec{
				{id: "first", parent: "gone", startMs: 0, durationMs: 10},
				{id: "second", parent: "missing", startMs: 5, durationMs: 100},
			},
			expected: "first",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			skeleton := buildSkeleton(testCase.specs...)
			root, ok := skeleton.PrimaryRoot()
			require.True(t, ok)
			assert.Equal(t, testCase.expected, skeleton.SpanID(root))
		})
	}
}

func TestTraceSkeletonParentCycle(t *testing.T) {
	testCases := []struct {
		name  string
		specs []skeletonSpec
	}{
		{
			name: "TwoSpansPointAtEachOther",
			specs: []skeletonSpec{
				{id: "root", startMs: 0, durationMs: 10},
				{id: "x", parent: "y", startMs: 1, durationMs: 5},
				{id: "y", parent: "x", startMs: 2, durationMs: 5},
				{id: "under-y", parent: "y", startMs: 3, durationMs: 1},
			},
		},
		{
			name: "SpanIsItsOwnParent",
			specs: []skeletonSpec{
				{id: "self", parent: "self", startMs: 0, durationMs: 10},
				{id: "child", parent: "self", startMs: 1, durationMs: 5},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			skeleton := buildSkeleton(testCase.specs...)
			assert.Len(t, skeleton.preorder, len(testCase.specs))
			total := 0
			for _, root := range skeleton.roots {
				total += int(skeleton.Summary(root).SubtreeSpanCount) + 1
			}
			assert.Equal(t, len(testCase.specs), total)
		})
	}
}
