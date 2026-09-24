package dashboardtypes

import (
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
