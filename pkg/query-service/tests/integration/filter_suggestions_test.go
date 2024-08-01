package tests

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime/debug"
	"strings"
	"testing"

	mockhouse "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func TestLogsFilterSuggestions(t *testing.T) {
	require := require.New(t)

	tb := NewFilterSuggestionsTestBed(t)

	queryParams := map[string]any{}
	suggestionsResp := tb.GetQBFilterSuggestionsForLogs(queryParams)

	require.Greater(len(suggestionsResp.AttributeKeys), 0)
}

type FilterSuggestionsTestBed struct {
	t              *testing.T
	testUser       *model.User
	qsHttpHandler  http.Handler
	mockClickhouse mockhouse.ClickConnMockCommon
}

func (tb *FilterSuggestionsTestBed) GetQBFilterSuggestionsForLogs(
	queryParams map[string]any,
) *v3.QBFilterSuggestionsResponse {
	result := tb.QSGetRequest("/api/v3/filter_suggestions", map[string]string{
		"dataSource": "logs",
	})

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

	respWriter := httptest.NewRecorder()
	tb.qsHttpHandler.ServeHTTP(respWriter, req)
	response := respWriter.Result()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		tb.t.Fatalf("couldn't read response body received from QS: %v", err)
	}

	if response.StatusCode != 200 {
		tb.t.Fatalf(
			"unexpected response status from query service for path %s. status: %d, body: %v\n%v",
			path, response.StatusCode, string(responseBody), string(debug.Stack()),
		)
	}

	var result app.ApiResponse
	err = json.Unmarshal(responseBody, &result)
	if err != nil {
		tb.t.Fatalf(
			"Could not unmarshal QS response into an ApiResponse.\nResponse body: %s",
			string(responseBody),
		)
	}

	return &result
}
