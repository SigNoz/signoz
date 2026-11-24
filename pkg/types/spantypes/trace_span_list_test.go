package spantypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// checkoutSkeleton is one request with a failing payment call, a group of same-name queries and
// an orphan. usage sets the gen_ai usage of the named spans.
func checkoutSkeleton(usage map[string]*AISpanUsage) *TraceSkeleton {
	return buildSkeleton(
		skeletonSpec{id: "root", name: "POST /checkout", service: "web", startMs: 0, durationMs: 100, hasError: true},
		skeletonSpec{id: "pay", parent: "root", name: "charge", service: "payment", startMs: 0, durationMs: 40, hasError: true, hasLink: true},
		skeletonSpec{id: "grpc", parent: "pay", name: "Charge", service: "payment", startMs: 5, durationMs: 5, statusCode: "14", usage: usage["grpc"]},
		skeletonSpec{id: "caught", parent: "pay", name: "retry", service: "payment", startMs: 10, durationMs: 5, hasException: true},
		skeletonSpec{id: "q1", parent: "root", name: "SELECT", service: "db", startMs: 40, durationMs: 10, usage: usage["q1"]},
		skeletonSpec{id: "q2", parent: "root", name: "SELECT", service: "db", startMs: 50, durationMs: 25, hasLink: true, usage: usage["q2"]},
		skeletonSpec{id: "auth", parent: "root", name: "GET /auth", service: "auth", startMs: 75, durationMs: 5, statusCode: "404", usage: usage["auth"]},
		skeletonSpec{id: "orphan", parent: "gone", name: "flush", service: "worker", startMs: 90, durationMs: 60},
	)
}

func TestTraceSkeletonFirstPage_Ranking(t *testing.T) {
	value := func(v float64) *float64 { return &v }

	testCases := []struct {
		name     string
		view     SpanListView
		usage    map[string]*AISpanUsage
		expected []string
	}{
		{
			// own time: orphan 60, the two SELECTs 35 together, pay 30, root 20, then the 5s in start order.
			name:     "TimeSpent_GroupsSameNameSiblings",
			view:     SpanListViewTimeSpent,
			expected: []string{"orphan", "q2", "pay", "root", "grpc", "caught", "auth"},
		},
		{
			// grpc has tokens and no cost, so it ranks last.
			name:     "AIUsage_ByCost",
			view:     SpanListViewAIUsage,
			usage:    map[string]*AISpanUsage{"q1": {Cost: value(0.01)}, "auth": {Cost: value(0.5)}, "grpc": {InputTokens: value(900)}},
			expected: []string{"auth", "q1", "grpc"},
		},
		{
			// auth carries no token or cost value, so it is not listed.
			name:     "AIUsage_ByTokensWhenNoSpanHasACost",
			view:     SpanListViewAIUsage,
			usage:    map[string]*AISpanUsage{"q1": {InputTokens: value(10), OutputTokens: value(5)}, "q2": {InputTokens: value(100)}, "auth": {}},
			expected: []string{"q2", "q1"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			skeleton := checkoutSkeleton(testCase.usage)
			page := skeleton.firstPage(testCase.view, 50)
			assert.Equal(t, testCase.expected, spanIDsOf(skeleton, page.positions))
			assert.Equal(t, uint64(len(testCase.expected)), page.total)
		})
	}
}

func TestNewSpanList_OnlyAIUsageCarriesUsageAttributes(t *testing.T) {
	value := func(v float64) *float64 { return &v }
	skeleton := checkoutSkeleton(map[string]*AISpanUsage{"q1": {InputTokens: value(120), OutputTokens: value(30), Cost: value(0.02)}})

	usage := skeleton.newSpanList(skeleton.firstPage(SpanListViewAIUsage, 50), nil)
	require.Len(t, usage.Items, 1)
	assert.Equal(t, map[string]any{"gen_ai.usage.input_tokens": 120.0, "gen_ai.usage.output_tokens": 30.0, "signoz.gen_ai.usage.tokens.cost": 0.02}, usage.Items[0].Span.Attributes)

	// The same span in any other list carries no attributes.
	for _, item := range skeleton.newSpanList(skeleton.firstPage("", 50), nil).Items {
		assert.Empty(t, item.Span.Attributes, item.Span.SpanID)
	}
}
