package spantypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
)

func TestNewInspectQuery(t *testing.T) {
	validCases := []struct {
		name     string
		params   InspectTraceParams
		expected InspectQuery
	}{
		{name: "NoParams_Overview", params: InspectTraceParams{}, expected: InspectQuery{Type: InspectTypeOverview}},
		{name: "ErrorsCursor_PageOfErrors", params: InspectTraceParams{Cursor: inspectCursor{List: OverviewListErrors, Offset: 10}.encode()}, expected: InspectQuery{Type: InspectTypeOverview, List: OverviewListErrors, Offset: 10}},
		{name: "SlowestCursor_PageOfSlowest", params: InspectTraceParams{Cursor: inspectCursor{List: OverviewListSlowest, Offset: 20}.encode()}, expected: InspectQuery{Type: InspectTypeOverview, List: OverviewListSlowest, Offset: 20}},
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
		{name: "Cursor_NotBase64", params: InspectTraceParams{Cursor: "%%%"}},
		{name: "Cursor_NotJSON", params: InspectTraceParams{Cursor: "bm90IGpzb24"}},
		{name: "Cursor_UnknownList", params: InspectTraceParams{Cursor: inspectCursor{List: "tree", Offset: 10}.encode()}},
		{name: "Cursor_WithoutList", params: InspectTraceParams{Cursor: inspectCursor{Offset: 10}.encode()}},
		{name: "Cursor_WithoutOffset", params: InspectTraceParams{Cursor: inspectCursor{List: OverviewListErrors}.encode()}},
	}
	for _, testCase := range invalidCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := NewInspectQuery(&testCase.params)
			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
		})
	}

	notImplementedCases := []struct {
		name   string
		params InspectTraceParams
	}{
		{name: "SpanID", params: InspectTraceParams{SpanID: "abc"}},
		{name: "Search", params: InspectTraceParams{Search: "worldpay"}},
		{name: "AllSpans", params: InspectTraceParams{AllSpans: true}},
	}
	for _, testCase := range notImplementedCases {
		t.Run(testCase.name+"_NotImplementedYet", func(t *testing.T) {
			_, err := NewInspectQuery(&testCase.params)
			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeUnsupported))
		})
	}
}
