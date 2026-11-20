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
