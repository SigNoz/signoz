package ruletypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRuleViewDataValidate(t *testing.T) {
	testCases := []struct {
		name        string
		data        RuleViewData
		expectError bool
	}{
		{
			name:        "AllFieldsSet_Valid",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Query: "name CONTAINS 'prod'", States: []string{"firing", "pending"}, Sort: ListSortName, Order: ListOrderAsc}},
			expectError: false,
		},
		{
			name:        "ZeroStatesSortOrder_Valid",
			data:        RuleViewData{Version: RuleViewSchemaVersion},
			expectError: false,
		},
		{
			name:        "QueryOverCap_Rejected",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Query: strings.Repeat("x", MaxListQueryLen+1)}},
			expectError: true,
		},
		{
			name:        "WrongVersion_Rejected",
			data:        RuleViewData{Version: "v2"},
			expectError: true,
		},
		{
			name:        "EmptyVersion_Rejected",
			data:        RuleViewData{},
			expectError: true,
		},
		{
			name:        "UnknownState_Rejected",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{States: []string{"exploding"}}},
			expectError: true,
		},
		{
			name:        "UnknownSort_Rejected",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Sort: ListSort{valuer.NewString("bogus")}}},
			expectError: true,
		},
		{
			name:        "UnknownOrder_Rejected",
			data:        RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Order: ListOrder{valuer.NewString("sideways")}}},
			expectError: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := testCase.data.Validate()
			if testCase.expectError {
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
	assert.Equal(t, []string{}, data.States)
}

func TestPostableRuleViewUnmarshalJSON(t *testing.T) {
	testCases := []struct {
		name           string
		body           string
		expectError    bool
		expectedErrMsg string
		expectedName   string
	}{
		{
			name:         "ValidBody_NameKeptAsIs",
			body:         `{"name":"my view","data":{"version":"v1","query":"severity = 'critical'","states":["firing"],"sort":"name","order":"asc"}}`,
			expectError:  false,
			expectedName: "my view",
		},
		{
			name:           "NameSurroundingWhitespace_Rejected",
			body:           `{"name":"  my view  ","data":{"version":"v1"}}`,
			expectError:    true,
			expectedErrMsg: "name must not have leading or trailing whitespace",
		},
		{
			name:        "UnknownField_Rejected",
			body:        `{"name":"my view","data":{"version":"v1"},"extra":true}`,
			expectError: true,
		},
		{
			name:           "BlankName_Rejected",
			body:           `{"name":"   ","data":{"version":"v1"}}`,
			expectError:    true,
			expectedErrMsg: "name is required",
		},
		{
			name:           "NameOverMaxLength_Rejected",
			body:           `{"name":"` + strings.Repeat("x", MaxRuleViewNameLen+1) + `","data":{"version":"v1"}}`,
			expectError:    true,
			expectedErrMsg: "name must be at most",
		},
		{
			name:        "InvalidDataVersion_Rejected",
			body:        `{"name":"my view","data":{"version":"v9"}}`,
			expectError: true,
		},
		{
			name:           "InvalidState_Rejected",
			body:           `{"name":"my view","data":{"version":"v1","states":["exploding"]}}`,
			expectError:    true,
			expectedErrMsg: "invalid state",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var p PostableRuleView
			err := json.Unmarshal([]byte(testCase.body), &p)
			if testCase.expectError {
				assert.Error(t, err)
				if testCase.expectedErrMsg != "" {
					assert.ErrorContains(t, err, testCase.expectedErrMsg)
				}
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.expectedName, p.Name)
		})
	}
}

func TestToStorableRuleView(t *testing.T) {
	orgID := valuer.GenerateUUID()
	postable := PostableRuleView{
		Name: "my view",
		Data: RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{States: []string{"firing"}, Sort: ListSortName, Order: ListOrderAsc}},
	}

	storable, err := postable.ToStorableRuleView(orgID)
	require.NoError(t, err)

	assert.Equal(t, orgID, storable.OrgID)
	assert.Equal(t, "my view", storable.Name)
	assert.False(t, storable.ID.IsZero())
	assert.False(t, storable.CreatedAt.IsZero())
	assert.Equal(t, storable.CreatedAt, storable.UpdatedAt)

	gettable, err := storable.ToGettableRuleView()
	require.NoError(t, err)
	assert.Equal(t, storable.ID, gettable.ID)
	assert.Equal(t, "my view", gettable.Name)
	assert.Equal(t, postable.Data, gettable.Data)
	assert.Equal(t, orgID, gettable.OrgID)
	assert.Equal(t, storable.CreatedAt, gettable.CreatedAt)
}

func TestToGettableRuleView_CorruptData_Errors(t *testing.T) {
	_, err := (&StorableRuleView{Data: "not json"}).ToGettableRuleView()
	require.Error(t, err)
}

func TestNewGettableRuleViewsFromStorableRuleViews(t *testing.T) {
	orgID := valuer.GenerateUUID()
	valid, err := PostableRuleView{
		Name: "valid view",
		Data: RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Sort: ListSortName, Order: ListOrderAsc}},
	}.ToStorableRuleView(orgID)
	require.NoError(t, err)
	corrupt := &StorableRuleView{Identifiable: types.Identifiable{ID: valuer.GenerateUUID()}, Data: "not json"}

	views, errByViewID := NewGettableRuleViewsFromStorableRuleViews([]*StorableRuleView{valid, corrupt})

	require.Len(t, views, 1)
	assert.Equal(t, "valid view", views[0].Name)
	require.Len(t, errByViewID, 1)
	assert.Error(t, errByViewID[corrupt.ID.StringValue()])
}

func TestStorableRuleViewUpdate(t *testing.T) {
	orgID := valuer.GenerateUUID()
	storable, err := PostableRuleView{
		Name: "original",
		Data: RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{Sort: ListSortName, Order: ListOrderAsc}},
	}.ToStorableRuleView(orgID)
	require.NoError(t, err)
	createdAt := storable.CreatedAt

	err = storable.Update(UpdatableRuleView{
		Name: "renamed",
		Data: RuleViewData{Version: RuleViewSchemaVersion, ListFilter: ListFilter{States: []string{"disabled"}, Sort: ListSortCreatedAt, Order: ListOrderDesc}},
	})
	require.NoError(t, err)

	gettable, err := storable.ToGettableRuleView()
	require.NoError(t, err)
	assert.Equal(t, "renamed", gettable.Name)
	assert.Equal(t, []string{"disabled"}, gettable.Data.States)
	assert.Equal(t, ListSortCreatedAt, gettable.Data.Sort)
	assert.Equal(t, ListOrderDesc, gettable.Data.Order)
	assert.Equal(t, createdAt, storable.CreatedAt)
	assert.True(t, storable.UpdatedAt.After(createdAt))
}
