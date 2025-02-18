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
	"go.signoz.io/signoz/pkg/http/middleware"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
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
	tb.mockAttribValuesQueryResponse(
		[]v3.AttributeKey{testAttrib}, [][]string{{testAttribValue}},
	)
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
	tb.mockAttribValuesQueryResponse(
		[]v3.AttributeKey{testAttrib, testFilterAttrib},
		[][]string{{testAttribValue}, {testFilterAttribValue}},
	)

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

func TestResourceAttribsRankedHigherInLogsFilterSuggestions(t *testing.T) {
	require := require.New(t)

	tagKeys := []v3.AttributeKey{}
	for _, k := range []string{"user_id", "user_email"} {
		tagKeys = append(tagKeys, v3.AttributeKey{
			Key:      k,
			Type:     v3.AttributeKeyTypeTag,
			DataType: v3.AttributeKeyDataTypeString,
			IsColumn: false,
		})
	}

	specialResourceAttrKeys := []v3.AttributeKey{}
	for _, k := range []string{"service", "env"} {
		specialResourceAttrKeys = append(specialResourceAttrKeys, v3.AttributeKey{
			Key:      k,
			Type:     v3.AttributeKeyTypeResource,
			DataType: v3.AttributeKeyDataTypeString,
			IsColumn: false,
		})
	}

	otherResourceAttrKeys := []v3.AttributeKey{}
	for _, k := range []string{"container_name", "container_id"} {
		otherResourceAttrKeys = append(otherResourceAttrKeys, v3.AttributeKey{
			Key:      k,
			Type:     v3.AttributeKeyTypeResource,
			DataType: v3.AttributeKeyDataTypeString,
			IsColumn: false,
		})
	}

	tb := NewFilterSuggestionsTestBed(t)

	mockAttrKeysInDB := append(tagKeys, otherResourceAttrKeys...)
	mockAttrKeysInDB = append(mockAttrKeysInDB, specialResourceAttrKeys...)

	tb.mockAttribKeysQueryResponse(mockAttrKeysInDB)

	expectedTopSuggestions := append(specialResourceAttrKeys, otherResourceAttrKeys...)
	expectedTopSuggestions = append(expectedTopSuggestions, tagKeys...)

	tb.mockAttribValuesQueryResponse(
		expectedTopSuggestions[:2], [][]string{{"test"}, {"test"}},
	)

	suggestionsQueryParams := map[string]string{"examplesLimit": "2"}
	suggestionsResp := tb.GetQBFilterSuggestionsForLogs(suggestionsQueryParams)

	require.Equal(
		expectedTopSuggestions,
		suggestionsResp.AttributeKeys[:len(expectedTopSuggestions)],
	)
}

// Mocks response for CH queries made by reader.GetLogAttributeKeys
func (tb *FilterSuggestionsTestBed) mockAttribKeysQueryResponse(
	attribsToReturn []v3.AttributeKey,
) {
	cols := []mockhouse.ColumnType{}
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "tag_key"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "tag_type"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "tag_data_type"})

	values := [][]any{}
	for _, a := range attribsToReturn {
		rowValues := []any{}
		rowValues = append(rowValues, a.Key)
		rowValues = append(rowValues, string(a.Type))
		rowValues = append(rowValues, string(a.DataType))
		values = append(values, rowValues)
	}

	tb.mockClickhouse.ExpectQuery(
		"select.*from.*signoz_logs.distributed_tag_attributes_v2.*",
	).WithArgs(
		constants.DefaultFilterSuggestionsAttributesLimit,
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
	expectedAttribs []v3.AttributeKey,
	stringValuesToReturn [][]string,
) {
	resultCols := []mockhouse.ColumnType{
		{Type: "String", Name: "tag_key"},
		{Type: "String", Name: "string_value"},
		{Type: "Nullable(Int64)", Name: "number_value"},
	}

	expectedAttribKeysInQuery := []any{}
	mockResultRows := [][]any{}
	for idx, attrib := range expectedAttribs {
		expectedAttribKeysInQuery = append(expectedAttribKeysInQuery, attrib.Key)
		for _, stringTagValue := range stringValuesToReturn[idx] {
			mockResultRows = append(mockResultRows, []any{
				attrib.Key, stringTagValue, nil,
			})
		}
	}

	tb.mockClickhouse.ExpectQuery(
		"select.*tag_key.*string_value.*number_value.*distributed_tag_attributes_v2.*tag_key",
	).WithArgs(expectedAttribKeysInQuery...).WillReturnRows(mockhouse.NewRows(resultCols, mockResultRows))
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
	reader, mockClickhouse := NewMockClickhouseReader(t, testDB.SQLxDB(), fm)
	mockClickhouse.MatchExpectationsInOrder(false)

	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		Reader:       reader,
		AppDao:       dao.DB(),
		FeatureFlags: fm,
		JWT:          jwt,
	})
	if err != nil {
		t.Fatalf("could not create a new ApiHandler: %v", err)
	}

	router := app.NewRouter()
	//add the jwt middleware
	router.Use(middleware.NewAuth(zap.L(), jwt, []string{"Authorization", "Sec-WebSocket-Protocol"}).Wrap)
	am := app.NewAuthMiddleware(auth.GetUserFromReqContext)
	apiHandler.RegisterRoutes(router, am)
	apiHandler.RegisterQueryRangeV3Routes(router, am)

	user, apiErr := createTestUser()
	if apiErr != nil {
		t.Fatalf("could not create a test user: %v", apiErr)
	}

	logger := zap.NewExample()
	originalLogger := zap.L()
	zap.ReplaceGlobals(logger)
	t.Cleanup(func() {
		zap.ReplaceGlobals(originalLogger)
	})

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
