package dashboardtypes

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
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

func TestCanUpdate_MultipleDeletions_ByAuthType(t *testing.T) {
	testCases := []struct {
		name     string
		authType string
		setAuth  bool
		updated  []string
		wantErr  bool
	}{
		{
			name:     "api_key-allows-multi-delete",
			authType: authtypes.AuthTypeAPIKey,
			setAuth:  true,
			updated:  []string{"a"},
			wantErr:  false,
		},
		{
			name:     "jwt-blocks-multi-delete",
			authType: authtypes.AuthTypeJWT,
			setAuth:  true,
			updated:  []string{"a"},
			wantErr:  true,
		},
		{
			name:     "jwt-allows-single-delete",
			authType: authtypes.AuthTypeJWT,
			setAuth:  true,
			updated:  []string{"a", "b"},
			wantErr:  false,
		},
		{
			name:     "internal-authType-allows-multi-delete",
			authType: authtypes.AuthTypeInternal,
			setAuth:  true,
			updated:  []string{"a"},
			wantErr:  false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			if tc.setAuth {
				ctx = authtypes.SetAuthType(ctx, tc.authType)
			}

			orgID := valuer.GenerateUUID()
			initial := StorableDashboardData{
				"widgets": makeTestWidgets("a", "b", "c"),
			}
			d, err := NewDashboard(orgID, "tester", initial)
			assert.NoError(t, err)

			updated := StorableDashboardData{
				"widgets": makeTestWidgets(tc.updated...),
			}
			err = d.CanUpdate(ctx, updated)
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
