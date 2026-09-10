package ruletypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRuleViewDataValidate(t *testing.T) {
	cases := []struct {
		description string
		data        RuleViewData
		expectError bool
	}{
		{
			description: "valid with all fields set",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Query: "name CONTAINS 'prod'", States: []string{"firing", "pending"}, Sort: ListSortName, Order: ListOrderAsc}},
			expectError: false,
		},
		{
			description: "valid with zero states, sort and order",
			data:        RuleViewData{Version: RuleViewSchemaVersion},
			expectError: false,
		},
		{
			description: "query over the cap is rejected",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Query: strings.Repeat("x", MaxListQueryLen+1)}},
			expectError: true,
		},
		{
			description: "wrong version is rejected",
			data:        RuleViewData{Version: "v2"},
			expectError: true,
		},
		{
			description: "empty version is rejected",
			data:        RuleViewData{},
			expectError: true,
		},
		{
			description: "unknown state is rejected",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{States: []string{"exploding"}}},
			expectError: true,
		},
		{
			description: "unknown sort is rejected",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Sort: ListSort{valuer.NewString("bogus")}}},
			expectError: true,
		},
		{
			description: "unknown order is rejected",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Order: ListOrder{valuer.NewString("sideways")}}},
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

func TestRuleViewDataValidateDefaults(t *testing.T) {
	data := RuleViewData{Version: RuleViewSchemaVersion}
	require.NoError(t, data.Validate())
	assert.Equal(t, ListSortUpdatedAt, data.Sort)
	assert.Equal(t, ListOrderDesc, data.Order)
}

func TestPostableRuleViewUnmarshalJSON(t *testing.T) {
	cases := []struct {
		description    string
		body           string
		expectError    bool
		expectedErrMsg string
		expectedName   string
	}{
		{
			description:  "valid body keeps name as-is",
			body:         `{"name":"my view","data":{"version":"v1","query":"severity = 'critical'","states":["firing"],"sort":"name","order":"asc"}}`,
			expectError:  false,
			expectedName: "my view",
		},
		{
			description:    "name with surrounding whitespace is rejected",
			body:           `{"name":"  my view  ","data":{"version":"v1"}}`,
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
			body:           `{"name":"` + strings.Repeat("x", MaxRuleViewNameLen+1) + `","data":{"version":"v1"}}`,
			expectError:    true,
			expectedErrMsg: "name must be at most",
		},
		{
			description: "invalid data version is rejected",
			body:        `{"name":"my view","data":{"version":"v9"}}`,
			expectError: true,
		},
		{
			description:    "invalid state is rejected",
			body:           `{"name":"my view","data":{"version":"v1","states":["exploding"]}}`,
			expectError:    true,
			expectedErrMsg: "invalid state",
		},
	}

	for _, c := range cases {
		t.Run(c.description, func(t *testing.T) {
			var p PostableRuleView
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

func TestPostableRuleViewNewRuleView(t *testing.T) {
	orgID := valuer.GenerateUUID()
	postable := PostableRuleView{
		Name: "my view",
		Data: RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{States: []string{"firing"}, Sort: ListSortName, Order: ListOrderAsc}},
	}

	view := postable.NewRuleView(orgID)

	assert.Equal(t, orgID, view.OrgID)
	assert.Equal(t, "my view", view.Name)
	assert.Equal(t, postable.Data, view.Data)
	assert.False(t, view.ID.IsZero())
	assert.False(t, view.CreatedAt.IsZero())
	assert.Equal(t, view.CreatedAt, view.UpdatedAt)
}

func TestRuleViewUpdate(t *testing.T) {
	orgID := valuer.GenerateUUID()
	view := PostableRuleView{
		Name: "original",
		Data: RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Sort: ListSortName, Order: ListOrderAsc}},
	}.NewRuleView(orgID)
	createdAt := view.CreatedAt

	view.Update(UpdatableRuleView{
		Name: "renamed",
		Data: RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{States: []string{"disabled"}, Sort: ListSortCreatedAt, Order: ListOrderDesc}},
	})

	assert.Equal(t, "renamed", view.Name)
	assert.Equal(t, []string{"disabled"}, view.Data.States)
	assert.Equal(t, ListSortCreatedAt, view.Data.Sort)
	assert.Equal(t, ListOrderDesc, view.Data.Order)
	assert.Equal(t, createdAt, view.CreatedAt)
	assert.True(t, view.UpdatedAt.After(createdAt) || view.UpdatedAt.Equal(createdAt))
}
