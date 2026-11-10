package dashboardtypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDashboardViewDataValidate(t *testing.T) {
	cases := []struct {
		description string
		data        DashboardViewData
		expectError bool
	}{
		{
			description: "valid with all fields set",
			data:        DashboardViewData{Version: DashboardViewSchemaVersion, ListFilter: ListFilter{Query: "name=foo", Sort: ListSortName, Order: ListOrderAsc}},
			expectError: false,
		},
		{
			description: "query over the cap is rejected",
			data:        DashboardViewData{Version: DashboardViewSchemaVersion, ListFilter: ListFilter{Query: strings.Repeat("x", MaxListQueryLen+1)}},
			expectError: true,
		},
		{
			description: "valid with zero sort and order",
			data:        DashboardViewData{Version: DashboardViewSchemaVersion},
			expectError: false,
		},
		{
			description: "wrong version is rejected",
			data:        DashboardViewData{Version: "v2"},
			expectError: true,
		},
		{
			description: "empty version is rejected",
			data:        DashboardViewData{},
			expectError: true,
		},
		{
			description: "unknown sort is rejected",
			data:        DashboardViewData{Version: DashboardViewSchemaVersion, ListFilter: ListFilter{Sort: ListSort{valuer.NewString("bogus")}}},
			expectError: true,
		},
		{
			description: "unknown order is rejected",
			data:        DashboardViewData{Version: DashboardViewSchemaVersion, ListFilter: ListFilter{Order: ListOrder{valuer.NewString("sideways")}}},
			expectError: true,
		},
	}

	for _, c := range cases {
		t.Run(c.description, func(t *testing.T) {
			err := c.data.Validate()
			if c.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestPostableDashboardViewUnmarshalJSON(t *testing.T) {
	cases := []struct {
		description    string
		body           string
		expectError    bool
		expectedErrMsg string
		expectedName   string
	}{
		{
			description:  "valid body keeps name as-is",
			body:         `{"name":"my view","data":{"version":"v1","sort":"name","order":"asc"}}`,
			expectError:  false,
			expectedName: "my view",
		},
		{
			description:    "name with surrounding whitespace is rejected",
			body:           `{"name":"  my view  ","data":{"version":"v1","sort":"name","order":"asc"}}`,
			expectError:    true,
			expectedErrMsg: "name must not have leading or trailing whitespace",
		},
		{
			description: "unknown field is rejected",
			body:        `{"name":"my view","data":{"version":"v1"},"extra":true}`,
			expectError: true,
		},
		{
			description:    "blank name is rejected",
			body:           `{"name":"   ","data":{"version":"v1"}}`,
			expectError:    true,
			expectedErrMsg: "name is required",
		},
		{
			description:    "name over max length is rejected",
			body:           `{"name":"` + strings.Repeat("x", MaxDashboardViewNameLen+1) + `","data":{"version":"v1"}}`,
			expectError:    true,
			expectedErrMsg: "name must be at most",
		},
		{
			description: "invalid data version is rejected",
			body:        `{"name":"my view","data":{"version":"v9"}}`,
			expectError: true,
		},
	}

	for _, c := range cases {
		t.Run(c.description, func(t *testing.T) {
			var p PostableDashboardView
			err := json.Unmarshal([]byte(c.body), &p)
			if c.expectError {
				assert.Error(t, err)
				if c.expectedErrMsg != "" {
					assert.ErrorContains(t, err, c.expectedErrMsg)
				}
				return
			}
			require.NoError(t, err)
			assert.Equal(t, c.expectedName, p.Name)
		})
	}
}

func TestPostableDashboardViewNewDashboardView(t *testing.T) {
	orgID := valuer.GenerateUUID()
	postable := PostableDashboardView{
		Name: "my view",
		Data: DashboardViewData{Version: DashboardViewSchemaVersion, ListFilter: ListFilter{Sort: ListSortName, Order: ListOrderAsc}},
	}

	view := postable.NewDashboardView(orgID)

	assert.Equal(t, orgID, view.OrgID)
	assert.Equal(t, "my view", view.Name)
	assert.Equal(t, postable.Data, view.Data)
	assert.False(t, view.ID.IsZero())
	assert.False(t, view.CreatedAt.IsZero())
	assert.Equal(t, view.CreatedAt, view.UpdatedAt)
}

func TestDashboardViewUpdate(t *testing.T) {
	orgID := valuer.GenerateUUID()
	view := PostableDashboardView{
		Name: "original",
		Data: DashboardViewData{Version: DashboardViewSchemaVersion, ListFilter: ListFilter{Sort: ListSortName, Order: ListOrderAsc}},
	}.NewDashboardView(orgID)
	createdAt := view.CreatedAt

	view.Update(UpdatableDashboardView{
		Name: "renamed",
		Data: DashboardViewData{Version: DashboardViewSchemaVersion, ListFilter: ListFilter{Sort: ListSortCreatedAt, Order: ListOrderDesc}},
	})

	assert.Equal(t, "renamed", view.Name)
	assert.Equal(t, ListSortCreatedAt, view.Data.Sort)
	assert.Equal(t, ListOrderDesc, view.Data.Order)
	assert.Equal(t, createdAt, view.CreatedAt)
	assert.True(t, view.UpdatedAt.After(createdAt) || view.UpdatedAt.Equal(createdAt))
}
