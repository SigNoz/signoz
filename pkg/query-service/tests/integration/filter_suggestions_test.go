package tests

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"testing"

	mockhouse "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

// If no data has been received yet, filter suggestions should contain
// standard log fields and static example queries based on them
func TestDefaultLogsFilterSuggestions(t *testing.T) {
	require := require.New(t)
	tb := NewFilterSuggestionsTestBed(t)

	tb.mockAttribKeysQueryResponse([]v3.AttributeKey{})
	suggestionsQueryParams := map[string]string{}
	suggestionsResp := tb.GetQBFilterSuggestionsForLogs(suggestionsQueryParams)

	require.Greater(len(suggestionsResp.AttributeKeys), 0)
	require.True(slices.ContainsFunc(
		suggestionsResp.AttributeKeys, func(a v3.AttributeKey) bool {
			return a.Key == "body"
		},
	))

	require.Greater(len(suggestionsResp.ExampleQueries), 0)
	require.False(slices.ContainsFunc(
		suggestionsResp.AttributeKeys, func(a v3.AttributeKey) bool {
			return a.Type == v3.AttributeKeyTypeTag || a.Type == v3.AttributeKeyTypeResource
		},
	))
}

func TestLogsFilterSuggestionsWithoutExistingFilter(t *testing.T) {
	require := require.New(t)
	tb := NewFilterSuggestionsTestBed(t)

	testAttrib := v3.AttributeKey{
		Key:      "container_id",
		Type:     v3.AttributeKeyTypeResource,
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: false,
	}
	testAttribValue := "test-container"

	tb.mockAttribKeysQueryResponse([]v3.AttributeKey{testAttrib})
	tb.mockAttribValuesQueryResponse(testAttrib, []string{testAttribValue})
	suggestionsQueryParams := map[string]string{}
	suggestionsResp := tb.GetQBFilterSuggestionsForLogs(suggestionsQueryParams)

	require.Greater(len(suggestionsResp.AttributeKeys), 0)
	require.True(slices.ContainsFunc(
		suggestionsResp.AttributeKeys, func(a v3.AttributeKey) bool {
			return a.Key == testAttrib.Key && a.Type == testAttrib.Type
		},
	))

	require.Greater(len(suggestionsResp.ExampleQueries), 0)
	require.True(slices.ContainsFunc(
		suggestionsResp.ExampleQueries, func(q v3.FilterSet) bool {
			return slices.ContainsFunc(q.Items, func(i v3.FilterItem) bool {
				return i.Key.Key == testAttrib.Key && i.Value == testAttribValue
			})
		},
	))
}

// If a filter already exists, suggested example queries should
// contain existing filter
func TestLogsFilterSuggestionsWithExistingFilter(t *testing.T) {
	require := require.New(t)
	tb := NewFilterSuggestionsTestBed(t)

	testAttrib := v3.AttributeKey{
		Key:      "container_id",
		Type:     v3.AttributeKeyTypeResource,
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: false,
	}
	testAttribValue := "test-container"

	testFilterAttrib := v3.AttributeKey{
		Key:      "tenant_id",
		Type:     v3.AttributeKeyTypeTag,
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: false,
	}
	testFilterAttribValue := "test-tenant"
	testFilter := v3.FilterSet{
		Operator: "AND",
		Items: []v3.FilterItem{
			{
				Key:      testFilterAttrib,
				Operator: "=",
				Value:    testFilterAttribValue,
			},
		},
	}

	tb.mockAttribKeysQueryResponse([]v3.AttributeKey{testAttrib, testFilterAttrib})
	tb.mockAttribValuesQueryResponse(testAttrib, []string{testAttribValue})

	testFilterJson, err := json.Marshal(testFilter)
	require.Nil(err, "couldn't serialize existing filter to JSON")
	suggestionsQueryParams := map[string]string{
		"existingFilter": base64.RawURLEncoding.EncodeToString(testFilterJson),
	}
	suggestionsResp := tb.GetQBFilterSuggestionsForLogs(suggestionsQueryParams)

	require.Greater(len(suggestionsResp.AttributeKeys), 0)

	// All example queries should contain the existing filter as a prefix
	require.Greater(len(suggestionsResp.ExampleQueries), 0)
	for _, q := range suggestionsResp.ExampleQueries {
		require.Equal(q.Items[0], testFilter.Items[0])
	}
}

