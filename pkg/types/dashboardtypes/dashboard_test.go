package dashboardtypes

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func makeTestWidgets(ids ...string) []interface{} {
	widgets := []interface{}{}
	for _, id := range ids {
		widgets = append(widgets, map[string]interface{}{
			"id":    id,
			"query": map[string]interface{}{},
		})
	}
	return widgets
}

func TestCanUpdate_MultipleDeletions_ByDiff(t *testing.T) {
	testCases := []struct {
		name    string
		diff    int
		updated []string
		wantErr bool
	}{
		{
			name:    "diff-0-allows-multi-delete",
			diff:    0,
			updated: []string{"a"}, // deleting 2 widgets (b, c)
			wantErr: false,
		},
		{
			name:    "diff-1-blocks-multi-delete",
			diff:    1,
			updated: []string{"a"}, // deleting 2 widgets (b, c) > diff(1)
			wantErr: true,
		},
		{
			name:    "diff-1-allows-single-delete",
			diff:    1,
			updated: []string{"a", "b"}, // deleting 1 widget (c) = diff(1)
			wantErr: false,
		},
		{
			name:    "diff-2-allows-two-deletions",
			diff:    2,
			updated: []string{"a"}, // deleting 2 widgets (b, c) = diff(2)
			wantErr: false,
		},
		{
			name:    "diff-1-blocks-three-deletions",
			diff:    1,
			updated: []string{}, // deleting all 3 widgets > diff(1)
			wantErr: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()

			orgID := valuer.GenerateUUID()
			initial := StorableDashboardData{
				"widgets": makeTestWidgets("a", "b", "c"),
			}
			d, err := NewDashboard(orgID, "tester", initial)
			assert.NoError(t, err)

			updated := StorableDashboardData{
				"widgets": makeTestWidgets(tc.updated...),
			}
			err = d.CanUpdate(ctx, updated, tc.diff)
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
