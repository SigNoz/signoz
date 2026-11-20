package spantypes

import (
	"math"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
)

func TestNewTraceOverviewQuery(t *testing.T) {
	validCases := []struct {
		name     string
		params   InspectTraceParams
		expected TraceOverviewQuery
	}{
		{name: "NoCursor_WholeOverview", params: InspectTraceParams{}, expected: TraceOverviewQuery{}},
		{name: "ErrorsCursor_PageOfErrors", params: InspectTraceParams{Cursor: encodeCursor(overviewCursor{List: OverviewListErrors, Offset: 10})}, expected: TraceOverviewQuery{List: OverviewListErrors, Offset: 10}},
		{name: "SlowestCursor_PageOfSlowest", params: InspectTraceParams{Cursor: encodeCursor(overviewCursor{List: OverviewListSlowest, Offset: 20})}, expected: TraceOverviewQuery{List: OverviewListSlowest, Offset: 20}},
	}
	for _, testCase := range validCases {
		t.Run(testCase.name, func(t *testing.T) {
			query, err := NewTraceOverviewQuery(&testCase.params)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, *query)
		})
	}

	invalidCases := []struct {
		name   string
		cursor string
	}{
		{name: "Cursor_NotBase64", cursor: "%%%"},
		{name: "Cursor_NotJSON", cursor: "bm90IGpzb24"},
		{name: "Cursor_UnknownList", cursor: encodeCursor(overviewCursor{List: "tree", Offset: 10})},
		{name: "Cursor_WithoutList", cursor: encodeCursor(overviewCursor{Offset: 10})},
		{name: "Cursor_WithoutOffset", cursor: encodeCursor(overviewCursor{List: OverviewListErrors})},
		{name: "Cursor_OffsetBeyondAnyTrace", cursor: encodeCursor(overviewCursor{List: OverviewListSlowest, Offset: math.MaxInt})},
		{name: "Cursor_WithAFieldOfAnotherRoute", cursor: encodeCursor(map[string]any{"list": OverviewListErrors, "offset": 10, "after": map[string]any{"spanId": "abc"}})},
	}
	for _, testCase := range invalidCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := NewTraceOverviewQuery(&InspectTraceParams{Cursor: testCase.cursor})
			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
		})
	}
}

func TestNewTraceSpanQuery(t *testing.T) {
	validCases := []struct {
		name     string
		params   InspectTraceSpanParams
		expected TraceSpanQuery
	}{
		{name: "NoParams_DefaultDepth", params: InspectTraceSpanParams{}, expected: TraceSpanQuery{SpanID: "abc", Depth: inspectDefaultDepth}},
		{name: "DepthAndFields", params: InspectTraceSpanParams{Depth: 4, SelectFields: []string{"db.statement"}}, expected: TraceSpanQuery{SpanID: "abc", Depth: 4, SelectFields: []string{"db.statement"}}},
		{name: "BlankFields_SelectNothing", params: InspectTraceSpanParams{SelectFields: []string{"", " "}}, expected: TraceSpanQuery{SpanID: "abc", Depth: inspectDefaultDepth, SelectFields: []string{}}},
	}
	for _, testCase := range validCases {
		t.Run(testCase.name, func(t *testing.T) {
			query, err := NewTraceSpanQuery("abc", &testCase.params)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, *query)
		})
	}

	invalidCases := []struct {
		name  string
		depth int
	}{
		{name: "Depth_Negative", depth: -1},
		{name: "Depth_OverMaximum", depth: 11},
	}
	for _, testCase := range invalidCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := NewTraceSpanQuery("abc", &InspectTraceSpanParams{Depth: testCase.depth})
			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
		})
	}
}

func TestNewTraceSpanListQuery(t *testing.T) {
	afterCursor := encodeCursor(spanListCursor{After: &ThreadCursor{TimeUnixNano: 42, SpanID: "abc"}})
	offsetCursor := encodeCursor(spanListCursor{Offset: 400})

	validCases := []struct {
		name     string
		params   InspectTraceSpansParams
		expected TraceSpanListQuery
	}{
		{name: "NoParams_EverySpanWithDefaultLimit", params: InspectTraceSpansParams{}, expected: TraceSpanListQuery{Limit: inspectAllSpansLimit}},
		{name: "Search_DefaultLimit", params: InspectTraceSpansParams{Search: "worldpay"}, expected: TraceSpanListQuery{Search: "worldpay", Limit: inspectSearchLimit}},
		{name: "BlankSearch_EverySpan", params: InspectTraceSpansParams{Search: "  "}, expected: TraceSpanListQuery{Limit: inspectAllSpansLimit}},
		{name: "SearchLimitCursor_NextPageOfMatches", params: InspectTraceSpansParams{Search: "worldpay", Limit: 5, Cursor: afterCursor}, expected: TraceSpanListQuery{Search: "worldpay", Limit: 5, After: &ThreadCursor{TimeUnixNano: 42, SpanID: "abc"}}},
		{name: "UnderLimitCursor_NextPageBelowThatSpan", params: InspectTraceSpansParams{Under: "abc", Limit: 50, Cursor: offsetCursor}, expected: TraceSpanListQuery{Under: "abc", Limit: 50, Offset: 400}},
	}
	for _, testCase := range validCases {
		t.Run(testCase.name, func(t *testing.T) {
			query, err := NewTraceSpanListQuery(&testCase.params)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, *query)
		})
	}

	invalidCases := []struct {
		name   string
		params InspectTraceSpansParams
	}{
		{name: "SearchWithUnder", params: InspectTraceSpansParams{Search: "worldpay", Under: "abc"}},
		{name: "Limit_Negative", params: InspectTraceSpansParams{Search: "worldpay", Limit: -1}},
		{name: "Limit_OverMaximum", params: InspectTraceSpansParams{Limit: 1001}},
		{name: "SearchCursor_FromEverySpan", params: InspectTraceSpansParams{Search: "worldpay", Cursor: offsetCursor}},
		{name: "EverySpanCursor_FromASearch", params: InspectTraceSpansParams{Cursor: afterCursor}},
		{name: "Cursor_FromAnOverviewList", params: InspectTraceSpansParams{Cursor: encodeCursor(overviewCursor{List: OverviewListErrors, Offset: 10})}},
		{name: "Cursor_OffsetBeyondAnyTrace", params: InspectTraceSpansParams{Cursor: encodeCursor(spanListCursor{Offset: math.MaxInt})}},
	}
	for _, testCase := range invalidCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := NewTraceSpanListQuery(&testCase.params)
			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
		})
	}
}
