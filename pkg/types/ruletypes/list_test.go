package ruletypes

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListRulesParamsValidate(t *testing.T) {
	testCases := []struct {
		name      string
		params    ListRulesParams
		wantErr   string
		wantSort  ListSort
		wantOrder ListOrder
		wantLimit int
	}{
		{
			name:      "empty params get defaults",
			params:    ListRulesParams{},
			wantSort:  ListSortUpdatedAt,
			wantOrder: ListOrderDesc,
			wantLimit: DefaultListLimit,
		},
		{
			name:      "explicit values kept",
			params:    ListRulesParams{ListFilter: ListFilter{Sort: ListSortSeverity, Order: ListOrderAsc}, Limit: 50, Offset: 100},
			wantSort:  ListSortSeverity,
			wantOrder: ListOrderAsc,
			wantLimit: 50,
		},
		{
			name:      "over-max limit clamped",
			params:    ListRulesParams{Limit: MaxListLimit + 1},
			wantSort:  ListSortUpdatedAt,
			wantOrder: ListOrderDesc,
			wantLimit: MaxListLimit,
		},
		{
			name:    "invalid state rejected",
			params:  ListRulesParams{ListFilter: ListFilter{States: []string{"bogus"}}},
			wantErr: `invalid state "bogus"`,
		},
		{
			name:    "invalid sort rejected",
			params:  ListRulesParams{ListFilter: ListFilter{Sort: ListSort{valuer.NewString("bogus")}}},
			wantErr: "invalid sort",
		},
		{
			name:    "invalid order rejected",
			params:  ListRulesParams{ListFilter: ListFilter{Order: ListOrder{valuer.NewString("bogus")}}},
			wantErr: "invalid order",
		},
		{
			name:    "negative limit rejected",
			params:  ListRulesParams{Limit: -1},
			wantErr: "invalid limit",
		},
		{
			name:    "negative offset rejected",
			params:  ListRulesParams{Offset: -1},
			wantErr: "invalid offset",
		},
		{
			name:    "over-long query rejected",
			params:  ListRulesParams{ListFilter: ListFilter{Query: strings.Repeat("a", MaxListQueryLen+1)}},
			wantErr: "query cannot be longer",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.params.Validate()
			if tc.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantSort, tc.params.Sort)
			assert.Equal(t, tc.wantOrder, tc.params.Order)
			assert.Equal(t, tc.wantLimit, tc.params.Limit)
		})
	}
}

func TestListRulesParamsAlertStates(t *testing.T) {
	testCases := []struct {
		name       string
		states     []string
		wantErr    string
		wantStates []AlertState
	}{
		{
			name:       "valid states parsed to typed values",
			states:     []string{"firing", "pending"},
			wantStates: []AlertState{StateFiring, StatePending},
		},
		{
			name:   "absent states mean no filtering",
			states: nil,
		},
		{
			name:    "invalid state rejected",
			states:  []string{"bogus"},
			wantErr: `invalid state "bogus"`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			params := ListRulesParams{ListFilter: ListFilter{States: tc.states}}
			states, err := params.AlertStates()
			if tc.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantStates, states)
		})
	}
}
