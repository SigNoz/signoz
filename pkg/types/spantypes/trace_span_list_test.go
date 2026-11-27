package spantypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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

func TestTraceSkeletonPage_Ranking(t *testing.T) {
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
			page := skeleton.page(skeleton.treeOrder, testCase.view, 0, 50)
			assert.Equal(t, testCase.expected, spanIDsOf(skeleton, page.positions))
			assert.Equal(t, uint64(len(testCase.expected)), page.total)
		})
	}
}

func TestTraceSkeletonPage_CutsTheViewOfTheGivenSpans(t *testing.T) {
	skeleton := checkoutSkeleton(nil)

	// Among the children of root: the two SELECTs as one, then pay, then auth.
	page := skeleton.page(skeleton.children(positionOf(t, skeleton, "root")), SpanListViewTimeSpent, 1, 5)
	assert.Equal(t, []string{"pay", "auth"}, spanIDsOf(skeleton, page.positions))
	assert.Equal(t, uint64(3), page.total)
}

func TestNewSpanList_OnlyAIUsageCarriesUsageAttributes(t *testing.T) {
	value := func(v float64) *float64 { return &v }
	skeleton := checkoutSkeleton(map[string]*AISpanUsage{"q1": {InputTokens: value(120), OutputTokens: value(30), Cost: value(0.02)}})

	usage := NewSpanList(skeleton.page(skeleton.treeOrder, SpanListViewAIUsage, 0, 50), nil)
	require.Len(t, usage.Items, 1)
	assert.Equal(t, map[string]any{"gen_ai.usage.input_tokens": 120.0, "gen_ai.usage.output_tokens": 30.0, "signoz.gen_ai.usage.tokens.cost": 0.02}, usage.Items[0].Span.Attributes)

	// The same span in any other list carries no attributes.
	for _, item := range NewSpanList(skeleton.page(skeleton.treeOrder, "", 0, 50), nil).Items {
		assert.Empty(t, item.Span.Attributes, item.Span.SpanID)
	}
}

func TestNewSpanListPage(t *testing.T) {
	// root ─┬─ pay ─┬─ grpc
	//       │       └─ caught
	//       ├─ q1
	//       ├─ q2
	//       └─ auth
	// orphan (its parent was never received)
	testCases := []struct {
		name          string
		query         SpanListQuery
		expected      []string
		expectedTotal uint64
	}{
		{
			name:          "Trace_TreeOrder",
			query:         SpanListQuery{Scope: SpanScopeTrace, Limit: 50},
			expected:      []string{"root", "pay", "grpc", "caught", "q1", "q2", "auth", "orphan"},
			expectedTotal: 8,
		},
		{
			name:          "Trace_OffsetAndLimit_KeepsTotal",
			query:         SpanListQuery{Scope: SpanScopeTrace, Offset: 6, Limit: 5},
			expected:      []string{"auth", "orphan"},
			expectedTotal: 8,
		},
		{
			name:          "Children_OneLevel_StartOrder",
			query:         SpanListQuery{Scope: SpanScopeChildren, ScopeSpanID: "root", Limit: 50},
			expected:      []string{"pay", "q1", "q2", "auth"},
			expectedTotal: 4,
		},
		{
			name:          "Descendants_TreeOrder",
			query:         SpanListQuery{Scope: SpanScopeDescendants, ScopeSpanID: "pay", Limit: 50},
			expected:      []string{"grpc", "caught"},
			expectedTotal: 2,
		},
		{
			name:          "Ancestors_ParentFirst",
			query:         SpanListQuery{Scope: SpanScopeAncestors, ScopeSpanID: "grpc", Limit: 50},
			expected:      []string{"pay", "root"},
			expectedTotal: 2,
		},
		{
			name:     "Ancestors_StopAtMissingParent",
			query:    SpanListQuery{Scope: SpanScopeAncestors, ScopeSpanID: "orphan", Limit: 50},
			expected: []string{},
		},
		{
			// root carries the error up from pay, so it is not where the error starts.
			name:          "Ancestors_View_OnlySpansOfTheView",
			query:         SpanListQuery{Scope: SpanScopeAncestors, ScopeSpanID: "grpc", View: SpanListViewErrorOrigins, Limit: 50},
			expected:      []string{"pay"},
			expectedTotal: 1,
		},
		{
			// orphan and root rank in the view too, but are not below root.
			name:          "Descendants_View_OnlySpansInScope",
			query:         SpanListQuery{Scope: SpanScopeDescendants, ScopeSpanID: "root", View: SpanListViewTimeSpent, Limit: 50},
			expected:      []string{"q2", "pay", "grpc", "caught", "auth"},
			expectedTotal: 5,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			page, err := NewSpanListPage(checkoutSkeleton(nil), &testCase.query)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, page.SpanIDs())
			assert.Equal(t, testCase.expectedTotal, page.total)
		})
	}

	_, err := NewSpanListPage(checkoutSkeleton(nil), &SpanListQuery{Scope: SpanScopeChildren, ScopeSpanID: "missing", Limit: 50})
	assert.True(t, errors.Ast(err, errors.TypeNotFound))
}

