package dashboardtypes

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types"
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
			d, err := NewDashboard(orgID, "tester", SourceUser, initial)
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

func TestStorableDashboardErrIfNotDeletable(t *testing.T) {
	testCases := []struct {
		subtestName     string
		locked          bool
		source          Source
		data            StorableDashboardData
		expectDeletable bool
	}{
		{
			subtestName:     "user dashboard on the v2 schema",
			source:          SourceUser,
			data:            StorableDashboardData{"metadata": map[string]any{"schemaVersion": SchemaVersion}},
			expectDeletable: true,
		},
		{
			subtestName:     "user dashboard still on the v1 schema",
			source:          SourceUser,
			data:            StorableDashboardData{"widgets": makeTestWidgets("a")},
			expectDeletable: true,
		},
		{
			subtestName:     "user dashboard with unreadable data",
			source:          SourceUser,
			data:            StorableDashboardData{"metadata": "not-an-object"},
			expectDeletable: true,
		},
		{
			subtestName:     "locked user dashboard",
			locked:          true,
			source:          SourceUser,
			data:            StorableDashboardData{"widgets": makeTestWidgets("a")},
			expectDeletable: false,
		},
		{
			subtestName:     "system dashboard",
			source:          SourceSystem,
			data:            StorableDashboardData{"widgets": makeTestWidgets("a")},
			expectDeletable: false,
		},
		{
			subtestName:     "integration dashboard",
			source:          SourceIntegration,
			data:            StorableDashboardData{"widgets": makeTestWidgets("a")},
			expectDeletable: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.subtestName, func(t *testing.T) {
			storable := StorableDashboard{
				Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
				OrgID:        valuer.GenerateUUID(),
				Locked:       tc.locked,
				Source:       tc.source,
				Data:         tc.data,
			}
			assert.Equal(t, tc.expectDeletable, storable.ErrIfNotDeletable() == nil)
		})
	}
}