// Mocks response for CH queries made by reader.GetLogAttributeKeys
func (tb *FilterSuggestionsTestBed) mockAttribKeysQueryResponse(
	attribsToReturn []v3.AttributeKey,
) {
	cols := []mockhouse.ColumnType{}
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "tagKey"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "tagType"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "tagDataType"})

	values := [][]any{}
	for _, a := range attribsToReturn {
		rowValues := []any{}
		rowValues = append(rowValues, a.Key)
		rowValues = append(rowValues, string(a.Type))
		rowValues = append(rowValues, string(a.DataType))
		values = append(values, rowValues)
	}

	tb.mockClickhouse.ExpectQuery(
		"select.*from.*signoz_logs.distributed_tag_attributes.*",
	).WithArgs(
		constants.DefaultFilterSuggestionsLimit,
	).WillReturnRows(
		mockhouse.NewRows(cols, values),
	)

	// Add expectation for the create table query used to determine
	// if an attribute is a column
	cols = []mockhouse.ColumnType{{Type: "String", Name: "statement"}}
	values = [][]any{{"CREATE TABLE signoz_logs.distributed_logs"}}
	tb.mockClickhouse.ExpectSelect(
		"SHOW CREATE TABLE.*",
	).WillReturnRows(mockhouse.NewRows(cols, values))

}

// Mocks response for CH queries made by reader.GetLogAttributeValues
func (tb *FilterSuggestionsTestBed) mockAttribValuesQueryResponse(
	expectedAttrib v3.AttributeKey,
	stringValuesToReturn []string,
) {
	cols := []mockhouse.ColumnType{}
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "stringTagValue"})

	values := [][]any{}
	for _, v := range stringValuesToReturn {
		rowValues := []any{}
		rowValues = append(rowValues, v)
		values = append(values, rowValues)
	}

	tb.mockClickhouse.ExpectQuery(
		"select distinct.*stringTagValue.*from.*signoz_logs.distributed_tag_attributes.*",
	).WithArgs(string(expectedAttrib.Key), v3.TagType(expectedAttrib.Type), 1).WillReturnRows(mockhouse.NewRows(cols, values))
}

type FilterSuggestionsTestBed struct {
	t              *testing.T
	testUser       *model.User
	qsHttpHandler  http.Handler
	mockClickhouse mockhouse.ClickConnMockCommon
}

func (tb *FilterSuggestionsTestBed) GetQBFilterSuggestionsForLogs(
	queryParams map[string]string,
) *v3.QBFilterSuggestionsResponse {

	_, dsExistsInQP := queryParams["dataSource"]
	require.False(tb.t, dsExistsInQP)
	queryParams["dataSource"] = "logs"

	result := tb.QSGetRequest("/api/v3/filter_suggestions", queryParams)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}

	var resp v3.QBFilterSuggestionsResponse
	err = json.Unmarshal(dataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into PipelinesResponse")
	}

	return &resp
}

func NewFilterSuggestionsTestBed(t *testing.T) *FilterSuggestionsTestBed {
	testDB := utils.NewQueryServiceDBForTests(t)

	fm := featureManager.StartManager()
	reader, mockClickhouse := NewMockClickhouseReader(t, testDB, fm)
	mockClickhouse.MatchExpectationsInOrder(false)

	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		Reader:       reader,
		AppDao:       dao.DB(),
		FeatureFlags: fm,
	})
	if err != nil {
		t.Fatalf("could not create a new ApiHandler: %v", err)
	}

	router := app.NewRouter()
	am := app.NewAuthMiddleware(auth.GetUserFromRequest)
	apiHandler.RegisterRoutes(router, am)
	apiHandler.RegisterQueryRangeV3Routes(router, am)

	user, apiErr := createTestUser()
	if apiErr != nil {
		t.Fatalf("could not create a test user: %v", apiErr)
	}

	return &FilterSuggestionsTestBed{
		t:              t,
		testUser:       user,
		qsHttpHandler:  router,
		mockClickhouse: mockClickhouse,
	}
}

func (tb *FilterSuggestionsTestBed) QSGetRequest(
	path string,
	queryParams map[string]string,
) *app.ApiResponse {
	if len(queryParams) > 0 {
		qps := []string{}
		for q, v := range queryParams {
			qps = append(qps, fmt.Sprintf("%s=%s", q, v))
		}
		path = fmt.Sprintf("%s?%s", path, strings.Join(qps, "&"))
	}

	req, err := AuthenticatedRequestForTest(
		tb.testUser, path, nil,
	)
	if err != nil {
		tb.t.Fatalf("couldn't create authenticated test request: %v", err)
	}

	result, err := HandleTestRequest(tb.qsHttpHandler, req, 200)
	if err != nil {
		tb.t.Fatalf("test request failed: %v", err)
	}
	return result
}