func TestNewSpanListPage_TimeSpent_ShowsTheGroupByItsLongestSpanInScope(t *testing.T) {
	// root ─┬─ q1 (SELECT, 10 ms) ── row
	//       └─ q2 (SELECT, 25 ms)
	// q2 is the longest SELECT, but only q1 is an ancestor of row.
	skeleton := buildSkeleton(
		skeletonSpec{id: "root", name: "GET /orders", service: "web", startMs: 0, durationMs: 100},
		skeletonSpec{id: "q1", parent: "root", name: "SELECT", service: "db", startMs: 10, durationMs: 10},
		skeletonSpec{id: "row", parent: "q1", name: "decode", service: "db", startMs: 12, durationMs: 2},
		skeletonSpec{id: "q2", parent: "root", name: "SELECT", service: "db", startMs: 30, durationMs: 25},
	)

	page, err := NewSpanListPage(skeleton, &SpanListQuery{Scope: SpanScopeAncestors, ScopeSpanID: "row", View: SpanListViewTimeSpent, Limit: 50})
	require.NoError(t, err)
	assert.Equal(t, []string{"root", "q1"}, page.SpanIDs())

	page, err = NewSpanListPage(skeleton, &SpanListQuery{Scope: SpanScopeTrace, View: SpanListViewTimeSpent, Limit: 50})
	require.NoError(t, err)
	assert.Equal(t, []string{"root", "q2", "row"}, page.SpanIDs())
}

func TestNewSpanListPage_AIUsage_RanksByTokensWhenNoListedSpanHasACost(t *testing.T) {
	value := func(v float64) *float64 { return &v }
	// agent ─┬─ plan (cost)
	//        └─ tools ─┬─ search (10 tokens)
	//                  └─ fetch (100 tokens)
	skeleton := buildSkeleton(
		skeletonSpec{id: "agent"},
		skeletonSpec{id: "plan", parent: "agent", usage: &AISpanUsage{Cost: value(0.5)}},
		skeletonSpec{id: "tools", parent: "agent"},
		skeletonSpec{id: "search", parent: "tools", usage: &AISpanUsage{InputTokens: value(10)}},
		skeletonSpec{id: "fetch", parent: "tools", usage: &AISpanUsage{InputTokens: value(100)}},
	)

	page, err := NewSpanListPage(skeleton, &SpanListQuery{Scope: SpanScopeChildren, ScopeSpanID: "tools", View: SpanListViewAIUsage, Limit: 50})
	require.NoError(t, err)
	assert.Equal(t, []string{"fetch", "search"}, page.SpanIDs())
}

// A name is read the way the query builder reads a select field of a trace list.
func TestNewSpanList_SelectFields(t *testing.T) {
	skeleton := buildSkeleton(skeletonSpec{id: "root", name: "POST /checkout", service: "web"})
	rows := []StorableSpan{{
		SpanID:           "root",
		AttributesString: map[string]string{"http.route": "/checkout", "env": "span-env", "name": "an attribute", "resource.type": "db"},
		ResourcesString:  map[string]string{"env": "resource-env"},
		HTTPMethod:       "POST",
	}}

	testCases := []struct {
		name       string
		field      string
		attributes map[string]any
		resource   map[string]string
		httpMethod string
		warnings   []string
	}{
		{name: "NoContext_BothSides", field: "env", attributes: map[string]any{"env": "span-env"}, resource: map[string]string{"service.name": "web", "env": "resource-env"}},
		{name: "ResourceContext_OneSide", field: "resource.env", attributes: map[string]any{}, resource: map[string]string{"service.name": "web", "env": "resource-env"}},
		{name: "AttributeContext_OneSide", field: "attribute.env", attributes: map[string]any{"env": "span-env"}, resource: map[string]string{"service.name": "web"}},
		{name: "SpanContext_ReadsTheAttribute", field: "span.http.route", attributes: map[string]any{"http.route": "/checkout"}, resource: map[string]string{"service.name": "web"}},
		{name: "ContextWord_PartOfTheAttributeName", field: "resource.type", attributes: map[string]any{"resource.type": "db"}, resource: map[string]string{"service.name": "web"}},
		// The span already carries its name, and the attribute called name needs attribute.name.
		{name: "SpanField_Returned_NotReadAsAnAttribute", field: "name", attributes: map[string]any{}, resource: map[string]string{"service.name": "web"}},
		{name: "SpanField_Selected", field: "http_method", attributes: map[string]any{}, resource: map[string]string{"service.name": "web"}, httpMethod: "POST"},
		{name: "SpanField_EmptyOnTheSpan_Warns", field: "db_name", attributes: map[string]any{}, resource: map[string]string{"service.name": "web"}, warnings: []string{"field `db_name` was not found on any returned span"}},
		{name: "ScopeField_EmptyOnTheSpan_Warns", field: "scope.name", attributes: map[string]any{}, resource: map[string]string{"service.name": "web"}, warnings: []string{"field `scope.name` was not found on any returned span"}},
		{name: "Unknown_Warns", field: "nope", attributes: map[string]any{}, resource: map[string]string{"service.name": "web"}, warnings: []string{"field `nope` was not found on any returned span"}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			page := skeleton.page(skeleton.treeOrder, "", 0, 50)
			page.selectFields = []telemetrytypes.TelemetryFieldKey{newSelectField(testCase.field)}

			list := NewSpanList(page, rows)
			require.Len(t, list.Items, 1)
			assert.Equal(t, testCase.attributes, list.Items[0].Span.Attributes)
			assert.Equal(t, testCase.resource, list.Items[0].Span.Resource)
			assert.Equal(t, testCase.httpMethod, list.Items[0].Span.HTTPMethod)
			assert.Equal(t, testCase.warnings, list.Warnings)
		})
	}
}
