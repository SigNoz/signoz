package spantypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
)

func TestNewInspectQuery(t *testing.T) {
	errorsCursor := inspectCursor{List: OverviewListErrors, Offset: 10}.encode()
	offsetCursor := inspectCursor{Offset: 400}.encode()
	afterCursor := inspectCursor{After: &ThreadCursor{TimeUnixNano: 5, SpanID: "abc"}}.encode()

	validCases := []struct {
		name     string
		params   InspectTraceParams
		expected InspectQuery
	}{
		{name: "NoParams_Overview", params: InspectTraceParams{}, expected: InspectQuery{Type: InspectTypeOverview}},
		{name: "ErrorsCursor_PageOfErrors", params: InspectTraceParams{Cursor: errorsCursor}, expected: InspectQuery{Type: InspectTypeOverview, List: OverviewListErrors, Offset: 10}},
		{name: "SlowestCursor_PageOfSlowest", params: InspectTraceParams{Cursor: inspectCursor{List: OverviewListSlowest, Offset: 20}.encode()}, expected: InspectQuery{Type: InspectTypeOverview, List: OverviewListSlowest, Offset: 20}},
		{name: "SpanID_SpanWithDefaultDepth", params: InspectTraceParams{SpanID: "abc"}, expected: InspectQuery{Type: InspectTypeSpan, SpanID: "abc", Depth: inspectDefaultDepth}},
		{name: "SpanIDDepthFields_Span", params: InspectTraceParams{SpanID: "abc", Depth: 4, SelectFields: []string{"db.statement"}}, expected: InspectQuery{Type: InspectTypeSpan, SpanID: "abc", Depth: 4, SelectFields: []string{"db.statement"}}},
		{name: "Search_FindWithDefaultLimit", params: InspectTraceParams{Search: "worldpay"}, expected: InspectQuery{Type: InspectTypeFind, Search: "worldpay", Limit: inspectSearchLimit}},
		{name: "SearchLimitCursor_NextPageOfMatches", params: InspectTraceParams{Search: "worldpay", Limit: 5, Cursor: afterCursor}, expected: InspectQuery{Type: InspectTypeFind, Search: "worldpay", Limit: 5, After: &ThreadCursor{TimeUnixNano: 5, SpanID: "abc"}}},
		{name: "AllSpans_EverySpanWithDefaultLimit", params: InspectTraceParams{AllSpans: true}, expected: InspectQuery{Type: InspectTypeFind, AllSpans: true, Limit: inspectAllSpansLimit}},
		{name: "AllSpansSpanIDCursor_NextPageBelowThatSpan", params: InspectTraceParams{AllSpans: true, SpanID: "abc", Limit: 50, Cursor: offsetCursor}, expected: InspectQuery{Type: InspectTypeFind, AllSpans: true, SpanID: "abc", Limit: 50, Offset: 400}},
	}
	for _, testCase := range validCases {
		t.Run(testCase.name, func(t *testing.T) {
			query, err := NewInspectQuery(&testCase.params)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, *query)
		})
	}

	invalidCases := []struct {
		name   string
		params InspectTraceParams
	}{
		{name: "Depth_NeedsSpanID", params: InspectTraceParams{Depth: 3}},
		{name: "SelectFields_NeedsSpanID", params: InspectTraceParams{SelectFields: []string{"db.statement"}}},
		{name: "Limit_NeedsSearchOrAllSpans", params: InspectTraceParams{Limit: 10}},
		{name: "SpanDepth_Negative", params: InspectTraceParams{SpanID: "abc", Depth: -1}},
		{name: "SpanDepth_OverMaximum", params: InspectTraceParams{SpanID: "abc", Depth: 11}},
		{name: "SpanWithLimit", params: InspectTraceParams{SpanID: "abc", Limit: 5}},
		{name: "SpanWithCursor", params: InspectTraceParams{SpanID: "abc", Cursor: errorsCursor}},
		{name: "Cursor_NotBase64", params: InspectTraceParams{Cursor: "%%%"}},
		{name: "Cursor_NotJSON", params: InspectTraceParams{Cursor: "bm90IGpzb24"}},
		{name: "Cursor_UnknownList", params: InspectTraceParams{Cursor: inspectCursor{List: "tree", Offset: 10}.encode()}},
		{name: "Cursor_WithoutList", params: InspectTraceParams{Cursor: offsetCursor}},
		{name: "Cursor_WithoutOffset", params: InspectTraceParams{Cursor: inspectCursor{List: OverviewListErrors}.encode()}},
		{name: "SearchWithSpanID", params: InspectTraceParams{Search: "worldpay", SpanID: "abc"}},
		{name: "SearchWithAllSpans", params: InspectTraceParams{Search: "worldpay", AllSpans: true}},
		{name: "SearchWithDepth", params: InspectTraceParams{Search: "worldpay", Depth: 2}},
		{name: "AllSpansWithDepth", params: InspectTraceParams{AllSpans: true, SpanID: "abc", Depth: 2}},
		{name: "SearchWithSelectFields", params: InspectTraceParams{Search: "worldpay", SelectFields: []string{"db.statement"}}},
		{name: "FindLimit_Negative", params: InspectTraceParams{Search: "worldpay", Limit: -1}},
		{name: "FindLimit_OverMaximum", params: InspectTraceParams{AllSpans: true, Limit: 1001}},
		{name: "SearchCursor_FromEverySpan", params: InspectTraceParams{Search: "worldpay", Cursor: offsetCursor}},
		{name: "SearchCursor_FromAnOverviewList", params: InspectTraceParams{Search: "worldpay", Cursor: errorsCursor}},
		{name: "AllSpansCursor_FromASearch", params: InspectTraceParams{AllSpans: true, Cursor: afterCursor}},
	}
	for _, testCase := range invalidCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := NewInspectQuery(&testCase.params)
			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
		})
	}
}
